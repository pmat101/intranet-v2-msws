// Creates SharePoint lists from provisioning/schema.js.
// Idempotent: a second run reports "exists" and changes nothing.
//
// Usage:  node provisioning/provision.js
//         node provisioning/provision.js --dry-run

const fs = require("fs");
const path = require("path");

// Load configuration from the Functions settings file, so there is
// exactly one place secrets live. This MUST happen before graph.js is
// required, because that module reads process.env when it loads.
const settingsPath = path.join(__dirname, "..", "api", "local.settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
for (const [key, value] of Object.entries(settings.Values || {})) {
  process.env[key] = value;
}

const { graph, SITE_ID } = require("../api/src/lib/graph");
const { lists } = require("./schema");

const dryRun = process.argv.includes("--dry-run");

// Turn our shorthand into a Graph column definition.
function toColumn(col) {
  const definition = { name: col.name };
  if (col.indexed) definition.indexed = true;

  switch (col.type) {
    case "text":
      definition.text = {};
      break;
    case "number":
      definition.number = { decimalPlaces: "none" };
      break;
    case "dateTime":
      definition.dateTime = {};
      break;
    case "boolean":
      definition.boolean = {};
      break;
    case "choice":
      definition.choice = { choices: col.choices, allowTextEntry: false };
      break;
    default:
      throw new Error(`Unknown column type "${col.type}" on ${col.name}`);
  }
  return definition;
}

async function main() {
  console.log(`Site: ${SITE_ID}`);
  console.log(dryRun ? "DRY RUN, nothing will be created.\n" : "");

  const existing = await graph(
    "GET",
    `/sites/${SITE_ID}/lists?$select=displayName,id`,
  );
  const byName = new Map(existing.value.map((l) => [l.displayName, l.id]));

  for (const spec of lists) {
    if (byName.has(spec.name)) {
      console.log(`  exists   ${spec.name}`);
      continue;
    }
    if (dryRun) {
      console.log(
        `  would create ${spec.name} (${spec.columns.length} columns)`,
      );
      continue;
    }

    const body = {
      displayName: spec.name,
      description: spec.description || "",
      columns: spec.columns.map(toColumn),
      list: { template: "genericList" },
    };

    const created = await graph("POST", `/sites/${SITE_ID}/lists`, body);
    console.log(`  created  ${spec.name}  (${created.id})`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nProvisioning failed:", err.message);
  process.exit(1);
});
