const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { gateBounds } = require("../lib/settings");
const { computeCommercials } = require("../lib/commercials");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");

const MAY_SUBMIT = ["BD", "Admin", "CSO", "COO", "Accounts"];

function fail(status, code, message, errors) {
  return { status, jsonBody: { ok: false, error: { code, message, errors } } };
}

async function findProject(pcode) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/ProjectRegister/items` +
      `?expand=fields&$filter=fields/PCode eq '${pcode}'`,
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
  if (!MAY_SUBMIT.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not record commercials`,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const pcode = String(payload.pcode || "").trim();
  if (!pcode) return fail(400, "validation_failed", "A P-Code is required");

  const project = await findProject(pcode);
  if (!project)
    return fail(404, "no_such_project", `No project found for ${pcode}`);

  // Bounds first. If they are missing the gates cannot be evaluated, and a
  // proposal must not be accepted through a gate that is not really there.
  let bounds;
  try {
    bounds = await gateBounds();
  } catch (err) {
    context.log("Gate bounds unavailable:", err.message);
    return fail(
      503,
      "gates_unavailable",
      "The commercial gates cannot be evaluated because their bounds are not configured",
    );
  }

  // The server computes. Anything the client sent as a derived figure is
  // ignored entirely: a number management relies on must not be a number a
  // user can choose.
  const result = computeCommercials(payload, bounds);
  if (!result.ok) {
    return fail(
      400,
      "validation_failed",
      "Please complete the cost stack and the required commercial fields",
      result.errors,
    );
  }
  const c = result.computed;

  const nowIso = new Date().toISOString();
  const recId =
    "PRP-" + String(await allocate("proposal_serial")).padStart(5, "0");

  const fields = {
    Title: `${pcode} v1`,
    ProposalRecID: recId,
    PCode: pcode,
    Version: 1,

    GrossFee: c.grossFee,
    PRLab: Number(payload.prLab) || 0,
    PSCompliance: Number(payload.psCompliance) || 0,
    Liaison: Number(payload.liaison) || 0,
    SubContractor: Number(payload.subContractor) || 0,
    NetPerfactRevenue: c.netPerfactRevenue,

    OverheadCosts: Number(payload.overheadCosts),
    TestingCharges: Number(payload.testingCharges),
    AdminExpenses: Number(payload.adminExpenses),
    ManpowerCosts: Number(payload.manpowerCosts),
    OutsourcingCosts: Number(payload.outsourcingCosts),
    Commissions: Number(payload.commissions),
    OutsourcedManpower: Number(payload.outsourcedManpower),
    SecondaryDataCosts: Number(payload.secondaryDataCosts),
    ContingencyCosts: Number(payload.contingencyCosts),
    SiteVisitCosts: Number(payload.siteVisitCosts),

    PBLBaseCost: c.baseCost,
    PBL2Minimum: Number(payload.pbl2Minimum) || 0,
    PBL3First: Number(payload.pbl3First) || 0,
    PBL10Final: c.quote,

    MarginPaise: c.marginPaise,
    MarginPct: c.marginPct,
    DurationMonths: c.durationMonths,
    VelocityPerMonth: c.velocityPerMonth,
    GateMarginResult: c.gateMargin,
    GateVelocityResult: c.gateVelocity,
    NeedsEscalation: c.needsEscalation,
    EscalationReason: c.needsEscalation
      ? String(payload.escalationReason || "")
      : "",

    // A proposal needing escalation cannot go straight to the CSO. The
    // escalation is a recorded step, not a warning that can be clicked past.
    CSODecision: "NotSubmitted",
    Status: "Draft",

    WorkOrderLink: payload.workOrderLink || "",
    SalesOrderLink: payload.salesOrderLink || "",
    CostComputerLink: payload.costComputerLink || "",
    FinalProposalLink: payload.finalProposalLink || "",
    GSTTreatment: payload.gstTreatment || "",
    PRMode: payload.prMode || "",
    Remarks: payload.remarks || "",

    CreatedByEmail: caller.email,
    CreatedAtIso: nowIso,
  };

  // Below the floor, an escalation reason is required before the record is
  // accepted at all. This is Kushal's rule that a below-floor project
  // escalates before acceptance, enforced rather than advertised.
  if (c.needsEscalation && !String(payload.escalationReason || "").trim()) {
    return fail(
      400,
      "escalation_required",
      "This proposal is below the floor and cannot be recorded without an escalation reason",
      [
        {
          field: "escalationReason",
          message:
            `Margin ${c.marginPct} per cent, velocity ` +
            `Rs ${(c.velocityPerMonth / 10000000).toFixed(2)} lakh a month. ` +
            `State why this should be pursued.`,
        },
      ],
    );
  }

  await graph("POST", `/sites/${SITE_ID}/lists/ProposalRegister/items`, {
    fields,
  });

  // The stage is derived from what exists, so refresh it now the record does.
  const staged = await refreshStage(project);
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  context.log(
    `Commercials recorded for ${pcode} by ${caller.email}, margin ${c.marginPct}%`,
  );

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        proposalRecId: recId,
        pcode,
        baseCost: c.baseCost,
        quote: c.quote,
        marginPct: c.marginPct,
        velocityPerMonth: c.velocityPerMonth,
        gateMargin: c.gateMargin,
        gateVelocity: c.gateVelocity,
        needsEscalation: c.needsEscalation,
      },
    },
  };
}

app.http("recordCommercials", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "commercials",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in recordCommercials:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
