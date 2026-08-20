import { getToken } from "./auth.js";

// Every call to our own back end goes through here.
async function call(method, path, payload) {
  const token = await getToken();

  const options = {
    method,
    headers: { Authorization: "Bearer " + token },
  };
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
    throw err;
  }

  return data && data.data !== undefined ? data.data : data;
}

export const api = {
  get: (path) => call("GET", path),
  post: (path, payload) => call("POST", path, payload),
};
