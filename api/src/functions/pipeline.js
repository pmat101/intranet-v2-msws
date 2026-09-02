const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { projectView, pipelineBoard } = require("../lib/pipeline");
const { workList } = require("../lib/work-list");

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
// A BD executive sees their own projects by default, because a list of
// eighty projects belonging to other people is not a work list. Management
// roles see everything, since that is the point of their role.
app.http("myWork", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/work",
  handler: guard("myWork", async (request, context, who) => {
    const everyone = ["Admin", "CSO", "COO", "MIS"].includes(who.entry.role);
    const all = request.query.get("all") === "1";
    const scoped = everyone || all ? null : who.caller.email;

    const result = await workList({ ownerEmail: scoped });

    const board = await pipelineBoard({ ownerEmail: scoped });
    const { NEXT_ACTION } = require("../lib/pipeline");

    const work = board.projects
      .filter((p) => p.status === "Active")
      .map((p) => ({
        ...p,
        next: NEXT_ACTION[p.stage] || null,
      }));

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

// The board, grouped by stage.
app.http("pipelineBoardView", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/board",
  handler: guard("pipelineBoardView", async (request, context, who) => {
    const board = await pipelineBoard({});
    return { status: 200, jsonBody: { ok: true, data: board } };
  }),
});

// One project, everything known about it, and what is due next.
app.http("projectDetail", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/project",
  handler: guard("projectDetail", async (request, context, who) => {
    const pcode = String(request.query.get("pcode") || "").trim();
    if (!pcode)
      return fail(400, "validation_failed", "A pcode parameter is required");

    const view = await projectView(pcode);
    if (!view)
      return fail(404, "no_such_project", `No project found for ${pcode}`);

    return { status: 200, jsonBody: { ok: true, data: view } };
  }),
});
