// Tests for commercial computation and the twin gates.
// Run: node api/test/commercials.test.js
//
// No network. All amounts are integer paise: 1 lakh = 10000000.

const { computeCommercials, paiseToLakh, COST_FIELDS } =
  require("../src/lib/commercials");

const L = (lakh) => Math.round(lakh * 10000000);

const BOUNDS = {
  marginFloorPct: 15,
  marginCeilingPct: 30,
  velocityFloorPerMonth: L(1.5),
};

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}` +
    (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`));
}

/** A complete cost stack summing to the given total, spread over ten fields. */
function stack(totalLakh) {
  const each = Math.round(L(totalLakh) / 10);
  const out = {};
  for (const f of COST_FIELDS) out[f] = each;
  return out;
}

console.log("\n1. A healthy project, cost 80, quote 100, 10 months");
{
  const r = computeCommercials(
    { ...stack(80), pbl10FinalQuote: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("computes", r.ok, true);
  check("base cost", r.computed.baseCost, L(80));
  check("margin percent", r.computed.marginPct, 20);
  check("margin gate", r.computed.gateMargin, "Within");
  check("velocity per month", r.computed.velocityPerMonth, L(10));
  check("velocity gate", r.computed.gateVelocity, "Within");
  check("no escalation", r.computed.needsEscalation, false);
}

console.log("\n2. Thin margin, cost 90, quote 100. Below the 15 percent floor");
{
  const r = computeCommercials(
    { ...stack(90), pbl10FinalQuote: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("margin percent", r.computed.marginPct, 10);
  check("margin gate", r.computed.gateMargin, "BelowFloor");
  check("escalation required", r.computed.needsEscalation, true);
}

console.log("\n3. Fat margin, cost 50, quote 100. Above the 30 percent ceiling");
{
  const r = computeCommercials(
    { ...stack(50), pbl10FinalQuote: L(100), projectDurationMonths: 10 },
    BOUNDS);
  check("margin percent", r.computed.marginPct, 50);
  check("margin gate", r.computed.gateMargin, "AboveCeiling");
  check("ceiling does NOT force escalation", r.computed.needsEscalation, false);
}

console.log("\n4. Slow burn. Healthy margin, but the money arrives too slowly");
{
  // 100 lakh over 90 months is 1.11 lakh a month, below the 1.5 lakh floor.
  const r = computeCommercials(
    { ...stack(80), pbl10FinalQuote: L(100), projectDurationMonths: 90 },
    BOUNDS);
  check("margin is fine", r.computed.gateMargin, "Within");
  check("velocity below floor", r.computed.gateVelocity, "BelowFloor");
  check("escalation required", r.computed.needsEscalation, true);

  // 100 lakh over 60 months is 1.67 lakh a month, which passes.
  const ok = computeCommercials(
    { ...stack(80), pbl10FinalQuote: L(100), projectDurationMonths: 60 },
    BOUNDS);
  check("60 months still clears the floor", ok.computed.gateVelocity, "Within");

  // The boundary itself. 90 lakh over 60 months is exactly 1.5 lakh a month.
  const edge = computeCommercials(
    { ...stack(70), pbl10FinalQuote: L(90), projectDurationMonths: 60 },
    BOUNDS);
  check("exactly at the floor passes", edge.computed.gateVelocity, "Within");
}

console.log("\n5. Boundaries. Exactly 15 percent and exactly 30 percent pass");
{
  const a = computeCommercials(
    { ...stack(85), pbl10FinalQuote: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("15 percent is within", a.computed.gateMargin, "Within");
  const b = computeCommercials(
    { ...stack(70), pbl10FinalQuote: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("30 percent is within", b.computed.gateMargin, "Within");
}

console.log("\n6. Blind submission is impossible");
{
  const r = computeCommercials(
    { pbl10FinalQuote: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("refused", r.ok, false);
  check("names all ten cost fields", r.errors.length, 10);
}
{
  const r = computeCommercials(
    { ...stack(80), projectDurationMonths: 10 }, BOUNDS);
  check("quote required", r.ok, false);
}
{
  const r = computeCommercials(
    { ...stack(80), pbl10FinalQuote: L(100) }, BOUNDS);
  check("duration required", r.ok, false);
}

console.log("\n7. Zero is an answer, blank is not");
{
  const s = stack(80);
  s.siteVisitCosts = 0;
  const r = computeCommercials(
    { ...s, pbl10FinalQuote: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("zero accepted", r.ok, true);

  const s2 = stack(80);
  s2.siteVisitCosts = "";
  const r2 = computeCommercials(
    { ...s2, pbl10FinalQuote: L(100), projectDurationMonths: 10 }, BOUNDS);
  check("blank refused", r2.ok, false);
  check("names the blank field", r2.errors[0].field, "siteVisitCosts");
}

console.log("\n8. Revenue side. Gross 100 less 25 of others' money");
{
  const r = computeCommercials({
    ...stack(50),
    grossFee: L(100), prLab: L(10), psCompliance: L(5),
    liaison: L(4), subContractor: L(6),
    pbl10FinalQuote: L(100), projectDurationMonths: 10,
  }, BOUNDS);
  check("net Perfact revenue", r.computed.netPerfactRevenue, L(75));
}

console.log("\n9. Integer arithmetic holds where decimals would drift");
{
  const s = {};
  for (const f of COST_FIELDS) s[f] = L(0.1);
  const r = computeCommercials(
    { ...s, pbl10FinalQuote: L(2), projectDurationMonths: 1 }, BOUNDS);
  check("ten lots of 0.1 lakh is exactly 1 lakh", r.computed.baseCost, L(1));
  check("margin is exactly 50", r.computed.marginPct, 50);
}

console.log("\n10. Display formatting");
check("45000000 paise is 4.50 lakh", paiseToLakh(45000000), "4.50");
check("1 crore reads as 100.00 lakh", paiseToLakh(L(100)), "100.00");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
