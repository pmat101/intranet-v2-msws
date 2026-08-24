// Creates and reconciles SharePoint lists from provisioning/schema.js.
//
// Idempotent at two levels:
//   - a list that exists is not recreated
//   - a column that is missing from an existing list is added
//
// It never deletes or alters an existing column, because a column's
// internal name is fixed at creation and changing types loses data.
// Removing a column is a deliberate manual act.
//
// Usage:  node provisioning/provision.js [--dry-run]

const fs = require("fs");
const path = require("path");

// Load settings BEFORE requiring graph.js, which reads process.env on load.
const settingsPath = path.join(__dirname, "..", "api", "local.settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
for (const [key, value] of Object.entries(settings.Values || {})) {
  process.env[key] = value;
}

const { graph, SITE_ID } = require("../api/src/lib/graph");
const { lists } = require("./schema");

const dryRun = process.argv.includes("--dry-run");

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
  console.log(`Site: ${SITE_ID}`);
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
