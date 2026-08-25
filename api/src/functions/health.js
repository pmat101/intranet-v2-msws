const { app } = require("@azure/functions");

// Reports whether required configuration is present, never its values.
// A missing setting otherwise surfaces as "Token failed verification",
// which sends you hunting in entirely the wrong place.
const REQUIRED = ["TENANT_ID", "CLIENT_ID", "CLIENT_SECRET", "SITE_ID"];

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (request, context) => {
    const missing = REQUIRED.filter((k) => !process.env[k]);
    return {
      status: missing.length ? 503 : 200,
      jsonBody: {
        ok: missing.length === 0,
        service: "perfact-intranet-api",
        configured: missing.length === 0,
        missingSettings: missing,
        timestamp: new Date().toISOString(),
      },
    };
  },
});
