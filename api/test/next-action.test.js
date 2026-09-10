// Tests for next-action derivation across the eight step chain. No network.
// Run: node api/test/next-action.test.js

const { nextAction } = require("../src/lib/next-action");

const KEYS = ["lead", "approval", "proposal", "sent",
              "commercials", "billing", "handover", "closure"];

const chain = (...doneKeys) =>
  KEYS.map((k) => ({ key: k, label: k, done: doneKeys.includes(k) }));

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}` +
    (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`));
}
const labelOf = (r) => (r ? r.label : "nothing outstanding");

console.log("\n1. The ordinary progression, one hop at a time");
check("a fresh lead",
  labelOf(nextAction(chain("lead"))), "Record the approval to pursue");
check("approved to pursue",
  labelOf(nextAction(chain("lead", "approval"))), "Record the proposal and quote ladder");
check("quote ladder set",
  labelOf(nextAction(chain("lead", "approval", "proposal"))),
  "Mark the proposal as sent to the client");
check("sent to the client",
  labelOf(nextAction(chain("lead", "approval", "proposal", "sent"))),
  "Record the final commercials");
check("commercials agreed",
  labelOf(nextAction(chain("lead", "approval", "proposal", "sent", "commercials"))),
  "Start billing");
check("billing started",
  labelOf(nextAction(chain("lead", "approval", "proposal", "sent", "commercials", "billing"))),
  "File the technical handover");
check("handed to delivery",
  labelOf(nextAction(chain("lead", "approval", "proposal", "sent", "commercials", "billing", "handover"))),
  "File closure and the after action review");
check("everything done",
  labelOf(nextAction(chain(...KEYS))), "nothing outstanding");

console.log("\n2. Steps skipped by events, which is the real case");
// Real projects skip steps. Telling somebody to go back and record a proposal
// on a project that is already handed over is noise, so the furthest step that
// IS done decides where we look next.
check("won with no ladder and no approval on record",
  labelOf(nextAction(chain("lead", "commercials", "billing", "handover"))),
  "File closure and the after action review");
check("billing started with nothing before it",
  labelOf(nextAction(chain("lead", "billing"))),
  "File the technical handover");
check("a legacy project with only a handover",
  labelOf(nextAction(chain("lead", "handover"))),
  "File closure and the after action review");

console.log("\n3. The sent step has no form of its own");
{
  const r = nextAction(chain("lead", "approval", "proposal"));
  check("no link", r.href, null);
  check("says where to do it", Boolean(r.note), true);
}

console.log("\n4. Terminal states");
check("lost", labelOf(nextAction(chain("lead"), "Lost")), "Lost");
check("closed", labelOf(nextAction(chain("lead"), "Closed")), "Closed");
check("lost is terminal", nextAction(chain("lead"), "Lost").terminal, true);
check("a closed project is terminal even mid chain",
  nextAction(chain("lead", "approval", "proposal"), "Closed").terminal, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
