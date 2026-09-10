const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");

// Anyone in BD can record that an approval was given, because they are the
// ones in the conversation. Who GAVE it is a separate field, and that is the
// part that matters: this records a decision made elsewhere rather than
// making one.
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

function validate(p) {
  const errors = [];
  if (isBlank(p.pcode)) errors.push({ field: "pcode", message: "A P-Code is required" });

  if (isBlank(p.decision)) {
    errors.push({ field: "decision", message: "A decision is required" });
  } else if (!["Approved", "Declined", "OnHold"].includes(p.decision)) {
    errors.push({ field: "decision", message: "Decision must be Approved, Declined or OnHold" });
  }

  // Who gave the approval is the whole point of the record. "It was approved"
  // with nobody named is not a record of anything, and it is exactly what an
  // auditor would ask about first.
  if (isBlank(p.approvedByName)) {
    errors.push({ field: "approvedByName", message: "Name the person who gave the decision" });
  }
  if (isBlank(p.approvalRole)) {
    errors.push({ field: "approvalRole", message: "In what capacity did they decide" });
  }
  if (isBlank(p.obtainedHow)) {
    errors.push({ field: "obtainedHow", message: "How was the decision obtained" });
  }
  if (isBlank(p.decisionDate)) {
    errors.push({ field: "decisionDate", message: "The date of the decision is required" });
  }

  // A decline without a reason tells nobody anything, and the reason is what
  // the win and loss analysis is built from.
  if (p.decision === "Declined" && isBlank(p.declineReason)) {
    errors.push({ field: "declineReason", message: "Say why this was declined" });
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
    return fail(403, "not_permitted", `Role ${entry.role} may not record an approval`);
  }

  let p;
  try {
    p = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const errors = validate(p);
  if (errors.length) {
    return fail(400, "validation_failed", "Please correct the highlighted fields", errors);
  }

  const pcode = String(p.pcode).trim();
  const project = await findOne("ProjectRegister", `fields/PCode eq '${pcode}'`);
  if (!project) return fail(404, "no_such_project", `No project found for ${pcode}`);

  const existing = await findOne("QualificationApprovals", `fields/PCode eq '${pcode}'`);
  if (existing) {
    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          pcode,
          duplicate: true,
          approvalId: existing.fields.ApprovalID,
          decision: existing.fields.Decision,
          message: "An approval decision has already been recorded for this project",
        },
      },
    };
  }

  const nowIso = new Date().toISOString();
  const approvalId = "APR-" + String(await allocate("approval_serial")).padStart(5, "0");

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
      RecordedByEmail: caller.email,
      RecordedAtIso: nowIso,
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  const staged = await refreshStage({ id: project.id, ...project.fields });
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  context.log(
    `Approval recorded for ${pcode}: ${p.decision} by ${p.approvedByName}, ${p.obtainedHow}`,
  );

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        approvalId,
        decision: p.decision,
        approvedByName: p.approvedByName,
        stage: staged.derived,
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
      return fail(500, "unexpected", "Something went wrong. Nothing was saved.");
    }
  },
});
