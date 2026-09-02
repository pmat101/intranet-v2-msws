// Recomputes the pipeline stage for every project from the records that exist.
//
// Run after a legacy import, or any time the stored stages are suspect.
// Safe to re-run: it writes only where the stored stage disagrees with the
// evidence, and it never moves a project backwards or touches a terminal one.
//
// Usage:  node provisioning/backfill-stages.js [--dry-run]

const fs = require("fs");
const path = require("path");
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "api", "local.settings.json"), "utf8"),
);
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const { graph, SITE_ID } = require("../api/src/lib/graph");
const { gatherEvidence, syncStage } = require("../api/src/lib/stage-machine");

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/ProjectRegister/items?expand=fields&$top=999`,
  );
  const projects = (r.value || []).map((i) => ({ id: i.id, ...i.fields }));
  console.log(`${projects.length} projects\n`);

  let moved = 0, held = 0;
  for (const p of projects) {
    const evidence = await gatherEvidence(p.PCode);
    if (dryRun) {
      const { deriveStage } = require("../api/src/lib/stage-machine");
      const derived = deriveStage(evidence);
      const stored = p.Stage || "Lead Identified";
      if (derived !== stored) {
        console.log(`  would move  ${p.PCode}  ${stored} -> ${derived}`);
        moved++;
      } else {
        held++;
      }
      continue;
    }

    const result = await syncStage(p, evidence);
    if (result.changed) {
      console.log(`  moved       ${p.PCode}  ${result.stored} -> ${result.derived}`);
      moved++;
    } else {
      if (result.reason) console.log(`  held        ${p.PCode}  ${result.reason}`);
      held++;
    }
  }
  console.log(`\n${moved} moved, ${held} unchanged.`);
}

main().catch((err) => {
  console.error("\nBackfill failed:", err.message);
  process.exit(1);
});
