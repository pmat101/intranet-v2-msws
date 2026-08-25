const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { normaliseName } = require("../lib/mint");
const { graph, SITE_ID } = require("../lib/graph");

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

/**
 * Suggests existing groups as the person types a company name.
 *
 * This is the human half of deduplication. The server matches exactly after
 * normalisation, which is safe but strict. This endpoint is deliberately
 * looser: it returns anything containing the typed text, so the person can
 * see "you may mean Jubilant Ltd" before creating a near-duplicate. Software
 * proposes, the human decides.
 */
async function handleSearch(request) {
  let caller;
  try {
    caller = await verifyRequest(request);
  } catch (err) {
    return fail(401, err.code, err.message);
  }
  try {
    await resolveRole(caller.email);
  } catch (err) {
    return fail(403, err.code || "role_failed", err.message);
  }

  const q = normaliseName(request.query.get("q") || "");
  if (q.length < 3) {
    return { status: 200, jsonBody: { ok: true, data: [] } };
  }

  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/GroupMaster/items?expand=fields&$top=999`,
  );

  const matches = [];
  for (const row of r.value || []) {
    const f = row.fields || {};
    const names = [
      f.CanonicalName,
      ...String(f.AliasNames || "").split(/[\n;|]/),
    ].filter(Boolean);
    const hit = names.find((n) => normaliseName(n).includes(q));
    if (hit) {
      matches.push({
        groupId: f.GroupID,
        canonicalName: f.CanonicalName,
        matchedOn: hit,
        exact: names.some((n) => normaliseName(n) === q),
      });
    }
    if (matches.length >= 8) break;
  }

  // Exact matches first, so the strongest suggestion is at the top.
  matches.sort((a, b) => Number(b.exact) - Number(a.exact));
  return { status: 200, jsonBody: { ok: true, data: matches } };
}

app.http("searchGroups", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "groups/search",
  handler: async (request, context) => {
    try {
      return await handleSearch(request);
    } catch (err) {
      context.log("UNHANDLED in searchGroups:", err.stack || String(err));
      return fail(500, "unexpected", "The search could not be completed");
    }
  },
});
