const { graph, SITE_ID } = require("./graph");

const LIST = "Sequences";
const MAX_ATTEMPTS = 8;

// Diagnostic only: how often the optimistic guard actually caught a conflict.
let conflicts = 0;
function conflictCount() {
  return conflicts;
}

// Diagnostic only: how often the optimistic guard actually caught a conflict.
let conflicts = 0;
function conflictCount() {
  return conflicts;
}

/**
 * Allocates the next value of a named sequence and advances it.
 *
 * Concurrency is handled optimistically. We read the row with its ETag,
 * then write back with If-Match. If another request advanced the counter
 * in between, SharePoint answers 412 and we start again. This is what
 * replaces the legacy LockService, which SharePoint has no equivalent of.
 *
 * Getting this wrong means two projects sharing a P-Code, which cannot be
 * repaired afterwards, so the retry loop is deliberate and the guard against
 * a counter moving backwards is deliberate.
 */
async function allocate(sequenceKey) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const found = await graph(
      "GET",
      `/sites/${SITE_ID}/lists/${LIST}/items` +
        `?expand=fields&$filter=fields/SequenceKey eq '${sequenceKey}'`,
    );

    if (!found.value || found.value.length === 0) {
      throw new Error(
        `Sequence "${sequenceKey}" does not exist in the Sequences list`,
      );
    }
    if (found.value.length > 1) {
      throw new Error(
        `Sequence "${sequenceKey}" has ${found.value.length} rows; it must have exactly one`,
      );
    }

    const item = found.value[0];
    const current = Number(item.fields.NextValue);

    if (!Number.isInteger(current)) {
      throw new Error(
        `Sequence "${sequenceKey}" holds a non-integer value: ${item.fields.NextValue}`,
      );
    }

    const etag = (item["@odata.etag"] || "").replace(/^W\//, "");
    if (!etag) {
      throw new Error(
        "Sequence row returned no ETag, so a safe update is not possible",
      );
    }

    try {
      await graph(
        "PATCH",
        `/sites/${SITE_ID}/lists/${LIST}/items/${item.id}/fields`,
        { NextValue: current + 1 },
        { "If-Match": etag },
      );
      return current;
    } catch (err) {
      if (String(err.message).includes("412")) {
        conflicts++;
        conflicts++;
        // Someone else advanced the counter. Wait a moment and try again.
        await new Promise((r) => setTimeout(r, 40 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    `Could not allocate from "${sequenceKey}" after ${MAX_ATTEMPTS} attempts`,
  );
}

module.exports = { allocate, conflictCount };
