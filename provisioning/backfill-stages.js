// Recomputes the pipeline stage for every project from the records that exist.
//
// Run after a legacy import, after the stage list changes, or whenever the
// stored stages are suspect. Safe to re-run: it writes only where the stored
// stage disagrees with the evidence, never moves a project backwards, and never
// touches a Lost or Closed one.
//
// The dry run and the real run share planStage, so what the dry run reports is
// exactly what the real run will do.
//
// Usage:
//   node provisioning/backfill-stages.js [--dry-run] [--allow-backwards]
//   node provisioning/backfill-stages.js --site="{host},{guid},{guid}" [--dry-run]
//
// --site targets another site WITHOUT editing api/local.settings.json.
// --allow-backwards is for ONE situation: a stage was renamed or its meaning
// changed, so a stored value set under the old rule is an artefact rather than
// somebody's decision. Never use it routinely.

const fs = require("fs");
const path = require("path");

// ORDER MATTERS, and getting it wrong fails silently.
// 1. Load local.settings.json into process.env.
// 2. Apply any --site override, so it wins over the settings file.
// 3. ONLY THEN require graph.js and stage-machine.js, which capture SITE_ID
//    when they load. Anything set afterwards is ignored with no error.
const settingsPath = path.join(__dirname, "..", "api", "local.settings.json");
const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const siteArg = process.argv.find((a) => a.startsWith("--site="));
if (siteArg) {
  process.env.SITE_ID = siteArg
    .slice("--site=".length)
    .replace(/^["']|["']$/g, "");
}

const { graph, SITE_ID } = require("../api/src/lib/graph");
const {
  gatherEvidence,
  planStage,
  syncStage,
  STAGES,
} = require("../api/src/lib/stage-machine");

const dryRun = process.argv.includes("--dry-run");
const allowBackwards = process.argv.includes("--allow-backwards");

async function main() {
  console.log(`Site: ${SITE_ID}`);
  if (siteArg)
    console.log("Site taken from --site, overriding local.settings.json.");
  if (allowBackwards)
    console.log("BACKWARD MOVES ALLOWED. Use only after a stage rename.");
  if (dryRun) console.log("DRY RUN, nothing will be written.");
  console.log();

  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/ProjectRegister/items?expand=fields&$top=999`,
  );
  const projects = (r.value || []).map((i) => ({ id: i.id, ...i.fields }));
  console.log(`${projects.length} projects\n`);

  let moved = 0,
    held = 0,
    back = 0;

  for (const p of projects) {
    const evidence = await gatherEvidence(p.PCode);
    const plan = planStage(p, evidence, { allowBackwards });

    if (!plan.change) {
      if (plan.reason) console.log(`  held        ${p.PCode}  ${plan.reason}`);
      held++;
      continue;
    }

    const backwards =
      STAGES.indexOf(plan.derived) < STAGES.indexOf(plan.stored);
    if (backwards) back++;
    const arrow = backwards ? "<-" : "->";

    if (dryRun) {
      console.log(
        `  would move  ${p.PCode}  ${plan.stored} ${arrow} ${plan.derived}`,
      );
    } else {
      await syncStage(p, evidence, { allowBackwards });
      console.log(
        `  moved       ${p.PCode}  ${plan.stored} ${arrow} ${plan.derived}`,
      );
    }
    moved++;
  }

  console.log(
    `\n${moved} moved${back ? `, ${back} of them backwards` : ""}, ${held} unchanged.`,
  );
}

main().catch((err) => {
  console.error("\nBackfill failed:", err.message);
  process.exit(1);
});
