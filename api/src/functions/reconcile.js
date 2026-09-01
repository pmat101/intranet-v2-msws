const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { reconcile } = require("../lib/reconcile");

// Commercial figures, so this is not for everyone.
const MAY_VIEW = ["Accounts", "Admin", "CSO", "COO", "BD"];

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

function lakh(paise) {
  return (Number(paise || 0) / 10000000).toFixed(2);
}

async function handle(request, context) {
  let caller;
  try {
    caller = await verifyRequest(request);
  } catch (err) {
    return fail(401, err.code, err.message);
  }

  let entry;
  try {
    entry = await resolveRole(caller.email);
  } catch (err) {
    return fail(403, err.code || "role_failed", err.message);
  }
  if (!MAY_VIEW.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not view the ledger`,
    );
  }

  const pcode = String(request.query.get("pcode") || "").trim();
  if (!pcode)
    return fail(400, "validation_failed", "A pcode parameter is required");

  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/ExpenseLedger/items` +
      `?expand=fields&$top=999&$filter=${encodeURIComponent(`fields/PCode eq '${pcode}'`)}`,
  );
  const rows = (r.value || []).map((item) => item.fields);

  const result = reconcile(rows, { now: new Date().toISOString() });

  // Amounts are returned in paise, which is what the API speaks, plus a lakh
  // rendering so a person reading the raw response can see the magnitude
  // without counting zeros.
  return {
    status: 200,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        rowCount: rows.length,
        position: {
          committedPaise: result.committed,
          committedLakh: lakh(result.committed),
          scheduledLakh: lakh(result.scheduled),
          billableLakh: lakh(result.billable),
          invoicedLakh: lakh(result.invoiced),
          receivedLakh: lakh(result.received),
          outstandingLakh: lakh(result.outstanding),
          unbilledLakh: lakh(result.unbilled),
        },
        clean: result.clean,
        findings: result.findings,
      },
    },
  };
}

app.http("reconcileLedger", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ledger/reconcile",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in reconcileLedger:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "The reconciliation could not be completed",
      );
    }
  },
});
