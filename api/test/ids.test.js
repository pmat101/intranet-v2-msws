// Golden tests for identifier minting.
// Run: node api/test/ids.test.js
//
// A golden test asserts that known inputs produce known-good outputs
// taken from the live system. If one fails, the port is wrong.

const {
  normalizeCode,
  buildIdentifiers,
} = require("../src/lib/ids");

let pass = 0, fail = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    pass++;
    console.log(`  ok    ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}\n        expected: ${expected}\n        actual:   ${actual}`);
  }
}

console.log("\nnormalizeCode");
check("uppercases",            normalizeCode("ecr", 3),            "ECR");
check("strips punctuation",    normalizeCode("E-C.R", 3),          "ECR");
check("strips spaces",         normalizeCode("E C R", 3),          "ECR");
check("truncates to maxLen",   normalizeCode("Jharkhand", 3),      "JHA");
check("keeps short values",    normalizeCode("JH", 3),             "JH");
check("empty input",           normalizeCode("", 3),               "");
check("null input",            normalizeCode(null, 3),             "");
check("undefined input",       normalizeCode(undefined, 3),        "");
check("defaults maxLen to 3",  normalizeCode("ABCDEF"),            "ABC");
check("keeps digits",          normalizeCode("1A", 3),             "1A");

console.log("\nbuildIdentifiers, blueprint example");
{
  const r = buildIdentifiers(
    { pgCompany: "PE", finYear: "2027", stUt: "JH",
      workType: "ECR", sector: "1A", specs: "GPL" },
    3853,
  );
  check("proposalID", r.proposalID, "PE27JH3853ECR1AGPL");
  check("pcode",      r.pcode,      "PE273853");
}

console.log("\nbuildIdentifiers, edge cases that must not be tidied");
{
  const r = buildIdentifiers(
    { pgCompany: "PE", finYear: "27", stUt: "JH",
      workType: "ECR", sector: "", specs: "GPL" },
    3853,
  );
  check("missing sector leaves a gap", r.proposalID, "PE27JH3853ECRGPL");
  check("pcode unaffected by sector",  r.pcode,      "PE273853");
}
{
  const r = buildIdentifiers(
    { pgCompany: "PE", finYear: "2027", stUt: "DL",
      workType: "EIA", sector: "1A", specs: "GPL" },
    5,
  );
  check("serial is not zero padded", r.pcode, "PE275");
}
{
  const r = buildIdentifiers(
    { pgCompany: "PR", finYear: "2026", stUt: "MH",
      workType: "LAB", sector: "2B", specs: "WTR" },
    1200,
  );
  check("PR entity, FY26", r.pcode, "PR261200");
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
