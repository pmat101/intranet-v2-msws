// The quote ladder: PBL, PBL2, PBL3.
//
// PBL   the base cost, summed from the cost stack. What the work costs us.
// PBL2  the minimum acceptable quote. The floor we will not go below.
// PBL3  the opening ask. What we actually quote.
//
// PBL10, the agreed figure, is recorded later on BD02a after negotiation.
//
// ALL AMOUNTS ARE INTEGER PAISE. Pure, no network.

const { COST_FIELDS } = require("./commercials");

function toPaise(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n);
}

function marginPct(quote, cost) {
  if (!quote || quote <= 0) return null;
  return Math.round(((quote - cost) / quote) * 10000) / 100;
}

/**
 * Validates and computes the ladder.
 * Returns { ok, errors, computed }. Never throws.
 *
 * The relationships between the rungs are what make this worth checking. A
 * floor below cost means quoting at a loss; an opening ask below the floor
 * means the negotiation starts already conceded. Both are easy to type by
 * accident and expensive to discover after the quote has gone out.
 */
function computeLadder(payload, bounds) {
  const errors = [];
  const p = payload || {};

  // Base cost from the same ten fields as BD02a, so the two forms cannot
  // disagree about what a project costs.
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

  const pbl2 = toPaise(p.pbl2Minimum);
  const pbl3 = toPaise(p.pbl3First);

  if (pbl2 === null)
    errors.push({
      field: "pbl2Minimum",
      message: "The minimum acceptable quote is required",
    });
  else if (Number.isNaN(pbl2) || pbl2 <= 0)
    errors.push({
      field: "pbl2Minimum",
      message: "The minimum quote must be more than zero",
    });

  if (pbl3 === null)
    errors.push({ field: "pbl3First", message: "The first quote is required" });
  else if (Number.isNaN(pbl3) || pbl3 <= 0)
    errors.push({
      field: "pbl3First",
      message: "The first quote must be more than zero",
    });

  const months = Number(p.projectDurationMonths);
  if (!Number.isFinite(months) || months <= 0) {
    errors.push({
      field: "projectDurationMonths",
      message:
        "Project duration in months is required and must be more than zero",
    });
  }

  if (errors.length) return { ok: false, errors, computed: null };

  // The rungs must be in order. Quoting below cost, or opening below our own
  // floor, are both refused rather than warned about.
  if (pbl2 <= baseCost) {
    errors.push({
      field: "pbl2Minimum",
      message:
        `The minimum quote of ${(pbl2 / 10000000).toFixed(2)} lakh is at or below ` +
        `the base cost of ${(baseCost / 10000000).toFixed(2)} lakh, so it would be a loss`,
    });
  }
  if (pbl3 < pbl2) {
    errors.push({
      field: "pbl3First",
      message:
        `The first quote of ${(pbl3 / 10000000).toFixed(2)} lakh is below the ` +
        `minimum of ${(pbl2 / 10000000).toFixed(2)} lakh, so the negotiation would ` +
        `start already conceded`,
    });
  }
  if (errors.length) return { ok: false, errors, computed: null };

  const marginAtFloor = marginPct(pbl2, baseCost);
  const marginAtFirst = marginPct(pbl3, baseCost);
  const velocityAtFirst = Math.round(pbl3 / months);
  const velocityAtFloor = Math.round(pbl2 / months);

  // Advisory only at this stage. The binding gate is on BD02a, against the
  // agreed figure, because that is the number the firm is actually held to.
  // Flagging here is guidance before the quote goes out, not a refusal.
  const advisory = [];
  if (marginAtFirst < bounds.marginFloorPct) {
    advisory.push({
      code: "first_quote_below_margin_floor",
      message:
        `The opening quote gives ${marginAtFirst} per cent, below the ` +
        `${bounds.marginFloorPct} per cent floor. There is no room to negotiate down.`,
    });
  }
  if (marginAtFloor < bounds.marginFloorPct) {
    advisory.push({
      code: "floor_below_margin_floor",
      message:
        `Your minimum of ${(pbl2 / 10000000).toFixed(2)} lakh gives only ` +
        `${marginAtFloor} per cent, below the ${bounds.marginFloorPct} per cent floor. ` +
        `Accepting it would require an escalation.`,
    });
  }
  if (velocityAtFirst < bounds.velocityFloorPerMonth) {
    advisory.push({
      code: "first_quote_below_velocity_floor",
      message:
        `The opening quote is ${(velocityAtFirst / 10000000).toFixed(2)} lakh a month ` +
        `over ${months} months, below the ` +
        `${(bounds.velocityFloorPerMonth / 10000000).toFixed(2)} lakh floor.`,
    });
  }

  return {
    ok: true,
    errors: [],
    computed: {
      baseCost,
      pbl2,
      pbl3,
      durationMonths: months,
      marginAtFloor,
      marginAtFirst,
      velocityAtFloor,
      velocityAtFirst,
      // How much room there is to concede before hitting the floor.
      negotiationRoom: pbl3 - pbl2,
      negotiationRoomPct: Math.round(((pbl3 - pbl2) / pbl3) * 10000) / 100,
      advisory,
    },
  };
}

module.exports = { computeLadder, marginPct };
