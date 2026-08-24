// Tests the serial allocator against the live dev site.
// Run: node api/test/sequences.test.js
//
// This is an integration test: it talks to SharePoint and it MOVES the
// counter. Only ever run it against the dev site.

const fs = require("fs");
const path = require("path");
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "local.settings.json"), "utf8"),
);
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const { allocate, conflictCount } = require("../src/lib/sequences");

async function main() {
  console.log("\n1. Sequential allocation");
  const a = await allocate("project_serial");
  const b = await allocate("project_serial");
  console.log(`   got ${a} then ${b}`);
  if (b !== a + 1) throw new Error(`Expected consecutive values, got ${a} and ${b}`);
  console.log("   ok, consecutive");

  console.log("\n2. Ten simultaneous allocations, the real test");
  const results = await Promise.all(
    Array.from({ length: 10 }, () => allocate("project_serial")),
  );
  const sorted = [...results].sort((x, y) => x - y);
  console.log("   got:", sorted.join(", "));

  const unique = new Set(results);
  if (unique.size !== results.length) {
    throw new Error(`DUPLICATE ISSUED. ${results.length} calls produced ${unique.size} distinct values.`);
  }
  console.log("   ok, all ten distinct");

  const gaps = sorted.some((v, i) => i > 0 && v !== sorted[i - 1] + 1);
  console.log(gaps ? "   note: values are not contiguous" : "   ok, contiguous, no numbers burned");

  console.log(`   ETag conflicts caught and retried: ${conflictCount()}`);

  console.log(`   ETag conflicts caught and retried: ${conflictCount()}`);

  console.log("\n3. Unknown sequence is refused");
  try {
    await allocate("no_such_sequence");
    throw new Error("Expected an error and did not get one");
  } catch (err) {
    if (!err.message.includes("does not exist")) throw err;
    console.log("   ok, refused");
  }

  console.log("\nAll allocator tests passed.\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message, "\n");
  process.exit(1);
});
