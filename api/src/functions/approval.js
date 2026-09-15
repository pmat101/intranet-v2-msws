const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");
const { sendApprovalRecorded } = require("../lib/mail-bd");

// Anyone in BD can record that a decision was given, because they are the ones
// in the conversation. Who GAVE it is a separate field, and that is the part
// that matters: this records a decision made elsewhere rather than making one.
const MAY_RECORD = ["BD", "TechLead", "LU", "Admin", "CSO", "COO"];

function fail(status, code, message, errors) {
  return { status, jsonBody: { ok: false, error: { code, message, errors } } };
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

async function findOne(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value && r.value[0]) || null;
}

async function findAll(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$top=99&$filter=${encodeURIComponent(filter)}`,
  );
  return r.value || [];
}

function validate(p) {
  const errors = [];
  if (isBlank(p.pcode))
    errors.push({ field: "pcode", message: "A P-Code is required" });

  if (isBlank(p.decision)) {
    errors.push({ field: "decision", message: "A decision is required" });
  } else if (!["Approved", "Declined", "OnHold"].includes(p.decision)) {
    errors.push({
      field: "decision",
      message: "Decision must be Approved, Declined or OnHold",
    });
  }

  // Who decided is the whole point of the record. "It was approved" with nobody
  // named is not a record of anything, and it is what an auditor asks first.
  if (isBlank(p.approvedByName)) {
    errors.push({
      field: "approvedByName",
      message: "Name the person who gave the decision",
    });
  }
  if (isBlank(p.approvalRole)) {
    errors.push({
      field: "approvalRole",
      message: "In what capacity did they decide",
    });
  }
  if (isBlank(p.obtainedHow)) {
    errors.push({
      field: "obtainedHow",
      message: "How was the decision obtained",
    });
  }
  if (isBlank(p.decisionDate)) {
    errors.push({
      field: "decisionDate",
      message: "The date of the decision is required",
    });
  }

  // A decline sends the project to Lost, so the reason carries real weight:
  // it becomes the loss reason, and it is what the analysis is built from.
  if (p.decision === "Declined" && isBlank(p.declineReason)) {
    errors.push({
      field: "declineReason",
      message: "Say why this was declined",
    });
  }
  return errors;
}

async function handle(request, context) {
  let caller;
  try {
    caller = await verifyRequest(request);
  } catch (err) {
    return fail(401, err.code, err.message);
  }

  let entry;
  try {
    entry = await resolveRole(caller.email);
  } catch (err) {
    return fail(403, err.code || "role_failed", err.message);
  }
  if (!MAY_RECORD.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not record an approval`,
    );
  }

  let p;
  try {
    p = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const errors = validate(p);
  if (errors.length) {
    return fail(
      400,
      "validation_failed",
      "Please correct the highlighted fields",
      errors,
    );
  }

  const pcode = String(p.pcode).trim();
  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project)
    return fail(404, "no_such_project", `No project found for ${pcode}`);

  if (project.fields.Status === "Closed") {
    return fail(
      409,
      "already_closed",
      "This project is closed. A completed project does not need an approval.",
    );
  }

  const nowIso = new Date().toISOString();

  // A second decision supersedes the first rather than being refused.
  // A reworked proposal genuinely gets a fresh answer, and a project that was
  // declined, reopened and resubmitted must be able to receive one. The older
  // rows stay, marked superseded: the fact that the technical lead said no
  // before saying yes is worth keeping.
  const previous = await findAll(
    "QualificationApprovals",
    `fields/PCode eq '${pcode}'`,
  );
  for (const row of previous) {
    if (row.fields.Superseded === true) continue;
    await graph(
      "PATCH",
      `/sites/${SITE_ID}/lists/QualificationApprovals/items/${row.id}/fields`,
      {
        Superseded: true,
        ModifiedByEmail: caller.email,
        ModifiedAtIso: nowIso,
      },
    );
  }

  const approvalId =
    "APR-" + String(await allocate("approval_serial")).padStart(5, "0");

  await graph("POST", `/sites/${SITE_ID}/lists/QualificationApprovals/items`, {
    fields: {
      Title: pcode,
      ApprovalID: approvalId,
      PCode: pcode,
      Decision: p.decision,
      ApprovedByName: p.approvedByName,
      ApprovedByEmail: p.approvedByEmail || "",
      ApprovalRole: p.approvalRole,
      ObtainedHow: p.obtainedHow,
      DecisionDateIso: p.decisionDate,
      Conditions: p.conditions || "",
      TechnicalNotes: p.technicalNotes || "",
      DeclineReason: p.declineReason || "",
      Superseded: false,
      RecordedByEmail: caller.email,
      RecordedAtIso: nowIso,
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  // A technical decline ends the pursuit, so the project goes to Lost in the
  // same action. Nothing to remember, nothing left sitting in the work list
  // asking for an approval that has already been refused. BD can reopen it
  // from the Lost tab if the position changes.
  let becameLost = false;
  if (p.decision === "Declined") {
    const proposal = await findOne(
      "ProposalRegister",
      `fields/PCode eq '${pcode}'`,
    );
    const quoted = proposal
      ? Number(proposal.fields.PBL10Final) ||
        Number(proposal.fields.PBL3First) ||
        0
      : 0;

    await graph("POST", `/sites/${SITE_ID}/lists/WinLossRegister/items`, {
      fields: {
        Title: pcode,
        PCode: pcode,
        Outcome: "Lost",
        StageAtOutcome: project.fields.Stage || "Qualification",
        ReasonCategory: "TechnicalDecline",
        Reason: p.declineReason,
        QuotedValue: quoted,
        MarginPct: proposal ? Number(proposal.fields.MarginPct) || 0 : 0,
        DecidedAtIso: new Date(p.decisionDate).toISOString(),
        RecordedByEmail: caller.email,
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });

    await graph(
      "PATCH",
      `/sites/${SITE_ID}/lists/ProjectRegister/items/${project.id}/fields`,
      {
        Status: "Lost",
        LostReason: `Declined on technical grounds by ${p.approvedByName}: ${p.declineReason}`,
        LostDate: new Date(p.decisionDate).toISOString(),
        ModifiedByEmail: caller.email,
        ModifiedAtIso: nowIso,
      },
    );
    becameLost = true;
  }

  const staged = await refreshStage({
    id: project.id,
    ...project.fields,
    ...(becameLost ? { Status: "Lost" } : {}),
  });
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  context.log(
    `Approval recorded for ${pcode}: ${p.decision} by ${p.approvedByName}, ${p.obtainedHow}` +
      (becameLost ? ", project marked lost" : "") +
      (previous.length ? `, superseding ${previous.length}` : ""),
  );

  const mail = await sendApprovalRecorded(pcode, caller, {
    decision: p.decision,
    approvedByName: p.approvedByName,
    approvedByEmail: p.approvedByEmail,
    approvalRole: p.approvalRole,
    obtainedHow: p.obtainedHow,
    decisionDate: p.decisionDate,
    conditions: p.conditions,
    technicalNotes: p.technicalNotes,
    declineReason: p.declineReason,
  });
  if (!mail.sent) context.log(`Approval mail not sent: ${mail.reason}`);

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        approvalId,
        decision: p.decision,
        approvedByName: p.approvedByName,
        becameLost,
        superseded: previous.length,
        stage: becameLost ? project.fields.Stage : staged.derived,
      },
    },
  };
}

app.http("recordApproval", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "approval",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in recordApproval:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
