// Reconciles the two independently sourced halves of the expense ledger.
//
// BD writes what the client committed to. Delivery writes what became billable.
// Accounts writes what was actually invoiced. Nobody writes all three, which is
// the point: a discrepancy is a difference between records kept by different
// people, and that is what makes it worth trusting.
//
// All amounts are INTEGER PAISE. Pure, no network.

const COMMITMENT = ["BD-WorkOrder"];
const SCHEDULE = ["BD-Milestone"];
const BILLABLE = ["TF07", "TF22"];
const INVOICED = ["Accounts-Invoice"];

function sum(rows) {
  return rows.reduce((total, r) => total + (Number(r.Amount) || 0), 0);
}

/**
 * Returns the position and any findings for one project.
 * A finding is something a person should look at, not necessarily an error.
 */
function reconcile(rows, options) {
  const opts = options || {};
  const staleDays = opts.staleDays || 21;
  const now = opts.now ? new Date(opts.now) : new Date();

  const by = (sources) => rows.filter((r) => sources.includes(r.Source));

  const committed = sum(by(COMMITMENT));
  const scheduled = sum(by(SCHEDULE));
  const billable = sum(by(BILLABLE));
  const invoiced = sum(by(INVOICED));
  const received = sum(by(INVOICED).filter((r) => r.PaidAtIso));

  const findings = [];

  if (committed > 0 && invoiced > committed) {
    findings.push({
      code: "over_invoiced",
      severity: "high",
      message: `Invoiced ${invoiced} paise against a work order of ${committed} paise`,
      difference: invoiced - committed,
    });
  }

  if (committed > 0 && scheduled > 0 && scheduled !== committed) {
    findings.push({
      code: "schedule_mismatch",
      severity: "medium",
      message: `Milestones total ${scheduled} paise but the work order is ${committed} paise`,
      difference: scheduled - committed,
    });
  }

  // A TF row with no Accounts row answering it. Delivery says billable,
  // Accounts has not billed. The gap is the thing worth measuring.
  const answered = new Set(
    by(INVOICED)
      .map((r) => r.AnswersEntryID)
      .filter(Boolean),
  );
  for (const row of by(BILLABLE)) {
    if (answered.has(row.EntryID)) continue;
    const raisedAt = row.InvoiceDateIso || row.CreatedAtIso;
    const ageDays = raisedAt
      ? Math.floor((now - new Date(raisedAt)) / 86400000)
      : null;
    findings.push({
      code: "billable_not_invoiced",
      severity: ageDays !== null && ageDays > staleDays ? "high" : "low",
      message:
        `${row.Source} entry ${row.EntryID} is billable` +
        (ageDays !== null ? ` and has waited ${ageDays} days` : "") +
        " with no invoice raised",
      entryId: row.EntryID,
      ageDays,
    });
  }

  // An invoice answering nothing. Billed outside the agreed schedule.
  const billableIds = new Set(by(BILLABLE).map((r) => r.EntryID));
  for (const row of by(INVOICED)) {
    if (!row.AnswersEntryID || !billableIds.has(row.AnswersEntryID)) {
      findings.push({
        code: "invoice_without_trigger",
        severity: "medium",
        message: `Invoice ${row.InvoiceNo || row.EntryID} does not answer any TF07 or TF22 entry`,
        entryId: row.EntryID,
      });
    }
  }

  return {
    committed,
    scheduled,
    billable,
    invoiced,
    received,
    outstanding: invoiced - received,
    unbilled: committed - invoiced,
    findings,
    clean: findings.length === 0,
  };
}

module.exports = { reconcile, COMMITMENT, SCHEDULE, BILLABLE, INVOICED };
