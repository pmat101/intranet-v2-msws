const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");

const MAY_SUBMIT = ["BD", "Accounts", "Admin", "CSO", "COO"];

function fail(status, code, message, errors) {
  return { status, jsonBody: { ok: false, error: { code, message, errors } } };
}

async function findOne(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value && r.value[0]) || null;
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

function validate(p) {
  const errors = [];
  if (isBlank(p.pcode))
    errors.push({ field: "pcode", message: "A P-Code is required" });
  if (isBlank(p.mode))
    errors.push({
      field: "mode",
      message: "How the client accepted is required",
    });
  if (isBlank(p.acceptanceDate))
    errors.push({
      field: "acceptanceDate",
      message: "The acceptance date is required",
    });

  const value = Number(p.workOrderValue);
  if (!Number.isFinite(value) || value <= 0) {
    errors.push({
      field: "workOrderValue",
      message: "The work order value is required",
    });
  }

  // A work order or sales order number is what Accounts bills against, so one
  // of the two must exist. Verbal acceptance is allowed, but then the reference
  // is mandatory, because "verbal, no reference" is not a record of anything.
  if (isBlank(p.woNumber) && isBlank(p.soNumber) && isBlank(p.referenceNo)) {
    errors.push({
      field: "woNumber",
      message:
        "A work order number, sales order number or reference is required",
    });
  }

  // A tax number is required when its flag says one exists. Mirrors the live form.
  for (const [flag, num, label] of [
    ["gstAvailable", "gstNumber", "GST number"],
    ["panAvailable", "panNumber", "PAN number"],
    ["tanAvailable", "tanNumber", "TAN number"],
  ]) {
    if (p[flag] === true && isBlank(p[num])) {
      errors.push({
        field: num,
        message: `${label} is required when you say one is available`,
      });
    }
  }
  return errors;
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
  if (!MAY_SUBMIT.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not start billing`,
    );
  }

  let p;
  try {
    p = await request.json();
  } catch {
    return fail(400, "bad_json", "The request body was not valid JSON");
  }

  const errors = validate(p);
  if (errors.length) {
    return fail(
      400,
      "validation_failed",
      "Please correct the highlighted fields",
      errors,
    );
  }

  const pcode = String(p.pcode).trim();
  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project)
    return fail(404, "no_such_project", `No project found for ${pcode}`);

  // One acceptance per project. A second attempt returns the existing record
  // rather than creating a duplicate commitment, which would corrupt every
  // reconciliation afterwards.
  const existing = await findOne(
    "AcceptanceRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (existing) {
    return {
      status: 200,
      jsonBody: {
        ok: true,
        data: {
          pcode,
          duplicate: true,
          message: "Billing has already been started for this project",
        },
      },
    };
  }

  const nowIso = new Date().toISOString();
  const workOrderValue = Number(p.workOrderValue);

  await graph("POST", `/sites/${SITE_ID}/lists/AcceptanceRegister/items`, {
    fields: {
      Title: pcode,
      PCode: pcode,
      Mode: p.mode,
      ReferenceNo: p.referenceNo || "",
      WONumber: p.woNumber || "",
      SONumber: p.soNumber || "",
      AcceptanceDateIso: p.acceptanceDate,
      WorkOrderValue: workOrderValue,
      WorkOrderValidity: p.workOrderValidity || "",
      WorkOrderLink: p.workOrderLink || "",
      SalesOrderLink: p.salesOrderLink || "",
      GSTAvailable: p.gstAvailable === true,
      GSTNumber: p.gstNumber || "",
      PANAvailable: p.panAvailable === true,
      PANNumber: p.panNumber || "",
      TANAvailable: p.tanAvailable === true,
      TANNumber: p.tanNumber || "",
      GSTTreatment: p.gstTreatment || "",
      PaymentTerms: p.paymentTerms || "",
      Remarks: p.remarks || "",
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  // The commitment side of the ledger. One row, the total the client agreed to.
  const entryId =
    "LED-" + String(await allocate("ledger_serial")).padStart(6, "0");
  await graph("POST", `/sites/${SITE_ID}/lists/ExpenseLedger/items`, {
    fields: {
      Title: entryId,
      EntryID: entryId,
      PCode: pcode,
      Source: "BD-WorkOrder",
      EntryType: "Commitment",
      Amount: workOrderValue,
      InvoiceDateIso: p.acceptanceDate,
      Notes:
        `Work order value at billing start. ${p.woNumber || p.soNumber || p.referenceNo || ""}`.trim(),
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  context.log(
    `Billing started for ${pcode} by ${caller.email}, value ${workOrderValue} paise`,
  );

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: { pcode, workOrderValue, ledgerEntryId: entryId },
    },
  };
}

app.http("startBilling", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "billing/start",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in startBilling:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
