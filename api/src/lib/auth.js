const { createRemoteJWKSet, jwtVerify } = require("jose");

const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const JWKS = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`),
);

class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Verifies the caller's token and returns their identity, or throws.
 *
 * The token arrives in X-Perfact-Auth rather than Authorization, because
 * Static Web Apps overwrites Authorization on requests to managed functions
 * with its own platform token. Authorization is still accepted as a fallback
 * so that direct curl testing against localhost:7071 works.
 *
 * Requires v2.0 access tokens: the app registration sets
 * requestedAccessTokenVersion to 2. Without it Entra issues v1.0 tokens whose
 * issuer is sts.windows.net and whose audience is the api:// URI.
 */
async function verifyRequest(request) {
  const header =
    request.headers.get("x-perfact-auth") ||
    request.headers.get("authorization") ||
    "";

  if (!header.startsWith("Bearer ")) {
    throw new AuthError("missing_token", "No bearer token supplied");
  }
  const token = header.slice(7).trim();

  if (!token || token.split(".").length !== 3) {
    throw new AuthError("invalid_token", "Token failed verification");
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      audience: CLIENT_ID,
    }));
  } catch (err) {
    throw new AuthError("invalid_token", "Token failed verification");
  }

  const email = payload.preferred_username || payload.upn || "";
  if (!email.toLowerCase().endsWith("@perfactgroup.in")) {
    throw new AuthError("wrong_domain", "Account is outside the organisation");
  }

  return {
    email: email.toLowerCase(),
    name: payload.name || "",
    objectId: payload.oid,
  };
}

module.exports = { verifyRequest, AuthError };
