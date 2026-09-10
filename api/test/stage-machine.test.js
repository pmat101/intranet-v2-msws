// Tests for stage derivation across the eight stage pipeline. No network.
// Run: node api/test/stage-machine.test.js

const { deriveStage, STAGES } = require("../src/lib/stage-machine");

let pass = 0,
  fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"}  ${label}` +
      (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`),
  );
}

console.log("\n1. Eight stages, in order");
check("count", STAGES.length, 8);
check("third is preparation", STAGES[2], "Proposal Under Preparation");
check("fourth is review", STAGES[3], "Proposal Under Review");

console.log("\n2. The ordinary journey");
check("nothing but a lead", deriveStage({}), "Lead Identified");
check("no evidence object at all", deriveStage(null), "Lead Identified");
check(
  "review asked for, not answered",
  deriveStage({ qualificationRequested: true }),
  "Qualification",
);
check(
  "approved, no quote yet",
  deriveStage({ qualificationRequested: true, approved: true }),
  "Proposal Under Preparation",
);
check(
  "quote set, not sent",
  deriveStage({ qualificationRequested: true, approved: true, proposal: true }),
  "Proposal Under Review",
);
check(
  "quote sent to the client",
  deriveStage({ approved: true, proposal: true, sentToClient: true }),
  "Proposal Sent",
);
check(
  "final figure agreed",
  deriveStage({ proposal: true, sentToClient: true, finalCommercials: true }),
  "Negotiation",
);
check(
  "client accepted",
  deriveStage({ finalCommercials: true, acceptance: true }),
  "Won and Onboarded",
);
check(
  "handed to delivery",
  deriveStage({ acceptance: true, handover: true }),
  "Won and Onboarded",
);
check(
  "closed",
  deriveStage({ handover: true, closure: true }),
  "Delivered and Closed",
);

console.log("\n3. The two new stages are distinguished by the quote ladder");
{
  // The boundary is BD01B. Approved but no ladder means the proposal is being
  // written; a ladder that has not gone out means it is being reviewed.
  const before = deriveStage({ approved: true });
  const after = deriveStage({ approved: true, proposal: true });
  check("before the ladder", before, "Proposal Under Preparation");
  check("after the ladder", after, "Proposal Under Review");
  check("they differ", before === after, false);
}

console.log("\n4. A declined approval does not advance the project");
{
  check(
    "requested but declined",
    deriveStage({ qualificationRequested: true, approved: false }),
    "Qualification",
  );
}

console.log("\n5. Untidy evidence still resolves to the furthest step");
check(
  "handover without acceptance",
  deriveStage({ handover: true }),
  "Won and Onboarded",
);
check(
  "closure with nothing else",
  deriveStage({ closure: true }),
  "Delivered and Closed",
);
check(
  "acceptance without any proposal",
  deriveStage({ acceptance: true }),
  "Won and Onboarded",
);
check(
  "sent without an approval on record",
  deriveStage({ proposal: true, sentToClient: true }),
  "Proposal Sent",
);
check(
  "commercials with no ladder, a lead won on a verbal quote",
  deriveStage({ finalCommercials: true }),
  "Negotiation",
);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
