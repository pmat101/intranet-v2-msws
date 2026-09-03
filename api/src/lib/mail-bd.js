// Mail for the BD chain beyond the lead confirmation.
//
// Every step's output is the next step's trigger. Without mail the output
// lands in a list and the trigger never fires: a project can be handed to the
// Ocean team and nobody in Ocean is told. These messages are what makes the
// chain actually chain.
//
// Sender is resolved by form family in mail-senders.js, so all of these go
// from support@perfactgroup.in.

const { send } = require("./mail");

const TOP_MANAGEMENT =
  process.env.MAIL_TOP_MANAGEMENT || "topmanagement@perfactgroup.in";
const ACCOUNTS = process.env.MAIL_ACCOUNTS || "accounts@perfactgroup.in";
const OPS_COUNCIL =
  process.env.MAIL_OPS_COUNCIL || "ops.council@perfactgroup.in";
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "perfactgroup.in";

// Pool mailboxes follow the pattern ocean@, fountain@ and so on, so the
// address is derived rather than looked up. If an exception ever appears,
// DeliveryPools.Mailbox is the place to override it.
const POOLS = [
  "Fountain",
  "Ocean",
  "Pond",
  "Pool",
  "Reservoir",
  "Spring",
  "Tributary",
];
function poolMailbox(pool) {
  if (!POOLS.includes(pool)) return null;
  return `${pool.toLowerCase()}@${MAIL_DOMAIN}`;
}

const lakh = (paise) => (Number(paise || 0) / 10000000).toFixed(2);

