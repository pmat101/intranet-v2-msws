import { getToken } from "./auth.js";

// The token travels in X-Perfact-Auth, not Authorization.
//
// Azure Static Web Apps overwrites the Authorization header on requests to
// managed functions, substituting its own platform token for the internal hop
// between the static host and the function host. Our Entra token therefore
// never arrives. This is a long-standing documented behaviour, see
// github.com/Azure/static-web-apps issues 34, 275 and 335.
//
// A custom header passes through untouched. The token is unchanged and is
// still fully verified server-side; only the envelope differs.
const AUTH_HEADER = "X-Perfact-Auth";

async function call(method, path, payload) {
  const token = await getToken();

  const options = { method, headers: { [AUTH_HEADER]: "Bearer " + token } };
  if (payload !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(payload);
  }

  const response = await fetch("/api/" + path, options);

  // fetch does not throw on 4xx or 5xx, so we check ourselves.
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && data.error && data.error.message) ||
      "Request failed with status " + response.status;
    const err = new Error(message);
    err.status = response.status;
    err.code = data && data.error && data.error.code;
    err.errors = data && data.error && data.error.errors;
    throw err;
  }

  return data && data.data !== undefined ? data.data : data;
}

export const api = {
  get: (path) => call("GET", path),
  post: (path, payload) => call("POST", path, payload),
};
