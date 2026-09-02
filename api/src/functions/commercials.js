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
  if (!pcode) {
    return fail(400, "validation_failed", "A P-Code is required", [
      { field: "pcode", message: "A P-Code is required" },
    ]);
  }

  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project) {
    return fail(404, "no_such_project", `No project found for ${pcode}`);
  }

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

  // Below the floor, an escalation reason is required before the record is
  // accepted at all. This is Kushal's rule that a below-floor project
  // escalates before acceptance, enforced rather than advertised.
  //
  // Checked BEFORE any serial is allocated, so a refused submission does not
  // burn a proposal number and leave a gap in the series.
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

  const nowIso = new Date().toISOString();

  // BD01B may already have created this row with the quote ladder. If so we
  // update it rather than creating a second, so a project has one
  // authoritative proposal record and the step derivation never has to guess
  // which one is current.
  const existing = await findOne(
    "ProposalRegister",
    `fields/PCode eq '${pcode}'`,
  );

  const fields = {
    PCode: pcode,

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

    Status: "Draft",

    WorkOrderLink: payload.workOrderLink || "",
    SalesOrderLink: payload.salesOrderLink || "",
    CostComputerLink: payload.costComputerLink || "",
    FinalProposalLink: payload.finalProposalLink || "",
    GSTTreatment: payload.gstTreatment || "",
    PRMode: payload.prMode || "",
    Remarks: payload.remarks || "",

    ModifiedByEmail: caller.email,
    ModifiedAtIso: nowIso,
  };

  // The quote ladder belongs to BD01B, not here. These rungs are touched only
  // if the caller actually sent them. Writing `Number(x) || 0` unconditionally
  // would erase a floor and an opening quote that were deliberately set
  // earlier, which is silent data loss of exactly the kind that surfaces
  // months later when somebody asks what we originally quoted.
  if (payload.pbl2Minimum !== undefined && payload.pbl2Minimum !== null) {
    fields.PBL2Minimum = Number(payload.pbl2Minimum) || 0;
  }
  if (payload.pbl3First !== undefined && payload.pbl3First !== null) {
    fields.PBL3First = Number(payload.pbl3First) || 0;
  }

  let recId;
  if (existing) {
    recId = existing.fields.ProposalRecID;
    await graph(
      "PATCH",
      `/sites/${SITE_ID}/lists/ProposalRegister/items/${existing.id}/fields`,
      fields,
    );
    context.log(
      `Commercials updated for ${pcode} by ${caller.email}, margin ${c.marginPct}%`,
    );
  } else {
    recId = "PRP-" + String(await allocate("proposal_serial")).padStart(5, "0");
    await graph("POST", `/sites/${SITE_ID}/lists/ProposalRegister/items`, {
      fields: {
        ...fields,
        Title: `${pcode} v1`,
        ProposalRecID: recId,
        Version: 1,
        CSODecision: "NotSubmitted",
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });
    context.log(
      `Commercials recorded for ${pcode} by ${caller.email}, margin ${c.marginPct}%`,
    );
  }

  // The stage is derived from what exists, so refresh it now the record does.
  // findOne returns the raw Graph item with columns under `fields`, and
  // syncStage reads Stage and Status at the top level, so it must be flattened.
  // Without this every project looks like a fresh lead and a Lost one would be
  // resurrected.
  const staged = await refreshStage({ id: project.id, ...project.fields });
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  return {
    status: existing ? 200 : 201,
    jsonBody: {
      ok: true,
      data: {
        proposalRecId: recId,
        pcode,
        revised: Boolean(existing),
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
