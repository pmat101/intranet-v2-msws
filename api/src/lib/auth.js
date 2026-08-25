const { createRemoteJWKSet, jwtVerify, decodeJwt } = require("jose");

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
 * Verifies the bearer token on a request. Returns the caller, or throws.
 *
 * Requires v2.0 access tokens. The app registration manifest must set
 * requestedAccessTokenVersion to 2, otherwise Entra issues v1.0 tokens whose
 * issuer is sts.windows.net and whose audience is the api:// URI, and
 * verification fails on the issuer claim.
 */
async function verifyRequest(request) {
  const header = request.headers.get("authorization") || "";
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
    // TEMPORARY DIAGNOSTIC. Decoding is not verifying; this reads the claims
    // so we can see which one mismatched. Remove once resolved.
    try {
      const raw = decodeJwt(token);
      console.log("=== TOKEN DIAGNOSTIC ===");
      console.log("  iss          :", raw.iss);
      console.log("  aud          :", raw.aud);
      console.log("  ver          :", raw.ver);
      console.log("  scp          :", raw.scp);
      console.log("  appid        :", raw.appid || raw.azp);
      console.log("  expected iss :", `https://login.microsoftonline.com/${TENANT_ID}/v2.0`);
      console.log("  expected aud :", CLIENT_ID);
      console.log("  jose error   :", err.message);
      console.log("========================");
    } catch (e) {
      console.log("TOKEN DIAGNOSTIC: could not decode.", e.message);
    }
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
