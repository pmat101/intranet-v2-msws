const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");

const MAY_VIEW = ["BD", "TeamHead", "Accounts", "Admin", "CSO", "COO", "MIS"];

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

function guard(name, work) {
  return async (request, context) => {
    let caller, entry;
    try {
      caller = await verifyRequest(request);
      entry = await resolveRole(caller.email);
    } catch (err) {
      return fail(
        err.code === "no_role" ? 403 : 401,
        err.code || "auth_failed",
        err.message,
      );
    }
    if (!MAY_VIEW.includes(entry.role)) {
      return fail(
        403,
        "not_permitted",
        `Role ${entry.role} may not view the pipeline`,
      );
    }
    try {
      return await work(request, context, { caller, entry });
    } catch (err) {
      context.log(`UNHANDLED in ${name}:`, err.stack || String(err));
      return fail(500, "unexpected", "The request could not be completed");
    }
  };
}

async function items(list, filter) {
  const q = filter ? `&$filter=${encodeURIComponent(filter)}` : "";
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$top=999${q}`,
  );
  return (r.value || []).map((i) => i.fields);
}

const lakh = (paise) => (Number(paise || 0) / 10000000).toFixed(2);

function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/**
 * Lost projects, with why.
 *
 * Grouped counts by reason and by stage are returned alongside the list,
 * because "why do we lose" and "where in the funnel do we lose" are the two
 * questions the Tier 3 note says cannot currently be answered, and both are
 * counting questions rather than reading questions.
 */
app.http("lostProjects", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/lost",
  handler: guard("lostProjects", async () => {
    const [projects, winloss] = await Promise.all([
      items("ProjectRegister", "fields/Status eq 'Lost'"),
      items("WinLossRegister", "fields/Outcome eq 'Lost'"),
    ]);

    const byPcode = new Map(winloss.map((w) => [w.PCode, w]));

    const rows = projects
      .map((p) => {
        const w = byPcode.get(p.PCode) || {};
        return {
          pcode: p.PCode,
          projectName: p.ProjectName || "",
          customer: p.CustomerID,
          owner: p.OwnerEmail,
          stageAtOutcome: w.StageAtOutcome || p.Stage || "",
          reasonCategory: w.ReasonCategory || "",
          reason: w.Reason || p.LostReason || "",
          competitor: w.CompetitorName || "",
          quotedLakh: lakh(w.QuotedValue),
          marginPct: w.MarginPct === undefined ? null : Number(w.MarginPct),
          costIncurredLakh: lakh(w.CostIncurred),
          lostOn: shortDate(w.DecidedAtIso || p.LostDate),
        };
      })
      .sort((a, b) => String(b.lostOn).localeCompare(String(a.lostOn)));

    const tally = (key) => {
      const counts = {};
      for (const r of rows) {
        const k = r[key] || "Unrecorded";
        counts[k] = (counts[k] || 0) + 1;
      }
      return counts;
    };

    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          count: rows.length,
          valueLostLakh: rows
            .reduce((t, r) => t + Number(r.quotedLakh || 0), 0)
            .toFixed(2),
          byReason: tally("reasonCategory"),
          byStage: tally("stageAtOutcome"),
          rows,
        },
      },
    };
  }),
});

/** Closed projects, with what they settled at and whether a lesson was left. */
app.http("closedProjects", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "pipeline/closed",
  handler: guard("closedProjects", async () => {
    const [projects, closures, lessons] = await Promise.all([
      items("ProjectRegister", "fields/Status eq 'Closed'"),
      items("ClosureRegister"),
      items("LearningRegister"),
    ]);

    const byPcode = new Map(closures.map((c) => [c.PCode, c]));
    const lessonCount = {};
    for (const l of lessons) {
      lessonCount[l.PCode] = (lessonCount[l.PCode] || 0) + 1;
    }

    const rows = projects
      .map((p) => {
        const c = byPcode.get(p.PCode) || {};
        return {
          pcode: p.PCode,
          projectName: p.ProjectName || "",
          customer: p.CustomerID,
          owner: p.OwnerEmail,
          settledLakh: lakh(c.FNFAmount),
          settledOn: shortDate(c.FNFDateIso),
          closedOn: shortDate(c.ClosedAtIso),
          closedBy: c.ClosedByEmail || "",
          lessons: lessonCount[p.PCode] || 0,
          hasCertificate: Boolean(c.CompletionCertificateLink),
        };
      })
      .sort((a, b) => String(b.closedOn).localeCompare(String(a.closedOn)));

    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          count: rows.length,
          settledLakh: rows
            .reduce((t, r) => t + Number(r.settledLakh || 0), 0)
            .toFixed(2),
          totalLessons: rows.reduce((t, r) => t + r.lessons, 0),
          rows,
        },
      },
    };
  }),
});
