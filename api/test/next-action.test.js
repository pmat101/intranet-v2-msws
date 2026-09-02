// Tests for next-action derivation. No network.
const { nextAction } = require("../src/lib/next-action");

const step = (key, done) => ({ key, label: key, done: Boolean(done) });
const chain = (...doneKeys) => {
  const keys = ["lead","qualification","proposal","commercials","billing","handover","closure"];
  return keys.map((k) => step(k, doneKeys.includes(k)));
};

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}` +
    (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`));
}
const labelOf = (r) => (r ? r.label : "nothing outstanding");

console.log("\nOrdinary progression");
check("a fresh lead", labelOf(nextAction(chain("lead"))),
  "Record the proposal and quote ladder");
check("proposal recorded", labelOf(nextAction(chain("lead","proposal"))),
  "Record the final commercials");
check("commercials done", labelOf(nextAction(chain("lead","proposal","commercials"))),
  "Start billing");
check("billing started", labelOf(nextAction(chain("lead","proposal","commercials","billing"))),
  "File the technical handover");
check("handed over",
  labelOf(nextAction(chain("lead","proposal","commercials","billing","handover"))),
  "File closure and the after action review");
check("all done",
  labelOf(nextAction(chain("lead","proposal","commercials","billing","handover","closure"))),
  "nothing outstanding");

console.log("\nSteps skipped by events, which is the real case");
check("won without a quote ladder",
  labelOf(nextAction(chain("lead","commercials","billing","handover"))),
  "File closure and the after action review");
check("billing started with no recorded commercials at all",
  labelOf(nextAction(chain("lead","billing"))),
  "File the technical handover");
check("qualification is never asked for",
  labelOf(nextAction(chain("lead"))) === "Send for qualification review", false);

console.log("\nTerminal states");
check("lost", labelOf(nextAction(chain("lead"), "Lost")), "Lost");
check("closed", labelOf(nextAction(chain("lead"), "Closed")), "Closed");
check("lost is terminal", nextAction(chain("lead"), "Lost").terminal, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
