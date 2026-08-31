// Money handling for the front end.
//
// The API speaks INTEGER PAISE. People speak lakhs. All conversion happens
// here so no form has to remember it, and so a mistake can only be made once.
//
// 1 lakh = 100000 rupees = 10000000 paise.

const PAISE_PER_LAKH = 10000000;

/** "4.5" typed by a person becomes 45000000 paise. Blank stays blank. */
export function lakhToPaise(lakhText) {
  const t = String(
    lakhText === undefined || lakhText === null ? "" : lakhText,
  ).trim();
  if (t === "") return null;
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * PAISE_PER_LAKH);
}

/** 45000000 paise becomes "4.50" for display. */
export function paiseToLakh(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return "";
  return (n / PAISE_PER_LAKH).toFixed(2);
}

/** Formats paise as Indian currency: 45000000 becomes "Rs 4,50,000". */
export function formatRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return "";
  const rupees = Math.round(n / 100);
  return "Rs " + new Intl.NumberFormat("en-IN").format(rupees);
}

/** Reads a set of lakh-denominated inputs and returns paise, plus any errors. */
export function readMoneyFields(ids) {
  const values = {};
  const errors = [];
  for (const id of ids) {
    const el = document.getElementById(id);
    const paise = lakhToPaise(el ? el.value : "");
    if (paise === null) {
      errors.push({
        field: id,
        message: "Required. Enter 0 if it does not apply.",
      });
    } else if (Number.isNaN(paise)) {
      errors.push({ field: id, message: "Enter a number of zero or more" });
    } else {
      values[id] = paise;
    }
  }
  return { values, errors };
}
