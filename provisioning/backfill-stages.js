// Recomputes the pipeline stage for every project from the records that exist.
//
// Run after a legacy import, or after the stage list itself changes.
// Safe to re-run: it writes only where the stored stage disagrees with the
// evidence, and it never moves a project backwards or touches a terminal one.
//
// The dry run and the real run share planStage, so what the dry run reports is
// exactly what the real run will do.
//
// Usage:  node provisioning/backfill-stages.js [--dry-run] [--allow-backwards]
//
// --allow-backwards is for ONE situation: a stage has been renamed or its
// meaning has changed, so a stored value set under the superseded rule is an
// artefact rather than somebody's decision. Never use it routinely.

const fs = require("fs");
const path = require("path");
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "api", "local.settings.json"), "utf8"),
);
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const { graph, SITE_ID } = require("../api/src/lib/graph");
const { gatherEvidence, planStage, syncStage, STAGES } =
  require("../api/src/lib/stage-machine");

const dryRun = process.argv.includes("--dry-run");
const allowBackwards = process.argv.includes("--allow-backwards");

async function main() {
  if (allowBackwards) {
    console.log("BACKWARD MOVES ALLOWED. Use only after a stage rename.\n");
  }

  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/ProjectRegister/items?expand=fields&$top=999`,
  );
  const projects = (r.value || []).map((i) => ({ id: i.id, ...i.fields }));
  console.log(`${projects.length} projects\n`);

  let moved = 0, held = 0, back = 0;

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
      console.log(`  would move  ${p.PCode}  ${plan.stored} ${arrow} ${plan.derived}`);
    } else {
      await syncStage(p, evidence, { allowBackwards });
      console.log(`  moved       ${p.PCode}  ${plan.stored} ${arrow} ${plan.derived}`);
    }
    moved++;
  }

  console.log(`\n${moved} moved${back ? `, ${back} of them backwards` : ""}, ${held} unchanged.`);
}

main().catch((err) => {
  console.error("\nBackfill failed:", err.message);
  process.exit(1);
});
