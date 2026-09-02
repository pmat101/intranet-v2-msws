// Assembles the full state of a project from the registers it is spread
// across, and works out what may happen next.
//
// This is the SIPOC rule made computable: every step's output is the next
// step's trigger, so the system can say what is due rather than waiting to
// be told. Nothing here writes; it reads and reasons.

const { graph, SITE_ID } = require("./graph");
const { nextAction } = require("./next-action");

const STAGES = [
  "Lead Identified",
  "Qualification",
  "Proposal Sent",
  "Negotiation",
  "Won and Onboarded",
  "Delivered and Closed",
];

// What is due at each stage, and which form does it.
const NEXT_ACTION = {
  "Lead Identified": {
    label: "Send for qualification review",
    href: null,
    note: "Qualification is handled offline at present.",
  },
  Qualification: {
    label: "Record the proposal and quote ladder",
    href: "/proposal/new.html",
  },
  "Proposal Sent": {
    label: "Record a negotiation round, or the final commercials",
    href: "/commercials/new.html",
  },
  Negotiation: {
    label: "Record the final commercials",
    href: "/commercials/new.html",
  },
  "Won and Onboarded": {
    label: "Start billing, then file the handover",
    href: "/billing/start.html",
  },
  "Delivered and Closed": {
    label: "File closure and the after action review",
    href: "/closure/new.html",
  },
};

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

/**
 * Reads everything known about one project.
 * Returns the project, what exists at each step, and the next action.
 */
async function projectView(pcode) {
  const [project] = await items(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project) return null;

  const [proposals, acceptance, handover, milestones, ledger] =
    await Promise.all([
      items("ProposalRegister", `fields/PCode eq '${pcode}'`),
      items("AcceptanceRegister", `fields/PCode eq '${pcode}'`),
      items("HandoverRegister", `fields/PCode eq '${pcode}'`),
      items("BillingMilestones", `fields/PCode eq '${pcode}'`),
      items("ExpenseLedger", `fields/PCode eq '${pcode}'`),
    ]);

  // Steps are derived from what exists, not from a status somebody set.
  // A record either exists or it does not, and that cannot drift.
  const latestProposal =
    proposals
      .slice()
      .sort((a, b) => (Number(b.Version) || 0) - (Number(a.Version) || 0))[0] ||
    null;

  const steps = [
    {
      key: "lead",
      label: "Lead captured",
      done: true,
      at: project.CreatedAtIso,
      detail: project.ProjectName || "",
    },
    {
      key: "qualification",
      label: "Qualification",
      done: false,
      detail: "Handled offline at present",
    },
    {
      key: "proposal",
      label: "Proposal and quote ladder",
      done: Boolean(latestProposal && latestProposal.PBL3First),
      at:
        latestProposal && latestProposal.PBL3First
          ? latestProposal.CreatedAtIso
          : null,

      detail:
        latestProposal && latestProposal.PBL3First
          ? `First quote ${(Number(latestProposal.PBL3First) / 10000000).toFixed(2)} lakh`
          : "",
    },
    {
      key: "commercials",
      label: "Final commercials",
      done: Boolean(latestProposal && latestProposal.PBL10Final),
      at: latestProposal ? latestProposal.CreatedAtIso : null,
      detail:
        latestProposal && latestProposal.MarginPct !== undefined
          ? `Margin ${latestProposal.MarginPct} per cent, ${latestProposal.GateMarginResult}`
          : "",
    },
    {
      key: "billing",
      label: "Billing started",
      done: acceptance.length > 0,
      at: acceptance[0] ? acceptance[0].CreatedAtIso : null,
      detail: acceptance[0]
        ? `${acceptance[0].Mode}, ${(Number(acceptance[0].WorkOrderValue) / 10000000).toFixed(2)} lakh`
        : "",
    },
    {
      key: "handover",
      label: "Handed to delivery",
      done: handover.length > 0,
      at: handover[0] ? handover[0].HandoverAtIso : null,
      detail: handover[0]
        ? `${handover[0].DeliveryPool} pool, ${milestones.length} milestones`
        : "",
    },
    { key: "closure", label: "Closed", done: false, detail: "" },
  ];

  const stage = project.Stage || "Lead Identified";
  const next = nextAction(steps, project.Status);

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
    next,
  };
}

/**
 * A list of projects for the dashboard, with just enough to decide what
 * needs attention. Deliberately one read of one list: the board must stay
 * fast as the register grows.
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

module.exports = { projectView, pipelineBoard, STAGES, NEXT_ACTION };
