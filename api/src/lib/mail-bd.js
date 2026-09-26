// Mail for the whole BD chain, all eight stages plus the terminal outcomes.
//
// Recipients are ported from the legacy Apps Script mail-service.js wherever a
// legacy mail existed, so people who have received hundreds of these see
// continuity rather than a new system. Where a stage is new and has no legacy
// counterpart, the recipients follow the policy Pranav set on 25 August 2026.
//
// Every step's output is the next step's trigger. Without mail the output lands
// in a list and the trigger never fires: a project can be handed to the Ocean
// team and nobody in Ocean is told.
//
// Sender is resolved by form family in mail-senders.js, so all of these go from
// support@perfactgroup.in.

const { send } = require("./mail");

// Standing addresses. Environment variables so they can change without a code
// change, with the legacy values as defaults so the file is correct on its own.
const GLACIER = process.env.MAIL_GLACIER || "glacier@perfactgroup.in";
const ARCTIC = process.env.MAIL_ARCTIC || "arctic@perfactgroup.in";
const INFO = process.env.MAIL_INFO || "info@perfactgroup.in";
const TOP_MANAGEMENT =
  process.env.MAIL_TOP_MANAGEMENT || "topmanagement@perfactgroup.in";
const ACCOUNTS = process.env.MAIL_ACCOUNTS || "accounts@perfactgroup.in";
const OPERATIONS_COUNCIL =
  process.env.MAIL_OPERATIONS_COUNCIL || "operations.council@perfactgroup.in";
const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "perfactgroup.in";

// Pool mailboxes follow the pattern ocean@, fountain@ and so on, so the address
// is derived rather than looked up. A pool that is not on the list returns null
// rather than a plausible but dead address.
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

/** Matches the legacy row helper, so the tables look identical. */
function row(label, value) {
  return `
    <tr>
      <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:38%;">${esc(label)}</td>
      <td style="border:1px solid #ccc;padding:6px;">${esc(value)}</td>
    </tr>`;
}

