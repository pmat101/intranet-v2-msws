// Indian tax identifiers, checked against their published formats.
//
// PAN    AAAAA9999A        five letters, four digits, one letter
// TAN    AAAA99999A        four letters, five digits, one letter
// GSTIN  99AAAAA9999A9Z9   two-digit state code, the holder's PAN, an entity
//                          number, the letter Z, and a check character
//
// Characters three to twelve of a GSTIN are the holder's PAN, so when both are
// given they must agree. A mismatch almost always means a typing error, and
// catching it here stops Accounts raising an invoice against a wrong number.
//
// The billing form mirrors these rules in the browser. Change both together.

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TAN = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Upper case, spaces removed: how numbers are written on documents varies. */
function normalise(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

function checkTaxIds(p) {
  const errors = [];
  const gst = normalise(p.gstNumber);
  const pan = normalise(p.panNumber);
  const tan = normalise(p.tanNumber);

  if (p.gstAvailable === true && gst && !GSTIN.test(gst)) {
    errors.push({
      field: "gstNumber",
      message:
        "This is not a valid GSTIN. It should be 15 characters, for instance 07AAAAA1234A1Z5",
    });
  }
  if (p.panAvailable === true && pan && !PAN.test(pan)) {
    errors.push({
      field: "panNumber",
      message:
        "This is not a valid PAN. It should be 10 characters, for instance AAAAA1234A",
    });
  }
  if (p.tanAvailable === true && tan && !TAN.test(tan)) {
    errors.push({
      field: "tanNumber",
      message:
        "This is not a valid TAN. It should be 10 characters, for instance DELA12345B",
    });
  }
  if (
    p.gstAvailable === true &&
    p.panAvailable === true &&
    GSTIN.test(gst) &&
    PAN.test(pan) &&
    gst.slice(2, 12) !== pan
  ) {
    errors.push({
      field: "gstNumber",
      message: `This GSTIN belongs to PAN ${gst.slice(2, 12)}, not ${pan}. One of the two is mistyped`,
    });
  }
  return { errors, gst, pan, tan };
}

module.exports = { checkTaxIds, normalise, PAN, TAN, GSTIN };
