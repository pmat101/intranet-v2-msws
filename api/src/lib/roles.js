const { graph, SITE_ID } = require("./graph");

// Role lookups are cached briefly. Every request needs one, the data
// changes rarely, and Graph throttles heavy callers.
const CACHE_MS = 5 * 60 * 1000;
let cache = null;
let cachedAt = 0;

class RoleError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function loadRoles() {
  const now = Date.now();
  if (cache && now - cachedAt < CACHE_MS) return cache;

  const result = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/UsersRoles/items?expand=fields&$top=999`,
  );

  const map = new Map();
  for (const item of result.value) {
    const f = item.fields || {};
    if (!f.Email) continue;
    map.set(f.Email.toLowerCase(), {
      fullName: f.FullName || "",
      role: f.Role || "",
      team: f.Team || "",
      active: f.Active === true,
    });
  }

  cache = map;
  cachedAt = now;
  return cache;
}

/**
 * Resolves a verified email to its role.
 * Throws RoleError if the person is unknown or deactivated.
 */
async function resolveRole(email) {
  const roles = await loadRoles();
  const entry = roles.get(email.toLowerCase());

  if (!entry) {
    throw new RoleError(
      "no_role",
      "This account has no role in the application",
    );
  }
  if (!entry.active) {
    throw new RoleError("inactive", "This account is deactivated");
  }
  return entry;
}

module.exports = { resolveRole, RoleError };
