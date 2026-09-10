// Builds an accurate work list for many projects.
//
// WHY THIS EXISTS. Computing the true next action needs the step evidence,
// which lives across seven registers. Reading seven lists per project would be
// 700 Graph calls for 100 projects, which is slow and will throttle. So we
// read each register ONCE for everybody and index by P-Code in memory: seven
// calls in total, whatever the project count, fired in parallel.
//
// EIGHT STEPS as of 2 September 2026, matching the eight stage pipeline.

const { graph, SITE_ID } = require("./graph");
const { nextAction } = require("./next-action");

async function readAll(list) {
  const rows = [];
  let url = `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$top=999`;
  // Paginate, because $top caps at 999 and a register will pass that one day.
  for (let page = 0; page < 20 && url; page++) {
    const r = await graph("GET", url);
    for (const item of r.value || [])
      rows.push({ id: item.id, ...item.fields });
    const nextLink = r["@odata.nextLink"];
    url = nextLink
      ? nextLink.replace("https://graph.microsoft.com/v1.0", "")
      : null;
  }
  return rows;
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key];
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

function daysSince(iso) {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

const lakh = (paise) => (Number(paise || 0) / 10000000).toFixed(2);

/** Builds the eight step list for one project from already-indexed records. */
function stepsFor(project, idx) {
  const proposals = (idx.proposals.get(project.PCode) || [])
    .slice()
    .sort((a, b) => (Number(b.Version) || 0) - (Number(a.Version) || 0));
  const latest = proposals[0] || null;
  const approval = (idx.approvals.get(project.PCode) || [])[0] || null;
  const acceptance = (idx.acceptance.get(project.PCode) || [])[0] || null;
  const handover = (idx.handover.get(project.PCode) || [])[0] || null;
  const closure = (idx.closure.get(project.PCode) || [])[0] || null;
  const milestones = idx.milestones.get(project.PCode) || [];

  const approved = Boolean(approval && approval.Decision === "Approved");
  const hasLadder = Boolean(latest && latest.PBL3First);
  const wasSent = Boolean(latest && latest.SentToClientAtIso);
  const hasFinal = Boolean(latest && latest.PBL10Final);

  return [
    {
      key: "lead",
      label: "Lead captured",
      done: true,
      at: project.CreatedAtIso,
      detail: project.ProjectName || "",
    },

    {
      key: "approval",
      label: "Approved to pursue",
      done: approved,
      at: approved ? approval.DecisionDateIso : null,
      detail: approval
        ? `${approval.Decision} by ${approval.ApprovedByName || "unnamed"}` +
          `${approval.ObtainedHow ? `, ${approval.ObtainedHow.toLowerCase()}` : ""}`
        : "",
    },

    {
      key: "proposal",
      label: "Proposal and quote ladder",
      done: hasLadder,
      at: hasLadder ? latest.CreatedAtIso : null,
      detail: hasLadder
        ? `Floor ${lakh(latest.PBL2Minimum)}, asking ${lakh(latest.PBL3First)} lakh`
        : "",
    },

    {
      key: "sent",
      label: "Sent to the client",
      done: wasSent,
      at: wasSent ? latest.SentToClientAtIso : null,
      detail: "",
    },

    {
      key: "commercials",
      label: "Final commercials",
      done: hasFinal,
      at: hasFinal ? latest.ModifiedAtIso || latest.CreatedAtIso : null,
      detail: hasFinal
        ? `${lakh(latest.PBL10Final)} lakh at ${latest.MarginPct} per cent, ${latest.GateMarginResult}`
        : "",
    },

    {
      key: "billing",
      label: "Billing started",
      done: Boolean(acceptance),
      at: acceptance ? acceptance.CreatedAtIso : null,
      detail: acceptance
        ? `${acceptance.Mode}, ${lakh(acceptance.WorkOrderValue)} lakh`
        : "",
    },

    {
      key: "handover",
      label: "Handed to delivery",
      done: Boolean(handover),
      at: handover ? handover.HandoverAtIso : null,
      detail: handover
        ? `${handover.DeliveryPool} pool, ${milestones.length} milestones`
        : "",
    },

    {
      key: "closure",
      label: "Closed",
      done: Boolean(closure),
      at: closure ? closure.ClosedAtIso : null,
      detail: closure ? `Settled ${lakh(closure.FNFAmount)} lakh` : "",
    },
  ];
}

/**
 * The work list. Seven reads regardless of project count.
 * Ordered by what has waited longest, since that is what needs attention.
 */
async function workList(options) {
  const opts = options || {};

  const [
    projects,
    proposals,
    approvals,
    acceptance,
    handover,
    milestones,
    closure,
  ] = await Promise.all([
    readAll("ProjectRegister"),
    readAll("ProposalRegister"),
    readAll("QualificationApprovals").catch(() => []),
    readAll("AcceptanceRegister"),
    readAll("HandoverRegister"),
    readAll("BillingMilestones"),
    readAll("ClosureRegister").catch(() => []),
  ]);

  const idx = {
    proposals: indexBy(proposals, "PCode"),
    approvals: indexBy(approvals, "PCode"),
    acceptance: indexBy(acceptance, "PCode"),
    handover: indexBy(handover, "PCode"),
    milestones: indexBy(milestones, "PCode"),
    closure: indexBy(closure, "PCode"),
  };

  const work = projects
    .filter((p) => !opts.ownerEmail || p.OwnerEmail === opts.ownerEmail)
    .map((p) => {
      const steps = stepsFor(p, idx);
      return {
        pcode: p.PCode,
        proposalId: p.ProposalID,
        projectName: p.ProjectName || "",
        customer: p.CustomerID,
        owner: p.OwnerEmail,
        stage: p.Stage || "Lead Identified",
        status: p.Status || "Active",
        daysInStage: daysSince(p.StageEnteredAtIso || p.CreatedAtIso),
        leadDate: p.LeadDate,
        steps,
        stepsDone: steps.filter((s) => s.done).length,
        stepCount: steps.length,
        next: nextAction(steps, p.Status),
      };
    });

  const active = work.filter((w) => w.status === "Active");

  return {
    reads: 7,
    totals: {
      all: work.length,
      active: active.length,
      lost: work.filter((w) => w.status === "Lost").length,
      closed: work.filter((w) => w.status === "Closed").length,
      awaitingAction: active.filter((w) => w.next && !w.next.terminal).length,
    },
    // Longest wait first. That is what a work list is for.
    work: active.sort((a, b) => (b.daysInStage || 0) - (a.daysInStage || 0)),
    all: work,
  };
}

module.exports = { workList, stepsFor };
