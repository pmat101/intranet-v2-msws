const { send } = require("./mail");

// Recipients ported from sendBD01AEmail in the legacy mail-service.js.
// The legacy list is glacier@ plus the submitter, cc info@. Held here as
// configuration because the destination is a business decision: the pool
// list no longer includes Glacier, so this needs confirming with the CSO.
const LEAD_TO = (process.env.MAIL_BD01A_TO || "glacier@perfactgroup.in")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const LEAD_CC = (process.env.MAIL_BD01A_CC || "info@perfactgroup.in")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function esc(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label, value) {
  return `<tr>
    <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
    <td style="border:1px solid #ccc;padding:6px;">${esc(value)}</td>
  </tr>`;
}

/**
 * Builds and sends the lead confirmation.
 *
 * The subject line and table structure are kept close to the legacy mail so
 * that recipients who have received hundreds of these see continuity rather
 * than a new system. Two changes: the form filler is now the verified
 * signed-in identity rather than typed fields, and the P-Code is shown first
 * because it is the identifier everything else keys on.
 */
async function sendLeadCreated(payload, caller, ids) {
  const location = [
    payload.village,
    payload.taluka,
    payload.district,
    payload.state,
    payload.postalCode,
    payload.country,
  ]
    .filter(Boolean)
    .join(", ");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${esc(caller.name || caller.email)},</p>
      <p>Proposal ID <strong>${esc(ids.proposalID)}</strong> dated
         ${esc(payload.leadDate)} has been generated successfully.</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;"><tbody>
        ${row("P-Code", ids.pcode)}
        ${row("Proposal ID", ids.proposalID)}
        ${row("Lead Date", payload.leadDate)}
        ${row("Raised By", `${caller.name || ""} (${caller.email})`)}
        ${row("Client Group", ids.groupId)}
        ${row("Customer", ids.customerId)}
        ${row("Contact", ids.contactId)}
        ${row("Customer Company", payload.customerCompany)}
        ${row("Customer Name", `${payload.customerFirstName || ""} ${payload.customerLastName || ""}`.trim())}
        ${row("Customer Contact", payload.customerContact)}
        ${row("Customer Email", payload.customerEmail)}
        ${row("Repeat Customer", payload.isRepeatCustomer)}
        ${row("Activity Proposed", payload.activityProposed)}
        ${row("Location", location)}
        ${row("ST / UT", payload.stUt)}
        ${row("Work Type", payload.workType)}
        ${payload.workTypeOtherSpecify ? row("Work Type Specify", payload.workTypeOtherSpecify) : ""}
        ${row("Sector", payload.sector)}
        ${row("Specification", payload.specs)}
        ${row("Financial Year", payload.finYear)}
        ${row("PG Company", payload.pgCompany)}
        ${row("Customer Classification", payload.customerClass)}
        ${row("Lead Source", payload.leadSource)}
        ${payload.leadSourceOtherSpecify ? row("Lead Source Specify", payload.leadSourceOtherSpecify) : ""}
        ${row("RFQ / Scope URL", payload.rfqUrl)}
        ${row("Remarks", payload.remarks)}
      </tbody></table>
      <p style="font-size:12px;color:#666;margin-top:16px;">
        Sent by the Perfact Intranet BD Pipeline. Stage 1, Lead Identified.
        Qualification reviews are due within seven days.
      </p>
    </div>`;

  return send({
    formCode: "BD01A",
    to: [...LEAD_TO, caller.email],
    cc: LEAD_CC,
    subject: `New Proposal lead for ${payload.customerCompany} having ID ${ids.proposalID} has been created successfully`,
    html,
  });
}

module.exports = { sendLeadCreated };
