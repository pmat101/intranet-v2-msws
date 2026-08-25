// Server-side validation for BD01A. The browser validates too, for a fast
// response, but this is the version that decides. Both must agree.
//
// The mandatory set is ported from validateBD01AServer in the legacy
// submission-service.js, with two deliberate changes recorded in
// BDWorkflow.md: sector becomes mandatory, because it feeds the ProposalID
// and a blank produces a malformed identifier; and the form filler's name
// and email are dropped, because the verified signed-in identity replaces them.

const REQUIRED = [
  ["leadDate", "Date of client's mail or lead generation"],
  ["customerCompany", "Customer's company legal name"],
  ["customerContact", "Customer contact number"],
  ["customerEmail", "Customer email"],
  ["customerEmailConfirm", "Confirm customer email"],
  ["isRepeatCustomer", "Is this a repeat customer"],
  ["activityProposed", "Activity proposed"],
  ["stUt", "State or union territory"],
  ["workType", "Type of work"],
  ["sector", "Sector"],
  ["specs", "Specification"],
  ["finYear", "Financial year"],
  ["pgCompany", "Perfact entity"],
  ["customerClass", "Customer class"],
  ["leadSource", "Lead source"],
];

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

/** Returns { ok, errors }. Never throws. */
function validateLead(payload) {
  const errors = [];
  const p = payload || {};

  for (const [field, label] of REQUIRED) {
    if (isBlank(p[field]))
      errors.push({ field, message: `${label} is required` });
  }

  if (!isBlank(p.customerEmail) && !isBlank(p.customerEmailConfirm)) {
    if (
      String(p.customerEmail).trim().toLowerCase() !==
      String(p.customerEmailConfirm).trim().toLowerCase()
    ) {
      errors.push({
        field: "customerEmailConfirm",
        message: "The two email addresses do not match",
      });
    }
  }

  if (
    !isBlank(p.customerEmail) &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p.customerEmail).trim())
  ) {
    errors.push({
      field: "customerEmail",
      message: "Customer email does not look like an email address",
    });
  }

  // Conditional "other" fields, mirroring the legacy form's behaviour.
  if (
    String(p.leadSource).toLowerCase() === "others" &&
    isBlank(p.leadSourceOtherSpecify)
  ) {
    errors.push({
      field: "leadSourceOtherSpecify",
      message: "Please specify the lead source",
    });
  }
  if (
    String(p.workType).toLowerCase() === "others" &&
    isBlank(p.workTypeOtherSpecify)
  ) {
    errors.push({
      field: "workTypeOtherSpecify",
      message: "Please specify the type of work",
    });
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { validateLead, REQUIRED };
