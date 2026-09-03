const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");
const { sendHandoverFiled } = require("../lib/mail-bd");

const MAY_SUBMIT = ["BD", "TeamHead", "Admin", "CSO", "COO"];

const POOLS = [
  "Fountain",
  "Ocean",
  "Pond",
  "Pool",
  "Reservoir",
  "Spring",
  "Tributary",
];

function fail(status, code, message, errors) {
  return { status, jsonBody: { ok: false, error: { code, message, errors } } };
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

async function findOne(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value && r.value[0]) || null;
}

function validate(p) {
  const errors = [];
  if (isBlank(p.pcode))
    errors.push({ field: "pcode", message: "A P-Code is required" });

  if (isBlank(p.deliveryPool)) {
    errors.push({
      field: "deliveryPool",
      message: "A delivery pool is required",
    });
  } else if (!POOLS.includes(p.deliveryPool)) {
    errors.push({
      field: "deliveryPool",
      message: `Delivery pool must be one of ${POOLS.join(", ")}`,
    });
  }

  if (isBlank(p.teamHeadEmail)) {
    errors.push({
      field: "teamHeadEmail",
      message: "The team head email is required",
    });
  }
  if (isBlank(p.cSuiteOfficerEmail)) {
    errors.push({
      field: "cSuiteOfficerEmail",
      message: "The C-suite officer email is required",
    });
  }
  if (isBlank(p.scopeOfWork)) {
    errors.push({
      field: "scopeOfWork",
      message: "The scope of work is required",
    });
  }
  if (isBlank(p.category)) {
    errors.push({ field: "category", message: "Category is required" });
  }
  if (isBlank(p.nabetSector)) {
    errors.push({
      field: "nabetSector",
      message: "The NABET sector is required",
    });
  }
  if (isBlank(p.baselineSeason)) {
    errors.push({
      field: "baselineSeason",
      message: "The baseline season is required",
    });
  }
  if (isBlank(p.eacName)) {
    errors.push({ field: "eacName", message: "The EAC name is required" });
  }

  // Milestones are how Accounts knows what to bill and when, and they are what
  // the reconciliation compares against the work order. A handover without
  // them leaves Accounts guessing, so at least one is required.
  const milestones = Array.isArray(p.milestones) ? p.milestones : [];
  if (milestones.length === 0) {
    errors.push({
      field: "milestones",
      message: "At least one billing milestone is required",
    });
  }
  milestones.forEach((m, i) => {
    if (isBlank(m.name)) {
      errors.push({
        field: `milestones[${i}].name`,
        message: `Milestone ${i + 1} needs a name`,
      });
    }
    const pct = Number(m.percent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      errors.push({
        field: `milestones[${i}].percent`,
        message: `Milestone ${i + 1} needs a percentage between 1 and 100`,
      });
    }
  });

  // The percentages must account for the whole contract. A schedule summing to
  // 90 per cent means ten per cent will never be billed, and nobody notices
  // until the project closes short.
  if (milestones.length > 0) {
    const total = milestones.reduce((t, m) => t + (Number(m.percent) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      errors.push({
        field: "milestones",
        message: `Milestone percentages total ${total}, and must total 100`,
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
      `Role ${entry.role} may not file a handover`,
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

  // Billing must be started first, because the milestone amounts are
  // percentages of the work order value. Without it there is nothing to
  // take a percentage of.
  const acceptance = await findOne(
    "AcceptanceRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!acceptance) {
    return fail(
      409,
      "billing_not_started",
      "Billing must be started for this project before the handover is filed, " +
        "because milestone amounts are a percentage of the work order value",
    );
  }
  const workOrderValue = Number(acceptance.fields.WorkOrderValue) || 0;

  const existing = await findOne(
    "HandoverRegister",
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
          handoverId: existing.fields.HandoverID,
          message: "A handover has already been filed for this project",
        },
      },
    };
  }

  const nowIso = new Date().toISOString();
  const handoverId =
    "HND-" + String(await allocate("handover_serial")).padStart(5, "0");

  await graph("POST", `/sites/${SITE_ID}/lists/HandoverRegister/items`, {
    fields: {
      Title: pcode,
      HandoverID: handoverId,
      PCode: pcode,
      DeliveryPool: p.deliveryPool,
      TeamHeadName: p.teamHeadName || "",
      TeamHeadEmail: p.teamHeadEmail,
      CSuiteOfficerName: p.cSuiteOfficerName || "",
      CSuiteOfficerEmail: p.cSuiteOfficerEmail,
      EIACoordinatorName: p.eiaCoordinatorName || "",
      EIACoordinatorEmail: p.eiaCoordinatorEmail || "",
      ScopeOfWork: p.scopeOfWork,
      Category: p.category,
      CategoryOtherSpecify: p.categoryOtherSpecify || "",
      NABETSector: p.nabetSector,
      BaselineSeason: p.baselineSeason,
      BaselineSeasonOtherSpecify: p.baselineSeasonOtherSpecify || "",
      EACName: p.eacName,
      EACNameOtherSpecify: p.eacNameOtherSpecify || "",
      PreviousECAndConsents: p.previousECAndConsents || "",
      GeneralConditionsApplicability: p.generalConditionsApplicability || "",
      ProjectStartDate: p.projectStartDate || null,
      GanttChartLink: p.ganttChartLink || "",
      TimelineBaselineUrl: p.timelineBaselineUrl || "",
      TagSet: p.tagSet || "",
      RelevantDocumentsUrl: p.relevantDocumentsUrl || "",
      TermsAndConditions: p.termsAndConditions || "",
      TravellingBorneBy: p.travellingBorneBy || "",
      TravellingBorneByOtherSpecify: p.travellingBorneByOtherSpecify || "",
      OverheadExpensesBorneBy: p.overheadExpensesBorneBy || "",
      CurrentStatus: "Handed over",
      DateOfUpdatingIso: nowIso,
      HandoverAtIso: nowIso,
      Remarks: p.remarks || "",
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  // Other persons, if any.
  const persons = Array.isArray(p.otherPersons) ? p.otherPersons : [];
  for (const person of persons) {
    if (isBlank(person.name) && isBlank(person.email)) continue;
    await graph("POST", `/sites/${SITE_ID}/lists/HandoverPersons/items`, {
      fields: {
        Title: person.name || person.email,
        PCode: pcode,
        HandoverID: handoverId,
        PersonName: person.name || "",
        PersonEmail: person.email || "",
        Purpose: person.purpose || "",
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });
  }

  // Milestones, and the BD-Milestone side of the ledger alongside them.
  // Rounding: the last milestone takes the remainder, so the schedule sums to
  // the work order value exactly rather than being a rupee or two short.
  const milestones = p.milestones;
  let allocated = 0;
  const seeded = [];

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    const isLast = i === milestones.length - 1;
    const amount = isLast
      ? workOrderValue - allocated
      : Math.round((workOrderValue * Number(m.percent)) / 100);
    allocated += amount;

    const termId =
      "TRM-" + String(await allocate("term_serial")).padStart(6, "0");

    await graph("POST", `/sites/${SITE_ID}/lists/BillingMilestones/items`, {
      fields: {
        Title: `${pcode} ${m.name}`,
        TermID: termId,
        PCode: pcode,
        MilestoneName: m.name,
        MilestoneDetails: m.details || "",
        Sequence: i + 1,
        Percent: Number(m.percent),
        Timeline: m.timeline || "",
        PlannedDateIso: m.plannedDate || "",
        InvoiceAmount: amount,
        Status: "Planned",
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });

    const entryId =
      "LED-" + String(await allocate("ledger_serial")).padStart(6, "0");
    await graph("POST", `/sites/${SITE_ID}/lists/ExpenseLedger/items`, {
      fields: {
        Title: entryId,
        EntryID: entryId,
        PCode: pcode,
        Source: "BD-Milestone",
        EntryType: "Expected",
        Amount: amount,
        MilestoneRef: termId,
        Notes: `${m.name}, ${m.percent} per cent of the work order`,
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });

    seeded.push({ termId, name: m.name, percent: Number(m.percent), amount });
  }

  context.log(
    `Handover ${handoverId} filed for ${pcode} by ${caller.email}, pool ${p.deliveryPool}`,
  );

  // The stage is derived from what exists, so refresh it now this record does.
  const staged = await refreshStage(project);
  if (staged.changed) {
    context.log(`${pcode} moved ${staged.stored} to ${staged.derived}`);
  }

  const mail = await sendHandoverFiled(pcode, caller, {
    deliveryPool: p.deliveryPool,
    projectName: project.fields.ProjectName || "",
    teamHeadEmail: p.teamHeadEmail,
    cSuiteOfficerEmail: p.cSuiteOfficerEmail,
    eiaCoordinatorEmail: p.eiaCoordinatorEmail,
    scopeOfWork: p.scopeOfWork,
    category: p.category,
    nabetSector: p.nabetSector,
    baselineSeason: p.baselineSeason,
    eacName: p.eacName,
    projectStartDate: p.projectStartDate,
    workOrderValue,
    milestones: seeded,
  });
  if (!mail.sent) context.log(`Handover mail not sent: ${mail.reason}`);

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        handoverId,
        deliveryPool: p.deliveryPool,
        workOrderValue,
        milestones: seeded,
        otherPersons: persons.length,
      },
    },
  };
}

app.http("fileHandover", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "handover",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in fileHandover:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
