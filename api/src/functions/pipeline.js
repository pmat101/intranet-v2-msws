const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { projectView, pipelineBoard } = require("../lib/pipeline");
const { workList } = require("../lib/work-list");
const { reconcile } = require("../lib/reconcile");
const { graph, SITE_ID } = require("../lib/graph");

const MAY_VIEW = ["BD", "TeamHead", "Accounts", "Admin", "CSO", "COO", "MIS"];

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

async function authorise(request) {
  const caller = await verifyRequest(request);
  const entry = await resolveRole(caller.email);
  if (!MAY_VIEW.includes(entry.role)) {
    const err = new Error(`Role ${entry.role} may not view the pipeline`);
    err.code = "not_permitted";
    err.status = 403;
    throw err;
  }
  return { caller, entry };
}

/**
 * Wraps the three handlers, because they would otherwise repeat the same
 * authentication and error handling. One place, one job.
 */
function guard(name, work) {
  return async (request, context) => {
    let who;
    try {
      who = await authorise(request);
    } catch (err) {
      return fail(err.status || 401, err.code || "auth_failed", err.message);
    }
    try {
      return await work(request, context, who);
    } catch (err) {
      context.log(`UNHANDLED in ${name}:`, err.stack || String(err));
      return fail(500, "unexpected", "The request could not be completed");
    }
  };
}

// The work list. Every active project with its one next action, ordered so
// that whatever has waited longest is at the top.
//
// workList computes `next` per project from its step evidence, so nothing is
// added here. An earlier version looked the action up from the stage, which
// told projects to redo work they had already finished.
//
// A BD executive sees their own projects by default, because a list of eighty
// projects belonging to other people is a report rather than a work list.
// Management roles see everything, since that is the point of the role.
app.http("myWork", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/work",
  handler: guard("myWork", async (request, context, who) => {
    const everyone = ["Admin", "CSO", "COO", "MIS"].includes(who.entry.role);
    const all = request.query.get("all") === "1";
    const scoped = everyone || all ? null : who.caller.email;

    const result = await workList({ ownerEmail: scoped });

    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          scopedTo: scoped || "everyone",
          canSeeEveryone: everyone,
          role: who.entry.role,
          totals: result.totals,
          work: result.work,
        },
      },
    };
  }),
});

// The board, grouped by stage. One list read, no step detail, because it must
// stay fast as the register grows.
app.http("pipelineBoardView", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/board",
  handler: guard("pipelineBoardView", async (request, context, who) => {
    const board = await pipelineBoard({});
    return { status: 200, jsonBody: { ok: true, data: board } };
  }),
});

// One project, everything known about it, what is due next, and the money.
app.http("projectDetail", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/project",
  handler: guard("projectDetail", async (request, context, who) => {
    const pcode = String(request.query.get("pcode") || "").trim();
    if (!pcode) {
      return fail(400, "validation_failed", "A pcode parameter is required");
    }

    const view = await projectView(pcode);
    if (!view) {
      return fail(404, "no_such_project", `No project found for ${pcode}`);
    }

    // The money position, so the page shows it alongside the steps rather
    // than making someone open a second screen to find it.
    const led = await graph(
      "GET",
      `/sites/${SITE_ID}/lists/ExpenseLedger/items?expand=fields&$top=999` +
        `&$filter=${encodeURIComponent(`fields/PCode eq '${pcode}'`)}`,
    );
    const ledger = (led.value || []).map((i) => i.fields);

    view.ledger = reconcile(ledger, { now: new Date().toISOString() });
    view.ledgerRows = ledger.map((r) => ({
      entryId: r.EntryID,
      source: r.Source,
      amount: Number(r.Amount) || 0,
      invoiceNo: r.InvoiceNo || "",
      dateIso: r.InvoiceDateIso || r.CreatedAtIso || "",
      notes: r.Notes || "",
    }));

    return { status: 200, jsonBody: { ok: true, data: view } };
  }),
});
