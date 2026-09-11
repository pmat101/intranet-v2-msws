const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");

const MAY_LOSE = ["BD", "Admin", "CSO", "COO"];

// A project can be lost from any stage before it is won. Losing something
// already handed to delivery is not a loss, it is a cancellation, and that is
// a different conversation with different consequences for billing.
const NOT_LOSEABLE = ["Won and Onboarded", "Delivered and Closed"];

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
  if (!MAY_LOSE.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not mark a project as lost`,
    );
  }

  let p;
  try {
    p = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const errors = [];
  if (isBlank(p.pcode))
    errors.push({ field: "pcode", message: "A P-Code is required" });
  if (isBlank(p.reasonCategory)) {
    errors.push({
      field: "reasonCategory",
      message: "Choose why this was lost",
    });
  }
  // A reason is mandatory, and this is the whole point. The note says a
  // thousand leads went nowhere and nothing records why. A category alone can
  // be counted but explains nothing, so both are required.
  if (isBlank(p.reason)) {
    errors.push({
      field: "reason",
      message: "Say in a sentence what happened",
    });
  }
  if (p.reasonCategory === "LostToCompetitor" && isBlank(p.competitorName)) {
    errors.push({ field: "competitorName", message: "Name the competitor" });
  }
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

  const f = project.fields;

  if (f.Status === "Lost") {
    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          pcode,
          duplicate: true,
          message: "This project is already recorded as lost",
        },
      },
    };
  }
  if (f.Status === "Closed") {
    return fail(
      409,
      "already_closed",
      "This project is closed. A completed project cannot be marked as lost.",
    );
  }
  if (NOT_LOSEABLE.includes(f.Stage)) {
    return fail(
      409,
      "already_won",
      `This project reached ${f.Stage}, so it was won. If the client has ` +
        `since withdrawn, that is a cancellation rather than a loss and it needs ` +
        `the billing position resolving first.`,
    );
  }

  // Capture what we had quoted at the point of loss, so the analysis can ask
  // whether we lose at a particular price rather than only how often.
  const proposal = await findOne(
    "ProposalRegister",
    `fields/PCode eq '${pcode}'`,
  );
  const quoted = proposal
    ? Number(proposal.fields.PBL10Final) ||
      Number(proposal.fields.PBL3First) ||
      0
    : 0;
  const marginPct = proposal ? Number(proposal.fields.MarginPct) || 0 : 0;

  const nowIso = new Date().toISOString();
  const decidedAtIso = p.lostDate ? new Date(p.lostDate).toISOString() : nowIso;

  await graph("POST", `/sites/${SITE_ID}/lists/WinLossRegister/items`, {
    fields: {
      Title: pcode,
      PCode: pcode,
      Outcome: "Lost",
      StageAtOutcome: f.Stage || "Lead Identified",
      ReasonCategory: p.reasonCategory,
      Reason: p.reason,
      CompetitorName: p.competitorName || "",
      QuotedValue: quoted,
      MarginPct: marginPct,
      CostIncurred: Number(p.costIncurred) || 0,
      DecidedAtIso: decidedAtIso,
      RecordedByEmail: caller.email,
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  // Lost is terminal and set deliberately, never derived. The stage is left
  // where it was, because "lost at Negotiation" is more useful than "lost",
  // and the status is what removes it from the working list.
  await graph(
    "PATCH",
    `/sites/${SITE_ID}/lists/ProjectRegister/items/${project.id}/fields`,
    {
      Status: "Lost",
      LostReason: p.reason,
      LostDate: decidedAtIso,
      ModifiedByEmail: caller.email,
      ModifiedAtIso: nowIso,
    },
  );

  context.log(
    `${pcode} marked lost at ${f.Stage} by ${caller.email}: ${p.reasonCategory}`,
  );

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        outcome: "Lost",
        stageAtOutcome: f.Stage,
        reasonCategory: p.reasonCategory,
        quotedValue: quoted,
      },
    },
  };
}

app.http("markLost", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "lost",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in markLost:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
