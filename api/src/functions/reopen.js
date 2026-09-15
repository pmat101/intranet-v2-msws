const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");
const { sendProjectReopened } = require("../lib/mail-bd");

const MAY_REOPEN = ["BD", "Admin", "CSO", "COO"];

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

/**
 * Returns a lost project to the pipeline with everything it had intact.
 *
 * Clients come back and management changes its mind, so a loss is not always
 * final. Nothing is re-entered: the quote, the commercials and any documents
 * are still attached, and the stage machine puts the project back wherever the
 * evidence says it belongs. A project lost at Negotiation returns to
 * Negotiation; one declined at Qualification returns there, still needing a
 * fresh approval.
 *
 * The loss record is deleted, by decision: a win is a win. A ChangeLog row is
 * written so the bare fact survives, in case the returning-client analysis is
 * wanted later.
 */
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
  if (!MAY_REOPEN.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not reopen a project`,
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
  // A reason is required because reopening reverses a deliberate decision, and
  // the next person to look will want to know what changed.
  if (isBlank(p.reason)) {
    errors.push({ field: "reason", message: "Say why this is being reopened" });
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

  if (f.Status !== "Lost") {
    return fail(
      409,
      "not_lost",
      f.Status === "Closed"
        ? "This project was completed, not lost. A closed project cannot be reopened."
        : "This project is already active.",
    );
  }

  const nowIso = new Date().toISOString();
  const wasLostAt = f.Stage || "Lead Identified";

  // Remove the loss records. A win is a win, by decision on 11 September 2026.
  const lossRows = await findAll(
    "WinLossRegister",
    `fields/PCode eq '${pcode}'`,
  );
  for (const row of lossRows) {
    await graph(
      "DELETE",
      `/sites/${SITE_ID}/lists/WinLossRegister/items/${row.id}`,
    );
  }

  // The bare fact, kept in the append-only log. Nothing reads this today; it
  // exists so the option is not closed off.
  const changeId =
    "CHG-" + String(await allocate("change_serial")).padStart(6, "0");
  await graph("POST", `/sites/${SITE_ID}/lists/ChangeLog/items`, {
    fields: {
      Title: changeId,
      ChangeID: changeId,
      PCode: pcode,
      ListName: "ProjectRegister",
      FieldName: "Status",
      OldValue: `Lost at ${wasLostAt}: ${f.LostReason || "no reason recorded"}`,
      NewValue: "Active",
      ChangedByEmail: caller.email,
      ChangedAtIso: nowIso,
      Reason: p.reason,
    },
  });

  await graph(
    "PATCH",
    `/sites/${SITE_ID}/lists/ProjectRegister/items/${project.id}/fields`,
    {
      Status: "Active",
      LostReason: "",
      LostDate: null,
      ModifiedByEmail: caller.email,
      ModifiedAtIso: nowIso,
    },
  );

  // With the status back to Active the stage machine can derive again, and it
  // will place the project wherever its records say it belongs rather than
  // wherever it happened to be stored.
  const staged = await refreshStage({
    id: project.id,
    ...f,
    Status: "Active",
  });

  context.log(
    `${pcode} reopened by ${caller.email} from ${wasLostAt}, now ${staged.derived}`,
  );

  const mail = await sendProjectReopened(pcode, caller, {
    wasLostAt,
    stage: staged.derived,
    reason: p.reason,
  });
  if (!mail.sent) context.log(`Reopen mail not sent: ${mail.reason}`);

  return {
    status: 200,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        wasLostAt,
        stage: staged.derived,
        lossRecordsRemoved: lossRows.length,
      },
    },
  };
}

app.http("reopenProject", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "reopen",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in reopenProject:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was changed.",
      );
    }
  },
});
