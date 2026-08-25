const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { validateLead } = require("../lib/validate");
const { mintProject } = require("../lib/mint");
const { graph, SITE_ID } = require("../lib/graph");

const MAY_CREATE = ["BD", "Admin", "CSO", "COO"];

function fail(status, code, message, errors) {
  return { status, jsonBody: { ok: false, error: { code, message, errors } } };
}

/**
 * Guards against a double submission. The browser sends a clientRef generated
 * once when the form opens, so a double-click or an impatient refresh carries
 * the same value and we return the existing project rather than minting again.
 */
async function findByClientRef(ref) {
  if (!ref) return null;
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/ProjectRegister/items` +
      `?expand=fields&$filter=fields/ClientRef eq '${ref}'`,
  );
  return (r.value && r.value[0]) || null;
}

async function handleCreateLead(request, context) {
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
  if (!MAY_CREATE.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not create leads`,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const { ok, errors } = validateLead(payload);
  if (!ok) {
    return fail(
      400,
      "validation_failed",
      "Please correct the highlighted fields",
      errors,
    );
  }

  try {
    const already = await findByClientRef(payload.clientRef);
    if (already) {
      context.log("Duplicate submission ignored, clientRef", payload.clientRef);
      return {
        status: 200,
        jsonBody: {
          ok: true,
          data: {
            pcode: already.fields.PCode,
            proposalID: already.fields.ProposalID,
            duplicate: true,
          },
        },
      };
    }

    const result = await mintProject(payload, caller);
    context.log(`Lead created ${result.pcode} by ${caller.email}`);
    return { status: 201, jsonBody: { ok: true, data: result } };
  } catch (err) {
    context.log("Lead creation failed:", err.stack || err.message);
    return fail(
      500,
      "create_failed",
      "The lead could not be created. Nothing was saved.",
    );
  }
}

app.http("createLead", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "leads",
  handler: async (request, context) => {
    // Outer guard. Without it an uncaught error becomes an empty 500 with no
    // envelope, which the front end cannot interpret and which logs nothing
    // useful. Every failure must return the same shape.
    try {
      return await handleCreateLead(request, context);
    } catch (err) {
      context.log("UNHANDLED in createLead:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
