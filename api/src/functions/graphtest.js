const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { site } = require("../lib/graph");

app.http("graphtest", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "graphtest",
  handler: async (request, context) => {
    try {
      await verifyRequest(request);
    } catch (err) {
      return {
        status: 401,
        jsonBody: { ok: false, error: { code: err.code } },
      };
    }

    try {
      const result = await site.lists();
      const names = result.value.map((l) => l.displayName);
      return {
        status: 200,
        jsonBody: { ok: true, data: { count: names.length, names } },
      };
    } catch (err) {
      context.log("Graph call failed:", err.message);
      return {
        status: 500,
        jsonBody: {
          ok: false,
          error: { code: "graph_failed", message: err.message },
        },
      };
    }
  },
});
