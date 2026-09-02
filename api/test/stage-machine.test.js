// Tests for stage derivation. No network.
// Run: node api/test/stage-machine.test.js

const { deriveStage } = require("../src/lib/stage-machine");

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}` +
    (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`));
}

console.log("\nStage derived from evidence");
check("nothing but a lead", deriveStage({}), "Lead Identified");
check("no evidence object at all", deriveStage(null), "Lead Identified");
check("a quote has gone out",
  deriveStage({ proposal: true }), "Proposal Sent");
check("final commercials agreed",
  deriveStage({ proposal: true, finalCommercials: true }), "Negotiation");
check("client accepted",
  deriveStage({ proposal: true, finalCommercials: true, acceptance: true }),
  "Won and Onboarded");
check("handed to delivery",
  deriveStage({ proposal: true, finalCommercials: true, acceptance: true, handover: true }),
  "Won and Onboarded");
check("closed",
  deriveStage({ proposal: true, finalCommercials: true, acceptance: true,
                handover: true, closure: true }),
  "Delivered and Closed");

console.log("\nOut of order evidence still resolves to the furthest step");
check("handover without acceptance",
  deriveStage({ handover: true }), "Won and Onboarded");
check("closure with nothing else",
  deriveStage({ closure: true }), "Delivered and Closed");
check("acceptance without any proposal",
  deriveStage({ acceptance: true }), "Won and Onboarded");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
