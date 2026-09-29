const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { clientContext } = require("../lib/client-context");

// Client contact details are personal data, so only the roles that file or
// review BD02 may read them.
const MAY_VIEW = ["BD", "Accounts", "Admin", "CSO", "COO"];

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

/** The client panel on both BD02 forms, and the tax pre-fill for billing start. */
app.http("projectClient", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/client",
  handler: async (request, context) => {
    try {
      let caller, entry;
      try {
        caller = await verifyRequest(request);
        entry = await resolveRole(caller.email);
      } catch (err) {
        return fail(
          err.code === "no_role" ? 403 : 401,
          err.code || "auth_failed",
          err.message,
        );
      }
      if (!MAY_VIEW.includes(entry.role)) {
        return fail(
          403,
          "not_permitted",
          `Role ${entry.role} may not view client details`,
        );
      }
      const pcode = String(request.query.get("pcode") || "").trim();
      if (!pcode)
        return fail(400, "validation_failed", "A pcode parameter is required");

      const ctx = await clientContext(pcode, { withPrefill: true });
      if (!ctx)
        return fail(404, "no_such_project", `No project found for ${pcode}`);
      return { status: 200, jsonBody: { ok: true, data: ctx } };
    } catch (err) {
      context.log("UNHANDLED in projectClient:", err.stack || String(err));
      return fail(500, "unexpected", "The client details could not be loaded");
    }
  },
});
