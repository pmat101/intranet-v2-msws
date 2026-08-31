const { graph, SITE_ID } = require("./graph");

// Gate bounds are management-tunable data, not code, so they are read from
// the Settings master rather than hard-coded. Cached briefly because every
// commercial submission needs them and they change perhaps twice a year.
const CACHE_MS = 5 * 60 * 1000;
let cache = null;
let cachedAt = 0;

async function all() {
  const now = Date.now();
  if (cache && now - cachedAt < CACHE_MS) return cache;

  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/Settings/items?expand=fields&$top=999`,
  );
  const map = new Map();
  for (const row of r.value || []) {
    const f = row.fields || {};
    if (f.SettingKey) map.set(f.SettingKey, f.SettingValue);
  }
  cache = map;
  cachedAt = now;
  return cache;
}

/**
 * Returns the gate bounds.
 *
 * Throws rather than defaulting if a bound is missing. A silently defaulted
 * margin floor would let proposals through a gate that was never really there,
 * and nobody would notice until an audit.
 */
async function gateBounds() {
  const s = await all();
  const need = (key) => {
    const raw = s.get(key);
    const n = Number(raw);
    if (raw === undefined || !Number.isFinite(n)) {
      throw new Error(
        `Setting "${key}" is missing or not a number. The commercial gates ` +
          `cannot be evaluated without it.`,
      );
    }
    return n;
  };
  return {
    marginFloorPct: need("MarginFloorPct"),
    marginCeilingPct: need("MarginCeilingPct"),
    velocityFloorPerMonth: need("VelocityFloorPerMonth"),
  };
}

module.exports = { all, gateBounds };
