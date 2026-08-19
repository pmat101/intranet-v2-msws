const { app } = require("@azure/functions");

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (request, context) => {
    context.log("Health check requested");
    return {
      status: 200,
      jsonBody: {
        ok: true,
        service: "perfact-intranet-api",
        timestamp: new Date().toISOString(),
      },
    };
  },
});