function esc(v) {
  return String(v === undefined || v === null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label, value) {
  return `<tr>
    <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:38%;">${esc(label)}</td>
    <td style="border:1px solid #ccc;padding:6px;">${esc(value)}</td>
  </tr>`;
}

function wrap(intro, rows, footer) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      ${intro}
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:10px;">
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:12px;color:#666;margin-top:16px;">${footer}</p>
    </div>`;
}

/** BD01B, the quote ladder. Top management see what we are asking for. */
async function sendProposalRecorded(pcode, caller, d) {
  return send({
    submittedBy: caller.email,
    formCode: "BD01B",
    to: [TOP_MANAGEMENT, caller.email],
    subject: `Quote set for ${pcode}: asking ${lakh(d.pbl3First)} lakh, floor ${lakh(d.pbl2Minimum)} lakh`,
    html: wrap(
      `<p>The quote ladder has been recorded for <strong>${esc(pcode)}</strong> by
       ${esc(caller.name || caller.email)}.</p>`,
      row("P-Code", pcode) +
        row("Base cost", `${lakh(d.baseCost)} lakh`) +
        row(
          "Floor, PBL2",
          `${lakh(d.pbl2Minimum)} lakh, ${d.marginAtFloor} per cent margin`,
        ) +
        row(
          "Opening quote, PBL3",
          `${lakh(d.pbl3First)} lakh, ${d.marginAtFirst} per cent margin`,
        ) +
        row(
          "Room to negotiate",
          `${lakh(d.negotiationRoom)} lakh, ${d.negotiationRoomPct} per cent`,
        ) +
        (d.advisory && d.advisory.length
          ? row("Advisory", d.advisory.map((a) => a.message).join(" "))
          : ""),
      "Perfact Intranet, BD Pipeline. Stage 3, Proposal Sent.",
    ),
  });
}

/**
 * BD02a, the agreed commercials.
 *
 * An escalation is deliberately not dressed as an ordinary notification. The
 * figures go in the subject line, because a message that looks like every
 * other message gets read like every other message, and this one carries a
 * decision somebody has to make.
 */
async function sendCommercialsRecorded(pcode, caller, d) {
  const escalated = d.needsEscalation;

  const subject = escalated
    ? `ESCALATION, ${pcode}, margin ${d.marginPct} per cent, below the floor`
    : `Commercials agreed for ${pcode}: ${lakh(d.quote)} lakh at ${d.marginPct} per cent`;

  const intro = escalated
    ? `<p style="border-left:4px solid #b3372b;padding-left:12px;">
         <strong>This proposal is below the commercial floor and needs a decision
         before it is accepted.</strong><br>
         Recorded for <strong>${esc(pcode)}</strong> by ${esc(caller.name || caller.email)}.</p>`
    : `<p>Final commercials recorded for <strong>${esc(pcode)}</strong> by
         ${esc(caller.name || caller.email)}.</p>`;

  return send({
    submittedBy: caller.email,
    formCode: "BD02",
    to: [ACCOUNTS, caller.email],
    cc: escalated ? [TOP_MANAGEMENT] : [],
    subject,
    html: wrap(
      intro,
      row("P-Code", pcode) +
        row("Base cost", `${lakh(d.baseCost)} lakh`) +
        row("Agreed quote", `${lakh(d.quote)} lakh`) +
        row("Margin", `${d.marginPct} per cent, ${d.gateMargin}`) +
        row(
          "Revenue a month",
          `${lakh(d.velocityPerMonth)} lakh, ${d.gateVelocity}`,
        ) +
        (escalated ? row("Escalation reason", d.escalationReason || "") : ""),
      "Perfact Intranet, BD Pipeline. Stage 3, Final Commercials.",
    ),
  });
}

/** BD02b, billing start. Accounts own the money from here. */
async function sendBillingStarted(pcode, caller, d) {
  return send({
    formCode: "BD02",
    to: [ACCOUNTS, caller.email],
    submittedBy: caller.email,
    subject: `Billing started for ${pcode}: work order ${lakh(d.workOrderValue)} lakh`,
    html: wrap(
      `<p>The client has accepted <strong>${esc(pcode)}</strong> and the expense
       ledger is open. Recorded by ${esc(caller.name || caller.email)}.</p>`,
      row("P-Code", pcode) +
        row("Accepted by", d.mode) +
        row(
          "Work order number",
          d.woNumber || d.soNumber || d.referenceNo || "",
        ) +
        row("Work order value", `${lakh(d.workOrderValue)} lakh`) +
        row("Validity", d.workOrderValidity || "") +
        row("Payment terms", d.paymentTerms || "") +
        row("Ledger entry", d.ledgerEntryId),
      "Perfact Intranet, BD Pipeline. Stage 5, Won and Onboarded. " +
        "The billing schedule follows on handover.",
    ),
  });
}

/**
 * BD03, the handover. This is the one that matters most: without it the
 * delivery pool has no idea the work exists.
 */
async function sendHandoverFiled(pcode, caller, d) {
  const pool = poolMailbox(d.deliveryPool);
  const to = [
    pool,
    d.teamHeadEmail,
    d.cSuiteOfficerEmail,
    d.eiaCoordinatorEmail,
  ].filter(Boolean);

  const milestoneRows = (d.milestones || [])
    .map((m) =>
      row(`${m.name}, ${m.percent} per cent`, `${lakh(m.amount)} lakh`),
    )
    .join("");

  return send({
    formCode: "BD03",
    to,
    cc: [ACCOUNTS, caller.email],
    submittedBy: caller.email,
    subject:
      `Handover to ${d.deliveryPool}: ${pcode}, ${esc(d.projectName || "")}`.trim(),
    html: wrap(
      `<p><strong>${esc(pcode)}</strong> has been handed to the
       <strong>${esc(d.deliveryPool)}</strong> team by
       ${esc(caller.name || caller.email)}.</p>`,
      row("P-Code", pcode) +
        row("Scope of work", d.scopeOfWork || "") +
        row("Category", d.category || "") +
        row("NABET sector", d.nabetSector || "") +
        row("Baseline season", d.baselineSeason || "") +
        row("EAC", d.eacName || "") +
        row("Team head", d.teamHeadEmail || "") +
        row("Project start", d.projectStartDate || "") +
        row("Work order value", `${lakh(d.workOrderValue)} lakh`) +
        `<tr><td colspan="2" style="padding:10px 6px 4px;font-weight:600;">Billing schedule</td></tr>` +
        milestoneRows,
      "Perfact Intranet, BD Pipeline. Stage 5, handed to delivery. " +
        "Accounts will bill against the schedule above as milestones are achieved.",
    ),
  });
}

/** BD05, closure. The lessons go to the Operations Council. */
async function sendProjectClosed(pcode, caller, d) {
  const lessonRows = (d.lessonTexts || [])
    .map((l) => row(l.category, l.lesson))
    .join("");

  return send({
    formCode: "BD05",
    to: [OPS_COUNCIL, caller.email],
    cc: [ACCOUNTS],
    submittedBy: caller.email,
    subject: `Closed: ${pcode}${d.lessonTexts && d.lessonTexts.length ? `, ${d.lessonTexts.length} lessons recorded` : ""}`,
    html: wrap(
      `<p><strong>${esc(pcode)}</strong> has been closed by
       ${esc(caller.name || caller.email)}. The after action review follows.</p>`,
      row("P-Code", pcode) +
        row(
          "Final settlement",
          `${lakh(d.fnfAmount)} lakh on ${d.fnfDate || ""}`,
        ) +
        row("TF08 reference", d.tf08Reference || "") +
        `<tr><td colspan="2" style="padding:10px 6px 4px;font-weight:600;">After action review</td></tr>` +
        row("What went well", d.aarWhatWentWell) +
        row("What did not", d.aarWhatDidNot) +
        row("What we learned", d.aarWhatWeLearned) +
        row("What we would change", d.aarWhatWeWouldChange) +
        (lessonRows
          ? `<tr><td colspan="2" style="padding:10px 6px 4px;font-weight:600;">Lessons for the firm</td></tr>` +
            lessonRows
          : ""),
      "Perfact Intranet, BD Pipeline. Stage 6, Delivered and Closed. " +
        "Lessons are recorded in the learning register for the Operations Council.",
    ),
  });
}

module.exports = {
  sendProposalRecorded,
  sendCommercialsRecorded,
  sendBillingStarted,
  sendHandoverFiled,
  sendProjectClosed,
  poolMailbox,
};
