const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");

app.http("whoami", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "whoami",
  handler: async (request, context) => {
    // Step one: who is this, cryptographically.
    let caller;
    try {
      caller = await verifyRequest(request);
    } catch (err) {
      context.log("Rejected:", err.code);
      return {
        status: 401,
        jsonBody: {
          ok: false,
          error: { code: err.code, message: err.message },
        },
      };
    }

    // Step two: what may they do.
    let entry;
    try {
      entry = await resolveRole(caller.email);
    } catch (err) {
      context.log("No role for", caller.email, err.code);
      return {
        status: 403,
        jsonBody: {
          ok: false,
          error: { code: err.code, message: err.message },
        },
      };
    }

    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          email: caller.email,
          name: entry.fullName || caller.name,
          role: entry.role,
          team: entry.team,
        },
      },
    };
  },
});
