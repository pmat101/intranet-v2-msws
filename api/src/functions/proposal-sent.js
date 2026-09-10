const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { refreshStage } = require("../lib/stage-machine");

const MAY_SEND = ["BD", "Admin", "CSO", "COO"];

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

async function findOne(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value && r.value[0]) || null;
}

/**
 * Records that the proposal package went to the client.
 *
 * One field, so this is a button rather than a form. It matters because it is
 * the only thing separating "we have written a quote" from "the client has it",
 * and without it a proposal sits under internal review forever while everyone
 * assumes it went out.
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
  if (!MAY_SEND.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not mark a proposal as sent`,
    );
  }

  let p;
  try {
    p = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const pcode = String(p.pcode || "").trim();
  if (!pcode) return fail(400, "validation_failed", "A P-Code is required");

  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project)
    return fail(404, "no_such_project", `No project found for ${pcode}`);

  const proposal = await findOne(
    "ProposalRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!proposal) {
    return fail(
      409,
      "no_proposal",
      "There is no proposal on this project to send. Record the quote ladder first.",
    );
  }
  if (!proposal.fields.PBL3First) {
    return fail(
      409,
      "no_quote",
      "This proposal has no opening quote, so there is nothing to send.",
    );
  }

  if (proposal.fields.SentToClientAtIso) {
    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          pcode,
          duplicate: true,
          sentAtIso: proposal.fields.SentToClientAtIso,
          message: "This proposal was already marked as sent",
        },
      },
    };
  }

  // The date can be back-dated, because the package often goes out before
  // anybody opens the system. Default to now if none is given.
  const sentAtIso = p.sentDate
    ? new Date(p.sentDate).toISOString()
    : new Date().toISOString();

  await graph(
    "PATCH",
    `/sites/${SITE_ID}/lists/ProposalRegister/items/${proposal.id}/fields`,
    {
      SentToClientAtIso: sentAtIso,
      Status: "Sent",
      ModifiedByEmail: caller.email,
      ModifiedAtIso: new Date().toISOString(),
    },
  );

  const staged = await refreshStage({ id: project.id, ...project.fields });
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  context.log(`${pcode} marked as sent to the client by ${caller.email}`);

  return {
    status: 200,
    jsonBody: {
      ok: true,
      data: { pcode, sentAtIso, stage: staged.derived },
    },
  };
}

app.http("markProposalSent", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "proposal/sent",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in markProposalSent:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
