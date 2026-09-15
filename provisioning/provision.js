// Creates and reconciles SharePoint lists from provisioning/schema.js.
//
// Idempotent at two levels:
//   - a list that exists is not recreated
//   - a column missing from an existing list is added
//
// It never deletes or alters an existing column, because a column's internal
// name is fixed at creation and changing a type loses data. Removing something
// is a deliberate manual act.
//
// Usage:
//   node provisioning/provision.js [--dry-run]
//   node provisioning/provision.js --site="{host},{guid},{guid}" [--dry-run]
//
// The --site override exists so that another site can be provisioned WITHOUT
// editing api/local.settings.json, which is how a development environment ends
// up silently pointed at production.

const fs = require("fs");
const path = require("path");

// ORDER MATTERS, and getting it wrong fails silently.
//
// 1. Load local.settings.json into process.env.
// 2. THEN apply any --site override, so it wins over the settings file.
// 3. ONLY THEN require graph.js, which reads process.env.SITE_ID at load time
//    and captures it into a constant. Anything set after that require is
//    ignored, with no error: the old value is simply used.
const settingsPath = path.join(__dirname, "..", "api", "local.settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
for (const [key, value] of Object.entries(settings.Values || {})) {
  process.env[key] = value;
}

const siteArg = process.argv.find((a) => a.startsWith("--site="));
if (siteArg) {
  process.env.SITE_ID = siteArg
    .slice("--site=".length)
    .replace(/^["']|["']$/g, "");
}

const { graph, SITE_ID } = require("../api/src/lib/graph");
const { lists } = require("./schema");

const dryRun = process.argv.includes("--dry-run");

/**
 * A doubled schema would attempt duplicate creation, which usually means a
 * patch was applied twice. Fail loudly rather than half-creating things.
 */
function assertNoDuplicates() {
  const seen = new Set();
  for (const spec of lists) {
    if (seen.has(spec.name)) {
      throw new Error(
        `schema.js defines "${spec.name}" more than once. This usually means a ` +
          `patch was applied twice. Fix the schema before provisioning.`,
      );
    }
    seen.add(spec.name);
  }
}

function toColumn(col) {
  const d = { name: col.name };
  if (col.indexed) d.indexed = true;

  switch (col.type) {
    case "text":
      d.text = {};
      break;
    case "note":
      d.text = { allowMultipleLines: true, textType: "plain" };
      break;
    case "number":
      d.number = { decimalPlaces: "none" };
      break;
    case "money":
      // Integer paise. See BackendSchema.md section 1.
      d.number = { decimalPlaces: "none" };
      break;
    case "dateTime":
      d.dateTime = {};
      break;
    case "boolean":
      d.boolean = {};
      break;
    case "choice":
      d.choice = { choices: col.choices, allowTextEntry: false };
      break;
    default:
      throw new Error(`Unknown column type "${col.type}" on ${col.name}`);
  }
  return d;
}

async function main() {
  assertNoDuplicates();

  console.log(`Site: ${SITE_ID}`);
  if (siteArg) {
    console.log("Site taken from --site, overriding local.settings.json.");
  }
  if (dryRun) console.log("DRY RUN, nothing will be written.\n");

  const existing = await graph(
    "GET",
    `/sites/${SITE_ID}/lists?$select=displayName,id`,
  );
  const byName = new Map(existing.value.map((l) => [l.displayName, l.id]));

  let created = 0,
    added = 0,
    unchanged = 0;

  for (const spec of lists) {
    if (!byName.has(spec.name)) {
      if (dryRun) {
        console.log(
          `  would create  ${spec.name}  (${spec.columns.length} columns)`,
        );
        continue;
      }
      const body = {
        displayName: spec.name,
        description: spec.description || "",
        columns: spec.columns.map(toColumn),
        list: { template: "genericList" },
      };
      const result = await graph("POST", `/sites/${SITE_ID}/lists`, body);
      console.log(
        `  created       ${spec.name}  (${spec.columns.length} columns)`,
      );
      byName.set(spec.name, result.id);
      created++;
      continue;
    }

    // The list exists. Reconcile its columns.
    const listId = byName.get(spec.name);
    const cols = await graph(
      "GET",
      `/sites/${SITE_ID}/lists/${listId}/columns?$select=name,displayName`,
    );
    const have = new Set(cols.value.flatMap((c) => [c.name, c.displayName]));
    const missing = spec.columns.filter((c) => !have.has(c.name));

    if (missing.length === 0) {
      console.log(`  unchanged     ${spec.name}`);
      unchanged++;
      continue;
    }

    for (const col of missing) {
      if (dryRun) {
        console.log(`  would add     ${spec.name}.${col.name}`);
        continue;
      }
      await graph(
        "POST",
        `/sites/${SITE_ID}/lists/${listId}/columns`,
        toColumn(col),
      );
      console.log(`  added column  ${spec.name}.${col.name}`);
      added++;
    }
  }

  console.log(
    `\nDone. ${created} list(s) created, ${added} column(s) added, ${unchanged} unchanged.`,
  );
}

main().catch((err) => {
  console.error("\nProvisioning failed:", err.message);
  process.exit(1);
});
