// Derives a project's pipeline stage from the records that exist, and keeps
// the stored Stage field in step with it.
//
// WHY DERIVED RATHER THAN SET. A status somebody has to maintain drifts: it is
// forgotten on a busy day, or a record is fixed in SharePoint by hand and
// nothing updates it. Whether a record exists cannot drift. So the stage is
// computed from evidence, and the stored field is a cache of that computation.
// When the two disagree, the computation wins and the clock is reset.
//
// EIGHT STAGES as of 2 September 2026. This resolves the discrepancy between
// PG/IMS/BP-002, which mentions an eight stage funnel, and T3-NOTE-001, which
// specifies six. Proposal Under Preparation and Proposal Under Review were
// added to reflect what actually happens between approval and despatch.

const { graph, SITE_ID } = require("./graph");

const STAGES = [
  "Lead Identified",
  "Qualification",
  "Proposal Under Preparation",
  "Proposal Under Review",
  "Proposal Sent",
  "Negotiation",
  "Won and Onboarded",
  "Delivered and Closed",
];

/**
 * Which stage the evidence supports. Read downwards: the furthest step with
 * evidence wins.
 *
 * The two new stages sit either side of the quote ladder. Approval recorded
 * but no ladder means the proposal is being written; a ladder recorded but not
 * yet sent means it is being reviewed internally. That boundary is BD01B.
 */
function deriveStage(evidence) {
  const e = evidence || {};

  if (e.closure) return "Delivered and Closed";
  if (e.handover || e.acceptance) return "Won and Onboarded";
  if (e.finalCommercials) return "Negotiation";
  if (e.sentToClient) return "Proposal Sent";

  // The quote exists but has not gone out: it is under internal review.
  if (e.proposal) return "Proposal Under Review";

  // Approved to pursue, but no quote yet: the proposal is being prepared.
  if (e.approved) return "Proposal Under Preparation";

  // A review has been asked for but not answered.
  if (e.qualificationRequested) return "Qualification";

  return "Lead Identified";
}

class StageError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Decides what should happen, without writing. Both syncStage and the backfill
 * dry run call this, so a dry run cannot disagree with the real thing.
 *
 * allowBackwards exists for one situation only: a stage has been renamed or
 * its meaning changed, so a stored value set under the old rule is an artefact
 * rather than a decision. Never use it in normal operation.
 */
function planStage(project, evidence, opts) {
  const options = opts || {};
  const stored = project.Stage || "Lead Identified";
  const derived = deriveStage(evidence);

  if (project.Status === "Lost" || project.Status === "Closed") {
    return {
      stored,
      derived: stored,
      change: false,
      reason: "terminal status",
    };
  }
  if (stored === derived) {
    return { stored, derived, change: false };
  }
  if (
    STAGES.indexOf(derived) < STAGES.indexOf(stored) &&
    !options.allowBackwards
  ) {
    return {
      stored,
      derived,
      change: false,
      reason: "stored stage is further than the evidence; not moved backwards",
    };
  }
  return { stored, derived, change: true };
}

async function syncStage(project, evidence, opts) {
  const plan = planStage(project, evidence, opts);
  if (!plan.change) {
    return { ...plan, changed: false };
  }

  const nowIso = new Date().toISOString();
  await graph(
    "PATCH",
    `/sites/${SITE_ID}/lists/ProjectRegister/items/${project.id}/fields`,
    { Stage: plan.derived, StageEnteredAtIso: nowIso },
  );
  return { ...plan, changed: true, atIso: nowIso };
}

async function gatherEvidence(pcode) {
  const read = async (list, filter) => {
    const q = `?expand=fields&$top=5&$filter=${encodeURIComponent(filter)}`;
    const r = await graph("GET", `/sites/${SITE_ID}/lists/${list}/items${q}`);
    return (r.value || []).map((i) => i.fields);
  };
  const f = `fields/PCode eq '${pcode}'`;

  const [proposals, approvals, acceptance, handover, closure] =
    await Promise.all([
      read("ProposalRegister", f),
      read("QualificationApprovals", f).catch(() => []),
      read("AcceptanceRegister", f),
      read("HandoverRegister", f),
      read("ClosureRegister", f).catch(() => []),
    ]);

  return {
    qualificationRequested: approvals.length > 0,
    approved: approvals.some((a) => a.Decision === "Approved"),
    proposal: proposals.some((p) => p.PBL3First),
    sentToClient: proposals.some((p) => p.SentToClientAtIso),
    finalCommercials: proposals.some((p) => p.PBL10Final),
    acceptance: acceptance.length > 0,
    handover: handover.length > 0,
    closure: closure.length > 0,
  };
}

async function refreshStage(project) {
  const evidence = await gatherEvidence(project.PCode);
  return syncStage(project, evidence);
}

module.exports = {
  deriveStage,
  planStage,
  syncStage,
  gatherEvidence,
  refreshStage,
  STAGES,
  StageError,
};
