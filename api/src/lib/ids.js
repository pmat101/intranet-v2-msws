// Identifier minting, ported from the legacy Apps Script Code.js.
//
// PORTING RULES, do not "improve" any of these:
//   - the serial is NOT zero-padded: String(serial)
//   - finYear takes the last two characters: slice(-2)
//   - normalizeCode strips non-alphanumerics, uppercases, truncates to maxLen
//   - an empty input yields an empty segment, so historical ProposalIDs
//     can legitimately have a missing sector or state
//   - segments are variable width; codes cannot be parsed by position
//
// The P-Code and the ProposalID share one serial and are minted together.
// Neither is ever re-minted. See BackendSchema.md section 2.

/** Exact port of legacy normalizeCode. */
function normalizeCode(value, maxLen) {
  return String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, maxLen || 3);
}

/**
 * Pure formatting. Given a payload and an already-allocated serial,
 * returns the two identifiers. No side effects, so it is fully testable.
 */
function buildIdentifiers(payload, serial) {
  const finYear = String(payload.finYear || new Date().getFullYear()).slice(-2);

  const pgCompany = normalizeCode(payload.pgCompany, 3);
  const stateCode = normalizeCode(payload.stUt || payload.state, 3);
  const serialCode = String(serial);
  const typeOfWork = normalizeCode(payload.workType, 3);
  const sector = normalizeCode(payload.sector, 3);
  const specs = normalizeCode(payload.specs, 3);

  const proposalID = `${pgCompany}${finYear}${stateCode}${serialCode}${typeOfWork}${sector}${specs}`;
  const pcode = `${pgCompany}${finYear}${serialCode}`;

  return { proposalID, pcode };
}

// Dummy formats for development. Real formats come from the Decoder
// before production. Deliberately unlike a P-Code so the two can never
// be confused in a screenshot or a support message.
function buildGroupID(serial) {
  return "GRP-" + String(serial).padStart(5, "0");
}
function buildCustomerID(serial) {
  return "CUS-" + String(serial).padStart(5, "0");
}
function buildContactID(serial) {
  return "CON-" + String(serial).padStart(5, "0");
}

module.exports = {
  normalizeCode,
  buildIdentifiers,
  buildGroupID,
  buildCustomerID,
  buildContactID,
};
