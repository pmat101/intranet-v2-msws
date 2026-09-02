// Tests for the quote ladder. No network.
// Run: node api/test/quote-ladder.test.js

const { computeLadder } = require("../src/lib/quote-ladder");
const { COST_FIELDS } = require("../src/lib/commercials");

const L = (lakh) => Math.round(lakh * 10000000);
const BOUNDS = { marginFloorPct: 15, marginCeilingPct: 30, velocityFloorPerMonth: L(1.5) };

/** A complete cost stack summing to the given total. */
function stack(totalLakh) {
  const each = Math.round(L(totalLakh) / 10);
  const out = {};
  for (const f of COST_FIELDS) out[f] = each;
  return out;
}

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}` +
    (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`));
}
const hasAdvice = (r, code) => r.computed.advisory.some((a) => a.code === code);

console.log("\n1. A sound ladder. Cost 70, floor 85, ask 100, 10 months");
{
  const r = computeLadder(
    { ...stack(70), pbl2Minimum: L(85), pbl3First: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("computes", r.ok, true);
  check("base cost", r.computed.baseCost, L(70));
  check("margin at the ask", r.computed.marginAtFirst, 30);
  check("margin at the floor", r.computed.marginAtFloor, 17.65);
  check("room to concede", r.computed.negotiationRoom, L(15));
  check("room as a percentage", r.computed.negotiationRoomPct, 15);
  check("no advisory", r.computed.advisory.length, 0);
}

console.log("\n2. Arithmetic mistakes are refused, not warned about");
{
  const r = computeLadder(
    { ...stack(70), pbl2Minimum: L(65), pbl3First: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("floor below cost is refused", r.ok, false);
  check("names the field", r.errors[0].field, "pbl2Minimum");
}
{
  const r = computeLadder(
    { ...stack(70), pbl2Minimum: L(85), pbl3First: L(80), projectDurationMonths: 10 },
    BOUNDS);
  check("ask below the floor is refused", r.ok, false);
  check("names the field", r.errors[0].field, "pbl3First");
}
{
  const r = computeLadder(
    { ...stack(70), pbl2Minimum: L(70), pbl3First: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("floor exactly at cost is refused, since zero margin is a loss", r.ok, false);
}

console.log("\n3. Thin pricing is advised, not refused");
{
  // Cost 90, ask 100. Ten per cent, below the fifteen per cent floor.
  const r = computeLadder(
    { ...stack(90), pbl2Minimum: L(95), pbl3First: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("still accepted", r.ok, true);
  check("advises on the opening quote", hasAdvice(r, "first_quote_below_margin_floor"), true);
  check("advises on the floor too", hasAdvice(r, "floor_below_margin_floor"), true);
}

console.log("\n4. Slow money is advised");
{
  // 100 lakh over 90 months is 1.11 lakh a month, below the 1.5 lakh floor.
  const r = computeLadder(
    { ...stack(70), pbl2Minimum: L(85), pbl3First: L(100), projectDurationMonths: 90 },
    BOUNDS);
  check("accepted", r.ok, true);
  check("advises on velocity", hasAdvice(r, "first_quote_below_velocity_floor"), true);
  check("margin advice not raised", hasAdvice(r, "first_quote_below_margin_floor"), false);
}

console.log("\n5. Blind submission is impossible");
{
  const r = computeLadder({ pbl2Minimum: L(85), pbl3First: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("refused", r.ok, false);
  check("names all ten cost fields", r.errors.length, 10);
}
{
  const r = computeLadder({ ...stack(70), pbl3First: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("the floor is required", r.ok, false);
}
{
  const r = computeLadder({ ...stack(70), pbl2Minimum: L(85), pbl3First: L(100) }, BOUNDS);
  check("duration is required", r.ok, false);
}

console.log("\n6. No room to negotiate is a legitimate position");
{
  const r = computeLadder(
    { ...stack(70), pbl2Minimum: L(100), pbl3First: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("ask equal to floor is allowed", r.ok, true);
  check("room is zero", r.computed.negotiationRoom, 0);
  check("no advisory, the margin is healthy", r.computed.advisory.length, 0);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
