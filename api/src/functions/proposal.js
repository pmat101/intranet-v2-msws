const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { gateBounds } = require("../lib/settings");
const { computeLadder } = require("../lib/quote-ladder");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");
const { sendProposalRecorded } = require("../lib/mail-bd");

const MAY_SUBMIT = ["BD", "Admin", "CSO", "COO"];

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
      `Role ${entry.role} may not record a proposal`,
    );
  }

  let p;
  try {
    p = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const pcode = String(p.pcode || "").trim();
  if (!pcode)
    return fail(400, "validation_failed", "A P-Code is required", [
      { field: "pcode", message: "A P-Code is required" },
    ]);

  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project)
    return fail(404, "no_such_project", `No project found for ${pcode}`);

  let bounds;
  try {
    bounds = await gateBounds();
  } catch (err) {
    context.log("Gate bounds unavailable:", err.message);
    return fail(
      503,
      "gates_unavailable",
      "The pricing guidance cannot be computed because the gate bounds are not configured",
    );
  }

  const result = computeLadder(p, bounds);
  if (!result.ok) {
    return fail(
      400,
      "validation_failed",
      "Please complete the cost stack and correct the quote ladder",
      result.errors,
    );
  }
  const c = result.computed;

  const nowIso = new Date().toISOString();

  // BD01B creates the proposal row. BD02a later updates it with the agreed
  // figure rather than creating a second, so a project has one authoritative
  // proposal record and the step derivation never has to guess.
  const existing = await findOne(
    "ProposalRegister",
    `fields/PCode eq '${pcode}'`,
  );

  const fields = {
    PCode: pcode,
    Version: 1,
    OverheadCosts: Number(p.overheadCosts),
    TestingCharges: Number(p.testingCharges),
    AdminExpenses: Number(p.adminExpenses),
    ManpowerCosts: Number(p.manpowerCosts),
    OutsourcingCosts: Number(p.outsourcingCosts),
    Commissions: Number(p.commissions),
    OutsourcedManpower: Number(p.outsourcedManpower),
    SecondaryDataCosts: Number(p.secondaryDataCosts),
    ContingencyCosts: Number(p.contingencyCosts),
    SiteVisitCosts: Number(p.siteVisitCosts),
    PBLBaseCost: c.baseCost,
    PBL2Minimum: c.pbl2,
    PBL3First: c.pbl3,
    DurationMonths: c.durationMonths,
    Remarks: p.remarks || "",
    Status: "Draft",
    ModifiedByEmail: caller.email,
    ModifiedAtIso: nowIso,
  };

  let proposalRecId;
  if (existing) {
    // A revised opening quote replaces the previous one. The negotiation
    // history is a separate concern, recorded per round, not here.
    proposalRecId = existing.fields.ProposalRecID;
    await graph(
      "PATCH",
      `/sites/${SITE_ID}/lists/ProposalRegister/items/${existing.id}/fields`,
      fields,
    );
    context.log(`Proposal ladder updated for ${pcode} by ${caller.email}`);
  } else {
    proposalRecId =
      "PRP-" + String(await allocate("proposal_serial")).padStart(5, "0");
    await graph("POST", `/sites/${SITE_ID}/lists/ProposalRegister/items`, {
      fields: {
        ...fields,
        Title: `${pcode} v1`,
        ProposalRecID: proposalRecId,
        CSODecision: "NotSubmitted",
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });
    context.log(`Proposal ladder recorded for ${pcode} by ${caller.email}`);
  }

  const staged = await refreshStage({ id: project.id, ...project.fields });
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  const mail = await sendProposalRecorded(pcode, caller, {
    baseCost: c.baseCost,
    pbl2Minimum: c.pbl2,
    pbl3First: c.pbl3,
    marginAtFloor: c.marginAtFloor,
    marginAtFirst: c.marginAtFirst,
    negotiationRoom: c.negotiationRoom,
    negotiationRoomPct: c.negotiationRoomPct,
    advisory: c.advisory,
  });
  if (!mail.sent) context.log(`Proposal mail not sent: ${mail.reason}`);

  return {
    status: existing ? 200 : 201,
    jsonBody: {
      ok: true,
      data: {
        proposalRecId,
        pcode,
        revised: Boolean(existing),
        baseCost: c.baseCost,
        pbl2Minimum: c.pbl2,
        pbl3First: c.pbl3,
        marginAtFloor: c.marginAtFloor,
        marginAtFirst: c.marginAtFirst,
        velocityAtFirst: c.velocityAtFirst,
        negotiationRoom: c.negotiationRoom,
        negotiationRoomPct: c.negotiationRoomPct,
        advisory: c.advisory,
      },
    },
  };
}

app.http("recordProposal", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "proposal",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in recordProposal:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
