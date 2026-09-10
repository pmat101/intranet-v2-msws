// Assembles the full state of a project from the registers it is spread
// across, and works out what may happen next.
//
// This is the SIPOC rule made computable: every step's output is the next
// step's trigger, so the system can say what is due rather than waiting to
// be told. Nothing here writes; it reads and reasons.
//
// EIGHT STAGES as of 2 September 2026.

const { graph, SITE_ID } = require("./graph");
const { nextAction } = require("./next-action");
const { stepsFor } = require("./work-list");

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

async function items(list, filter, top) {
  const q = filter ? `&$filter=${encodeURIComponent(filter)}` : "";
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$top=${top || 999}${q}`,
  );
  return (r.value || []).map((i) => ({ id: i.id, ...i.fields }));
}

function daysSince(iso) {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

/** Turns a flat list into the shape stepsFor expects. */
function asIndex(rows) {
  const map = new Map();
  for (const row of rows) {
    const k = row.PCode;
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

/**
 * Reads everything known about one project.
 *
 * The step list is built by the same stepsFor used for the work list, so a
 * project cannot show one thing on the board and another on its own page.
 * That duplication caused a real inconsistency before it was unified.
 */
async function projectView(pcode) {
  const [project] = await items(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project) return null;

  const f = `fields/PCode eq '${pcode}'`;
  const [
    proposals,
    approvals,
    acceptance,
    handover,
    milestones,
    closure,
    ledger,
  ] = await Promise.all([
    items("ProposalRegister", f),
    items("QualificationApprovals", f).catch(() => []),
    items("AcceptanceRegister", f),
    items("HandoverRegister", f),
    items("BillingMilestones", f),
    items("ClosureRegister", f).catch(() => []),
    items("ExpenseLedger", f),
  ]);

  const steps = stepsFor(project, {
    proposals: asIndex(proposals),
    approvals: asIndex(approvals),
    acceptance: asIndex(acceptance),
    handover: asIndex(handover),
    milestones: asIndex(milestones),
    closure: asIndex(closure),
  });

  const stage = project.Stage || "Lead Identified";

  return {
    pcode: project.PCode,
    proposalId: project.ProposalID,
    projectName: project.ProjectName || "",
    customer: project.CustomerID,
    group: project.GroupID,
    owner: project.OwnerEmail,
    stage,
    stageIndex: STAGES.indexOf(stage),
    stages: STAGES,
    status: project.Status,
    daysInStage: daysSince(project.StageEnteredAtIso || project.CreatedAtIso),
    leadDate: project.LeadDate,
    steps,
    counts: {
      proposals: proposals.length,
      milestones: milestones.length,
      ledgerRows: ledger.length,
    },
    next: nextAction(steps, project.Status),
  };
}

/**
 * A list of projects for the board, with just enough to decide what needs
 * attention. Deliberately one read of one list: the board must stay fast as
 * the register grows, and it does not need step detail.
 */
async function pipelineBoard(options) {
  const opts = options || {};
  const rows = await items("ProjectRegister", null, 999);

  const projects = rows
    .filter((r) => !opts.ownerEmail || r.OwnerEmail === opts.ownerEmail)
    .map((r) => ({
      pcode: r.PCode,
      projectName: r.ProjectName || "",
      customer: r.CustomerID,
      owner: r.OwnerEmail,
      stage: r.Stage || "Lead Identified",
      status: r.Status || "Active",
      daysInStage: daysSince(r.StageEnteredAtIso || r.CreatedAtIso),
      leadDate: r.LeadDate,
    }))
    .sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0));

  const byStage = {};
  for (const s of STAGES) byStage[s] = [];
  for (const p of projects) {
    if (p.status === "Lost" || p.status === "Closed") continue;
    (byStage[p.stage] = byStage[p.stage] || []).push(p);
  }

  return {
    stages: STAGES,
    byStage,
    totals: {
      active: projects.filter((p) => p.status === "Active").length,
      lost: projects.filter((p) => p.status === "Lost").length,
      closed: projects.filter((p) => p.status === "Closed").length,
      all: projects.length,
    },
    projects,
  };
}

module.exports = { projectView, pipelineBoard, STAGES };
