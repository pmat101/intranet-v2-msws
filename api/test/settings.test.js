// Confirms the gate bounds are readable and sane. Talks to the dev site.
// Run: node api/test/settings.test.js

const fs = require("fs");
const path = require("path");
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "local.settings.json"), "utf8"),
);
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const { gateBounds } = require("../src/lib/settings");

async function main() {
  const b = await gateBounds();
  console.log("\nBounds read from the Settings master:");
  console.log(`  margin floor      ${b.marginFloorPct} per cent`);
  console.log(`  margin ceiling    ${b.marginCeilingPct} per cent`);
  console.log(`  velocity floor    ${b.velocityFloorPerMonth} paise`);
  console.log(`                    = Rs ${(b.velocityFloorPerMonth / 10000000).toFixed(2)} lakh a month`);

  // Sanity checks. A bound that is present but wrong is worse than one missing.
  if (b.marginFloorPct >= b.marginCeilingPct) {
    throw new Error("The margin floor is not below the ceiling");
  }
  if (b.velocityFloorPerMonth < 1000000 || b.velocityFloorPerMonth > 1000000000) {
    throw new Error(
      `Velocity floor of ${b.velocityFloorPerMonth} paise looks wrong. ` +
      `Expected roughly 15000000 for Rs 1.5 lakh. Check the number of zeros.`,
    );
  }
  console.log("\nBounds look sane.\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message, "\n");
  process.exit(1);
});
