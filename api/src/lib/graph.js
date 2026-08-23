const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SITE_ID = process.env.SITE_ID;

const GRAPH = "https://graph.microsoft.com/v1.0";

// Cached app-only token. Tokens last about an hour; we reuse
// until shortly before expiry rather than fetching per call.
let cachedToken = null;
let cachedUntil = 0;

/**
 * Obtains a token for the application itself, with no user involved.
 * This is the client credentials flow.
 */
async function getAppToken() {
  const now = Date.now();
  if (cachedToken && now < cachedUntil) return cachedToken;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Could not obtain app token: ${res.status} ${detail}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Renew 5 minutes before Microsoft's stated expiry.
  cachedUntil = now + (data.expires_in - 300) * 1000;
  return cachedToken;
}

/**
 * Calls Graph as the application. Retries politely when throttled.
 */
async function graph(method, path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const token = await getAppToken();
    const options = {
      method,
      headers: { Authorization: "Bearer " + token },
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const res = await fetch(GRAPH + path, options);

    // 429 means slow down; 503 means try again shortly.
    if (res.status === 429 || res.status === 503) {
      const wait = Number(res.headers.get("retry-after") || 2);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(
        `Graph ${method} ${path} failed: ${res.status} ${detail}`,
      );
    }

    if (res.status === 204) return null;
    return await res.json();
  }
  throw new Error(`Graph ${method} ${path} still throttled after retries`);
}

const site = {
  lists: () => graph("GET", `/sites/${SITE_ID}/lists`),
  createList: (definition) =>
    graph("POST", `/sites/${SITE_ID}/lists`, definition),
};

module.exports = { graph, getAppToken, site, SITE_ID };
