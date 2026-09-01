// Tests for ledger reconciliation.
// Run: node api/test/reconcile.test.js
// No network. Amounts are integer paise: 1 lakh = 10000000.

const { reconcile } = require("../src/lib/reconcile");

const L = (lakh) => Math.round(lakh * 10000000);
const NOW = "2026-09-01T00:00:00.000Z";
const daysAgo = (n) =>
  new Date(Date.parse(NOW) - n * 86400000).toISOString();

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}` +
    (ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`));
}
function hasFinding(result, code) {
  return result.findings.some((f) => f.code === code);
}

console.log("\n1. A clean project. Work order 100, two milestones, both billed and paid");
{
  const r = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "BD-Milestone", Amount: L(60) },
    { EntryID: "E3", Source: "BD-Milestone", Amount: L(40) },
    { EntryID: "E4", Source: "TF07", Amount: L(60), InvoiceDateIso: daysAgo(30) },
    { EntryID: "E5", Source: "TF22", Amount: L(40), InvoiceDateIso: daysAgo(10) },
    { EntryID: "E6", Source: "Accounts-Invoice", Amount: L(60),
      AnswersEntryID: "E4", InvoiceNo: "INV-1", PaidAtIso: daysAgo(20) },
    { EntryID: "E7", Source: "Accounts-Invoice", Amount: L(40),
      AnswersEntryID: "E5", InvoiceNo: "INV-2", PaidAtIso: daysAgo(2) },
  ], { now: NOW });

  check("committed", r.committed, L(100));
  check("scheduled matches committed", r.scheduled, L(100));
  check("invoiced", r.invoiced, L(100));
  check("received", r.received, L(100));
  check("nothing outstanding", r.outstanding, 0);
  check("nothing unbilled", r.unbilled, 0);
  check("clean", r.clean, true);
}

console.log("\n2. Over-invoiced. Billed 110 against a work order of 100");
{
  const r = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "TF07", Amount: L(110), InvoiceDateIso: daysAgo(5) },
    { EntryID: "E3", Source: "Accounts-Invoice", Amount: L(110), AnswersEntryID: "E2" },
  ], { now: NOW });

  check("flagged", hasFinding(r, "over_invoiced"), true);
  check("difference", r.findings.find((f) => f.code === "over_invoiced").difference, L(10));
  check("high severity", r.findings.find((f) => f.code === "over_invoiced").severity, "high");
}

console.log("\n3. Milestones do not add up to the work order");
{
  const r = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "BD-Milestone", Amount: L(60) },
    { EntryID: "E3", Source: "BD-Milestone", Amount: L(30) },
  ], { now: NOW });

  check("flagged", hasFinding(r, "schedule_mismatch"), true);
  check("difference", r.findings.find((f) => f.code === "schedule_mismatch").difference, L(-10));
  check("medium, not high", r.findings.find((f) => f.code === "schedule_mismatch").severity, "medium");
}

console.log("\n4. Billable but never invoiced. The gap Accounts should see");
{
  const recent = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "TF07", Amount: L(50), InvoiceDateIso: daysAgo(3) },
  ], { now: NOW });
  check("flagged", hasFinding(recent, "billable_not_invoiced"), true);
  check("recent is low severity",
    recent.findings.find((f) => f.code === "billable_not_invoiced").severity, "low");
  check("age recorded",
    recent.findings.find((f) => f.code === "billable_not_invoiced").ageDays, 3);

  const stale = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "TF22", Amount: L(50), InvoiceDateIso: daysAgo(40) },
  ], { now: NOW });
  check("stale is high severity",
    stale.findings.find((f) => f.code === "billable_not_invoiced").severity, "high");
}

console.log("\n5. An invoice answering nothing. Billed outside the schedule");
{
  const r = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "Accounts-Invoice", Amount: L(20), InvoiceNo: "INV-9" },
  ], { now: NOW });
  check("flagged", hasFinding(r, "invoice_without_trigger"), true);
}
{
  const r = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "TF07", Amount: L(50), InvoiceDateIso: daysAgo(5) },
    { EntryID: "E3", Source: "Accounts-Invoice", Amount: L(50), AnswersEntryID: "E99" },
  ], { now: NOW });
  check("an unknown trigger is also flagged", hasFinding(r, "invoice_without_trigger"), true);
}

console.log("\n6. Part-billed and part-paid. The everyday position");
{
  const r = reconcile([
    { EntryID: "E1", Source: "BD-WorkOrder", Amount: L(100) },
    { EntryID: "E2", Source: "TF07", Amount: L(60), InvoiceDateIso: daysAgo(30) },
    { EntryID: "E3", Source: "Accounts-Invoice", Amount: L(60),
      AnswersEntryID: "E2", PaidAtIso: daysAgo(10) },
    { EntryID: "E4", Source: "TF22", Amount: L(40), InvoiceDateIso: daysAgo(4) },
    { EntryID: "E5", Source: "Accounts-Invoice", Amount: L(40), AnswersEntryID: "E4" },
  ], { now: NOW });

  check("invoiced", r.invoiced, L(100));
  check("received", r.received, L(60));
  check("outstanding", r.outstanding, L(40));
  check("unbilled", r.unbilled, 0);
  check("clean, nothing is actually wrong", r.clean, true);
}

console.log("\n7. An empty project produces no noise");
{
  const r = reconcile([], { now: NOW });
  check("clean", r.clean, true);
  check("no committed amount", r.committed, 0);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