/** Matches the legacy section helper: a bold title above a bordered table. */
function section(title, rowsHtml) {
  if (!rowsHtml) return "";
  return `
    <div style="margin-top:18px;">
      <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function wrap(intro, body, footer) {
  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      ${intro}
      ${body}
      <p style="font-size:12px;color:#666;margin-top:18px;">${esc(footer)}</p>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Stage 1, BD01A. Lead captured.                                      */
/* Legacy: TO glacier@ plus the submitter, CC info@.                   */
/* ------------------------------------------------------------------ */

async function sendLeadCreated(payload, caller, ids) {
  const location = [
    payload.addressLine1,
    payload.village,
    payload.taluka,
    payload.district,
    payload.state,
    payload.postalCode,
    payload.country,
  ]
    .filter(Boolean)
    .join(", ");

  const body =
    section(
      "Identity",
      row("P-Code", ids.pcode) +
        row("Proposal ID", ids.proposalID) +
        row("Client group", ids.groupId) +
        row("Customer", ids.customerId) +
        row("Contact", ids.contactId),
    ) +
    section(
      "Lead",
      row("Lead Date", payload.leadDate) +
        row("Raised By", `${caller.name || ""} (${caller.email})`) +
        row("Activity Proposed", payload.activityProposed) +
        row("Lead Source", payload.leadSource) +
        (payload.leadSourceOtherSpecify
          ? row("Lead Source Specify", payload.leadSourceOtherSpecify)
          : ""),
    ) +
    section(
      "Customer",
      row("Customer Company", payload.customerCompany) +
        row(
          "Customer Name",
          `${payload.customerFirstName || ""} ${payload.customerLastName || ""}`.trim(),
        ) +
        row("Customer Contact", payload.customerContact) +
        row("Customer Email", payload.customerEmail) +
        row("Repeat Customer", payload.isRepeatCustomer) +
        row("Customer Classification", payload.customerClass),
    ) +
    section(
      "Classification",
      row("Location", location) +
        row("ST / UT", payload.stUt) +
        row("Work Type", payload.workType) +
        (payload.workTypeOtherSpecify
          ? row("Work Type Specify", payload.workTypeOtherSpecify)
          : "") +
        row("Sector", payload.sector) +
        row("Specification", payload.specs) +
        row("Financial Year", payload.finYear) +
        row("PG Company", payload.pgCompany) +
        row("RFQ / Scope URL", payload.rfqUrl) +
        row("Remarks", payload.remarks),
    );

  return send({
    formCode: "BD01A",
    to: [GLACIER, caller.email],
    cc: [INFO],
    submittedBy: caller.email,
    subject:
      `New Proposal lead for ${payload.customerCompany} having ID ` +
      `${ids.proposalID} has been created successfully`,
    html: wrap(
      `<p>Dear ${esc(caller.name || caller.email)},</p>
       <p>Proposal ID <strong>${esc(ids.proposalID)}</strong> dated
       ${esc(payload.leadDate)} has been generated successfully.</p>`,
      body,
      "Perfact Intranet, BD Pipeline. Stage 1, Lead Identified. " +
        "Approval to pursue is due next.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 2, approval to pursue. New; no legacy counterpart.            */
/* A decline ends the pursuit, so management see both outcomes.        */
/* ------------------------------------------------------------------ */

async function sendApprovalRecorded(pcode, caller, d) {
  const declined = d.decision === "Declined";

  const subject = declined
    ? `DECLINED: ${pcode} will not be pursued, ${d.approvedByName}`
    : `${pcode} approved to pursue by ${d.approvedByName}`;

  const intro = declined
    ? `<p style="border-left:4px solid #b3372b;padding-left:12px;">
         <strong>This lead has been declined and moved to Lost.</strong><br>
         It can be brought back into the pipeline from the Lost list if the
         position changes.</p>`
    : `<p><strong>${esc(pcode)}</strong> has been approved to pursue. The
         proposal can now be prepared.</p>`;

  return send({
    formCode: "BD01B",
    to: [TOP_MANAGEMENT, caller.email],
    cc: d.approvedByEmail ? [d.approvedByEmail] : [],
    submittedBy: caller.email,
    subject,
    html: wrap(
      intro,
      section(
        "Decision",
        row("P-Code", pcode) +
          row("Decision", d.decision) +
          row("Decided By", d.approvedByName) +
          row("In What Capacity", d.approvalRole) +
          row("How Obtained", d.obtainedHow) +
          row("Date", d.decisionDate) +
          (d.conditions ? row("Conditions", d.conditions) : "") +
          (d.technicalNotes ? row("Technical Notes", d.technicalNotes) : "") +
          (declined ? row("Reason", d.declineReason) : ""),
      ) +
        section(
          "Recorded By",
          row("By", `${caller.name || ""} (${caller.email})`),
        ),
      declined
        ? "Perfact Intranet, BD Pipeline. Project moved to Lost."
        : "Perfact Intranet, BD Pipeline. Stage 3, Proposal Under Preparation.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 3, BD01B. The quote ladder.                                   */
/* Top management see what we intend to ask for, and our floor.        */
/* ------------------------------------------------------------------ */

async function sendProposalRecorded(pcode, caller, d) {
  return send({
    formCode: "BD01B",
    to: [TOP_MANAGEMENT, caller.email],
    cc: [GLACIER],
    submittedBy: caller.email,
    subject:
      `Quote set for ${pcode}: asking ${lakh(d.pbl3First)} lakh, ` +
      `floor ${lakh(d.pbl2Minimum)} lakh`,
    html: wrap(
      `<p>The quote ladder has been recorded for <strong>${esc(pcode)}</strong>
       by ${esc(caller.name || caller.email)}.</p>`,
      section(
        "The Quote Ladder",
        row("P-Code", pcode) +
          row("Base cost, PBL", `${lakh(d.baseCost)} lakh`) +
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
          row("Duration", `${d.durationMonths} months`),
      ) +
        (d.advisory && d.advisory.length
          ? section(
              "Advisory",
              d.advisory.map((a) => row(a.code, a.message)).join(""),
            )
          : ""),
      "Perfact Intranet, BD Pipeline. Stage 4, Proposal Under Review. " +
        "Mark the proposal as sent once the package reaches the client.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 5, proposal sent. New; no legacy counterpart.                 */
/* Deliberately brief: it records a fact rather than carrying figures. */
/* ------------------------------------------------------------------ */

async function sendProposalSent(pcode, caller, d) {
  return send({
    formCode: "BD01B",
    to: [caller.email],
    cc: [TOP_MANAGEMENT, GLACIER],
    submittedBy: caller.email,
    subject: `Proposal sent to the client for ${pcode}`,
    html: wrap(
      `<p>The proposal package for <strong>${esc(pcode)}</strong> has been
       recorded as sent to the client.</p>`,
      section(
        "Sent",
        row("P-Code", pcode) +
          row("Sent On", String(d.sentAtIso || "").slice(0, 10)) +
          row("Recorded By", `${caller.name || ""} (${caller.email})`),
      ),
      "Perfact Intranet, BD Pipeline. Stage 6, Negotiation. " +
        "A proposal with no response after fifteen days is flagged as stalled.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 6, BD02a. Final commercials.                                  */
/* Legacy BD02: TO glacier@ plus submitter, CC arctic@ and info@.      */
/* Accounts added per the policy of 25 August 2026.                    */
/*                                                                     */
/* An escalation is deliberately not dressed as an ordinary            */
/* notification: the figures go in the subject line, because a message */
/* that looks like every other message gets read like every other one, */
/* and this one carries a decision somebody has to make.               */
/* ------------------------------------------------------------------ */

async function sendCommercialsRecorded(pcode, caller, d) {
  const escalated = d.needsEscalation;

  const subject = escalated
    ? `ESCALATION, ${pcode}, margin ${d.marginPct} per cent, below the floor`
    : `Commercials agreed for ${pcode}: ${lakh(d.quote)} lakh at ${d.marginPct} per cent`;

  const intro = escalated
    ? `<p style="border-left:4px solid #b3372b;padding-left:12px;">
         <strong>This proposal is below the commercial floor and needs a
         decision before it is accepted.</strong><br>
         Recorded for <strong>${esc(pcode)}</strong> by
         ${esc(caller.name || caller.email)}.</p>`
    : `<p>Final commercials recorded for <strong>${esc(pcode)}</strong> by
         ${esc(caller.name || caller.email)}.</p>`;

  return send({
    formCode: "BD02",
    to: [GLACIER, ACCOUNTS, caller.email],
    cc: escalated ? [TOP_MANAGEMENT, ARCTIC, INFO] : [ARCTIC, INFO],
    submittedBy: caller.email,
    subject,
    html: wrap(
      intro,
      section(
        "Costing",
        row("P-Code", pcode) +
          row("Base cost", `${lakh(d.baseCost)} lakh`) +
          row("Agreed quote, PBL10", `${lakh(d.quote)} lakh`) +
          row("Margin", `${d.marginPct} per cent, ${d.gateMargin}`) +
          row("Duration", `${d.durationMonths || ""} months`) +
          row(
            "Revenue a month",
            `${lakh(d.velocityPerMonth)} lakh, ${d.gateVelocity}`,
          ),
      ) +
        (escalated
          ? section("Escalation", row("Reason", d.escalationReason || ""))
          : ""),
      "Perfact Intranet, BD Pipeline. Stage 7, Won and Onboarded. " +
        "Billing starts on the work order.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 7a, BD02b. Billing start. Accounts own the money from here.   */
/* ------------------------------------------------------------------ */

async function sendBillingStarted(pcode, caller, d) {
  return send({
    formCode: "BD02",
    to: [ACCOUNTS, caller.email],
    cc: [GLACIER, INFO],
    submittedBy: caller.email,
    subject: `Billing started for ${pcode}: work order ${lakh(d.workOrderValue)} lakh`,
    html: wrap(
      `<p>The client has accepted <strong>${esc(pcode)}</strong> and the expense
       ledger is open. Recorded by ${esc(caller.name || caller.email)}.</p>`,
      section(
        "Acceptance",
        row("P-Code", pcode) +
          row("Accepted By", d.mode) +
          row(
            "Work Order Number",
            d.woNumber || d.soNumber || d.referenceNo || "",
          ) +
          row("Work Order Value", `${lakh(d.workOrderValue)} lakh`) +
          row("Validity", d.workOrderValidity) +
          row("Payment Terms", d.paymentTerms) +
          row("Ledger Entry", d.ledgerEntryId),
      ),
      "Perfact Intranet, BD Pipeline. The billing schedule follows on handover.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 7b, BD03. Technical handover.                                 */
/* Legacy: TO glacier@, submitter and the team; CC the C-suite         */
/* officer, EIA coordinator, topmanagement@, accounts@, info@,         */
/* priority.wg@, the team head and any other named people.             */
/*                                                                     */
/* This is the one that matters most: without it the delivery pool has */
/* no idea the work exists.                                            */
/* ------------------------------------------------------------------ */

/**
 * Where a field offers "others", the form now asks what it means. Show that
 * rather than the word "others", which tells the reader nothing.
 */
function specified(value, other) {
  const v = String(value || "");
  return /^others?$/i.test(v) && other ? `${other} (other)` : v;
}

async function sendHandoverFiled(pcode, caller, d) {
  const pool = poolMailbox(d.deliveryPool);

  const to = [GLACIER, caller.email, pool].filter(Boolean);
  const cc = [
    d.cSuiteOfficerEmail,
    d.eiaCoordinatorEmail,
    d.teamHeadEmail,
    TOP_MANAGEMENT,
    ACCOUNTS,
    INFO,
    OPERATIONS_COUNCIL,
    ...(d.otherPersonEmails || []),
  ].filter(Boolean);

  // No amounts. The delivery team receives this mail and should not see the
  // contract value; milestone amounts would reveal it by simple addition.
  // Accounts has the figures in the billing-start mail, management in the
  // commercials mail. Decision by management, 23 September 2026.
  // The plan is given as percentages and timelines, which is what a delivery
  // team schedules against.
  const milestoneRows = (d.milestones || [])
    .map((m) =>
      row(
        m.name,
        `${m.percent} per cent of the contract` +
          (m.timeline ? `, ${m.timeline}` : ""),
      ),
    )
    .join("");

  const personRows = (d.otherPersons || [])
    .map((p) =>
      row(p.name || p.email, [p.purpose, p.email].filter(Boolean).join(", ")),
    )
    .join("");

  const contactEmails = (d.contactEmails || []).filter(Boolean).join(", ");

  return send({
    formCode: "BD03",
    to,
    cc,
    submittedBy: caller.email,
    subject:
      `New Project ${String(d.projectName || "").slice(0, 84)} with PCode ` +
      `${pcode} has been won and assigned to ${d.deliveryPool}`,
    html: wrap(
      `<p><strong>${esc(pcode)}</strong> has been handed to the
       <strong>${esc(d.deliveryPool)}</strong> team by
       ${esc(caller.name || caller.email)}.</p>`,
      section(
        "Project",
        row("P-Code", pcode) +
          row("Project Name", d.projectName) +
          row("Project Location", d.projectLocation) +
          row("Project Start", d.projectStartDate) +
          row("Scope of Work", d.scopeOfWork),
      ) +
        section(
          "Client",
          row("Company Name", d.companyName) +
            row("Contact Person", d.contactName) +
            row("Contact Email", contactEmails),
        ) +
        section(
          "Delivery",
          row("Delivery Team", d.deliveryPool) +
            row("Team Head", d.teamHeadEmail) +
            row("C-Suite Officer", d.cSuiteOfficerEmail) +
            row("EIA Coordinator", d.eiaCoordinatorEmail) +
            row("Gantt Chart", d.ganttChartLink),
        ) +
        section(
          "Technical",
          row("Category", specified(d.category, d.categoryOtherSpecify)) +
            row("NABET Sector", d.nabetSector) +
            row(
              "Baseline Season",
              specified(d.baselineSeason, d.baselineSeasonOtherSpecify),
            ) +
            row("EAC", specified(d.eacName, d.eacNameOtherSpecify)),
        ) +
        section("Any other person whom details to be shared", personRows) +
        section("Project Milestones and Billing Plan", milestoneRows),
      "Perfact Intranet, BD Pipeline. Accounts will bill against the plan " +
        "above as milestones are achieved.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Stage 8, BD05. Closure and the after action review.                 */
/* The lessons go to the Operations Council.                           */
/* ------------------------------------------------------------------ */

async function sendProjectClosed(pcode, caller, d) {
  const lessonRows = (d.lessonTexts || [])
    .map((l) => row(l.category, l.lesson))
    .join("");

  return send({
    formCode: "BD05",
    to: [OPERATIONS_COUNCIL, caller.email],
    cc: [ACCOUNTS, TOP_MANAGEMENT, INFO],
    submittedBy: caller.email,
    subject:
      `Closed: ${pcode}` +
      (d.lessonTexts && d.lessonTexts.length
        ? `, ${d.lessonTexts.length} lesson${d.lessonTexts.length === 1 ? "" : "s"} recorded`
        : ""),
    html: wrap(
      `<p><strong>${esc(pcode)}</strong> has been closed by
       ${esc(caller.name || caller.email)}. The after action review follows.</p>`,
      section(
        "Settlement",
        row("P-Code", pcode) +
          row("Final Settlement", `${lakh(d.fnfAmount)} lakh`) +
          row("Settlement Date", d.fnfDate) +
          row("TF08 Reference", d.tf08Reference) +
          row("Completion Certificate", d.completionCertificateLink),
      ) +
        section(
          "After Action Review",
          row("What went well", d.aarWhatWentWell) +
            row("What did not", d.aarWhatDidNot) +
            row("What we learned", d.aarWhatWeLearned) +
            row("What we would change", d.aarWhatWeWouldChange),
        ) +
        section("Lessons for the firm", lessonRows),
      "Perfact Intranet, BD Pipeline. Stage 8, Delivered and Closed. " +
        "Lessons are held in the learning register for the Operations Council.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Terminal, lost. New; no legacy counterpart.                         */
/* Management see every loss, because why we lose is the question the  */
/* Tier 3 note says cannot currently be answered.                      */
/* ------------------------------------------------------------------ */

async function sendProjectLost(pcode, caller, d) {
  return send({
    formCode: "BD00",
    to: [TOP_MANAGEMENT, caller.email],
    cc: [GLACIER, INFO],
    submittedBy: caller.email,
    subject: `Lost at ${d.stageAtOutcome}: ${pcode}, ${d.reasonCategory}`,
    html: wrap(
      `<p><strong>${esc(pcode)}</strong> has been recorded as lost by
       ${esc(caller.name || caller.email)}.</p>`,
      section(
        "Outcome",
        row("P-Code", pcode) +
          row("Lost At Stage", d.stageAtOutcome) +
          row("Reason", d.reasonCategory) +
          row("What Happened", d.reason) +
          (d.competitorName ? row("Competitor", d.competitorName) : "") +
          row("Quoted Value", `${lakh(d.quotedValue)} lakh`) +
          (d.costIncurred
            ? row("Cost Incurred", `${lakh(d.costIncurred)} lakh`)
            : ""),
      ),
      "Perfact Intranet, BD Pipeline. The project can be brought back into " +
        "the pipeline from the Lost list if the position changes.",
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Terminal, reopened.                                                 */
/* ------------------------------------------------------------------ */

async function sendProjectReopened(pcode, caller, d) {
  return send({
    formCode: "BD00",
    to: [TOP_MANAGEMENT, caller.email],
    cc: [GLACIER, INFO],
    submittedBy: caller.email,
    subject: `Reopened: ${pcode} is back in the pipeline at ${d.stage}`,
    html: wrap(
      `<p><strong>${esc(pcode)}</strong> has been brought back into the pipeline
       by ${esc(caller.name || caller.email)}. Everything previously entered is
       intact.</p>`,
      section(
        "Reopened",
        row("P-Code", pcode) +
          row("Was Lost At", d.wasLostAt) +
          row("Now At Stage", d.stage) +
          row("Why", d.reason),
      ),
      "Perfact Intranet, BD Pipeline.",
    ),
  });
}

module.exports = {
  sendLeadCreated,
  sendApprovalRecorded,
  sendProposalRecorded,
  sendProposalSent,
  sendCommercialsRecorded,
  sendBillingStarted,
  sendHandoverFiled,
  sendProjectClosed,
  sendProjectLost,
  sendProjectReopened,
  poolMailbox,
};
