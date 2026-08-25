const { app } = require("@azure/functions");
const { decodeJwt } = require("jose");

// TEMPORARY. Returns the claims of the supplied token, and what this
// deployment expects, so a mismatch is visible without a log pipeline.
//
// Decoding is not verifying, so this proves nothing about authenticity.
// It reveals only claims the caller already holds. DELETE THIS FILE as soon
// as the mismatch is identified; an endpoint that echoes token internals has
// no business existing in a system holding client data.
app.http("tokendebug", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "tokendebug",
  handler: async (request) => {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) {
      return { status: 400, jsonBody: { error: "No bearer token supplied" } };
    }
    const token = header.slice(7).trim();
    let claims;
    try {
      claims = decodeJwt(token);
    } catch (err) {
      return { status: 400, jsonBody: { error: "Could not decode", detail: err.message } };
    }
    const tenant = process.env.TENANT_ID || "";
    const client = process.env.CLIENT_ID || "";
    return {
      status: 200,
      jsonBody: {
        tokenSays: {
          iss: claims.iss,
          aud: claims.aud,
          ver: claims.ver,
          scp: claims.scp,
        },
        deploymentExpects: {
          iss: `https://login.microsoftonline.com/${tenant}/v2.0`,
          aud: client,
        },
        lengths: {
          tenantIdChars: tenant.length,
          clientIdChars: client.length,
        },
        matches: {
          iss: claims.iss === `https://login.microsoftonline.com/${tenant}/v2.0`,
          aud: claims.aud === client,
        },
      },
    };
  },
});
