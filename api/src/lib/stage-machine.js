// Derives a project's pipeline stage from the records that exist, and keeps
// the stored Stage field in step with it.
//
// WHY DERIVED RATHER THAN SET. A status somebody has to maintain drifts: it
// is forgotten on a busy day, or a record is fixed in SharePoint by hand and
// nothing updates it. Whether a record exists cannot drift. So the stage is
// computed from evidence, and the stored field is a cache of that computation.
// When the two disagree, the computation wins and the clock is reset.
//
// The stored field still matters, because the days-in-stage clock needs to
// know when a stage was entered, and only a record can say that.

const { graph, SITE_ID } = require("./graph");

const STAGES = [
  "Lead Identified",
  "Qualification",
  "Proposal Sent",
  "Negotiation",
  "Won and Onboarded",
  "Delivered and Closed",
];

/**
 * Works out which stage the evidence supports.
 *
 * Read this downwards: the furthest step with evidence wins. Qualification is
 * absent from the evidence because it is handled offline at present, so a
 * project with a proposal jumps from Lead Identified to Proposal Sent.
 */
function deriveStage(evidence) {
  const e = evidence || {};

  if (e.closure) return "Delivered and Closed";
  if (e.handover || e.acceptance) return "Won and Onboarded";

  // Final commercials agreed means the negotiating is over.
  if (e.finalCommercials) return "Negotiation";

  // A quote has gone out but no final figure is agreed.
  if (e.proposal) return "Proposal Sent";

  return "Lead Identified";
}

/**
 * Reconciles the stored Stage with the derived one.
 * Returns what it found and what it did. Writes only when they differ.
 */
async function syncStage(project, evidence) {
  const stored = project.Stage || "Lead Identified";
  const derived = deriveStage(evidence);

  // A project that is Lost or Closed does not move. Those are terminal
  // states set deliberately, and evidence arriving afterwards must not
  // resurrect them.
  if (project.Status === "Lost" || project.Status === "Closed") {
    return {
      stored,
      derived: stored,
      changed: false,
      reason: "terminal status",
    };
  }

  if (stored === derived) {
    return { stored, derived, changed: false };
  }

  // Never move backwards. If the stored stage is further along than the
  // evidence supports, something was set deliberately and we leave it,
  // rather than silently undoing a person's action.
  if (STAGES.indexOf(derived) < STAGES.indexOf(stored)) {
    return {
      stored,
      derived,
      changed: false,
      reason: "stored stage is further than the evidence; not moved backwards",
    };
  }

  const nowIso = new Date().toISOString();
  await graph(
    "PATCH",
    `/sites/${SITE_ID}/lists/ProjectRegister/items/${project.id}/fields`,
    { Stage: derived, StageEnteredAtIso: nowIso },
  );

  return { stored, derived, changed: true, atIso: nowIso };
}

/** Gathers the evidence for one project in a single pass. */
async function gatherEvidence(pcode) {
  const read = async (list, filter, select) => {
    const q = `?expand=fields&$top=5&$filter=${encodeURIComponent(filter)}`;
    const r = await graph("GET", `/sites/${SITE_ID}/lists/${list}/items${q}`);
    return (r.value || []).map((i) => i.fields);
  };
  const f = `fields/PCode eq '${pcode}'`;

  const [proposals, acceptance, handover, closure] = await Promise.all([
    read("ProposalRegister", f),
    read("AcceptanceRegister", f),
    read("HandoverRegister", f),
    read("ClosureRegister", f).catch(() => []),
  ]);

  return {
    proposal: proposals.some((p) => p.PBL3First || p.PBL10Final),
    finalCommercials: proposals.some((p) => p.PBL10Final),
    acceptance: acceptance.length > 0,
    handover: handover.length > 0,
    closure: closure.length > 0,
  };
}

/** Convenience: gather and sync in one call. Used after every write. */
async function refreshStage(project) {
  const evidence = await gatherEvidence(project.PCode);
  return syncStage(project, evidence);
}

module.exports = {
  deriveStage,
  syncStage,
  gatherEvidence,
  refreshStage,
  STAGES,
};
