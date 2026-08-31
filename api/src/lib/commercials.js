// Commercial computation for BD02.
//
// ALL AMOUNTS ARE INTEGER PAISE. See BackendSchema.md section 1.
// A value of Rs 4,50,000 is 45000000. Forms display lakhs; storage and
// arithmetic never do, because summing ten fields and dividing into a
// percentage is where decimal drift appears and where it would be disputed.
//
// Nothing here touches the network, so it is fully testable.

// The ten cost fields carried by the live BD02 form, in its own order.
const COST_FIELDS = [
  "overheadCosts",
  "testingCharges",
  "adminExpenses",
  "manpowerCosts",
  "outsourcingCosts",
  "commissions",
  "outsourcedManpower",
  "secondaryDataCosts",
  "contingencyCosts",
  "siteVisitCosts",
];

// The revenue-side decomposition from the blueprint. Gross fee less the
// amounts that belong to other parties gives Net Perfact Revenue.
const REVENUE_DEDUCTIONS = [
  "prLab",
  "psCompliance",
  "liaison",
  "subContractor",
];

function toPaise(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

/**
 * Computes every derived commercial figure.
 * Returns { ok, errors, computed }. Never throws.
 */
function computeCommercials(payload, bounds) {
  const errors = [];
  const p = payload || {};

  // Cost stack. Every field is required; zero is a legitimate answer, blank
  // is not. That distinction is the whole point: "no site visit cost" and
  // "nobody filled this in" must not look the same to the MIS.
  let baseCost = 0;
  for (const field of COST_FIELDS) {
    const raw = p[field];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      errors.push({
        field,
        message: `${field} is required. Enter 0 if it does not apply.`,
      });
      continue;
    }
    const paise = toPaise(raw);
    if (Number.isNaN(paise) || paise < 0) {
      errors.push({
        field,
        message: `${field} must be a number of zero or more`,
      });
      continue;
    }
    baseCost += paise;
  }

  // Revenue side.
  const grossFee = toPaise(p.grossFee);
  let deductions = 0;
  for (const field of REVENUE_DEDUCTIONS) deductions += toPaise(p[field]) || 0;
  const netPerfactRevenue = grossFee - deductions;

  // The agreed quote, PBL10 on the live form.
  const quote = toPaise(p.pbl10FinalQuote);
  if (!quote || quote <= 0) {
    errors.push({
      field: "pbl10FinalQuote",
      message: "Final quote value is required",
    });
  }

  const durationMonths = Number(p.projectDurationMonths);
  if (!Number.isFinite(durationMonths) || durationMonths <= 0) {
    errors.push({
      field: "projectDurationMonths",
      message:
        "Project duration in months is required and must be more than zero",
    });
  }

  if (errors.length) return { ok: false, errors, computed: null };

  // Margin is against the quote, so it answers "what proportion of what the
  // client pays do we keep", which is the question management asks.
  const marginPaise = quote - baseCost;
  const marginPct = (marginPaise / quote) * 100;
  const velocityPerMonth = Math.round(quote / durationMonths);

  const gateMargin =
    marginPct < bounds.marginFloorPct
      ? "BelowFloor"
      : marginPct > bounds.marginCeilingPct
        ? "AboveCeiling"
        : "Within";

  const gateVelocity =
    velocityPerMonth < bounds.velocityFloorPerMonth ? "BelowFloor" : "Within";

  // Below floor requires escalation before acceptance. It is not a refusal:
  // a blocked path gets worked around, an escalated one gets a decision.
  const needsEscalation =
    gateMargin === "BelowFloor" || gateVelocity === "BelowFloor";

  return {
    ok: true,
    errors: [],
    computed: {
      baseCost,
      grossFee,
      netPerfactRevenue,
      quote,
      marginPaise,
      marginPct: Math.round(marginPct * 100) / 100,
      durationMonths,
      velocityPerMonth,
      gateMargin,
      gateVelocity,
      needsEscalation,
    },
  };
}

/** Formats paise for display: 45000000 becomes "4.50". */
function paiseToLakh(paise) {
  return (Number(paise) / 10000000).toFixed(2);
}

module.exports = {
  computeCommercials,
  paiseToLakh,
  toPaise,
  COST_FIELDS,
  REVENUE_DEDUCTIONS,
};
