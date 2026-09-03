const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID } = require("../lib/graph");
const { allocate } = require("../lib/sequences");
const { refreshStage } = require("../lib/stage-machine");
const { sendProjectClosed } = require("../lib/mail-bd");

const MAY_CLOSE = ["BD", "Accounts", "Admin", "CSO", "COO"];

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

// The four questions. Held as a list here so the form, the validator and the
// stored columns cannot drift apart.
const AAR = [
  ["aarWhatWentWell", "AARWhatWentWell", "What went well"],
  ["aarWhatDidNot", "AARWhatDidNot", "What did not go well"],
  ["aarWhatWeLearned", "AARWhatWeLearned", "What we learned"],
  [
    "aarWhatWeWouldChange",
    "AARWhatWeWouldChange",
    "What we would do differently",
  ],
];

function validate(p) {
  const errors = [];
  if (isBlank(p.pcode))
    errors.push({ field: "pcode", message: "A P-Code is required" });

  // All four answers are required. This is the point of the whole form: a
  // closure that records the paperwork but not the learning is exactly the
  // gap Kushal identified, where a thousand leads went nowhere and nothing
  // says why. Partial answers would recreate it.
  for (const [field, , label] of AAR) {
    if (isBlank(p[field])) {
      errors.push({ field, message: `${label} is required` });
    }
  }

  if (isBlank(p.fnfDate)) {
    errors.push({
      field: "fnfDate",
      message: "The final settlement date is required",
    });
  }

  const lessons = Array.isArray(p.lessons) ? p.lessons : [];
  lessons.forEach((l, i) => {
    if (isBlank(l.lesson)) {
      errors.push({
        field: `lessons[${i}]`,
        message: `Lesson ${i + 1} is empty`,
      });
    }
  });
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
  if (!MAY_CLOSE.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not close a project`,
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

  // A project cannot be closed before it was handed to delivery. Closing
  // something that never started is either a mistake or a Lost project
  // recorded in the wrong place, and the two need different treatment.
  const handover = await findOne(
    "HandoverRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!handover) {
    return fail(
      409,
      "not_handed_over",
      "This project has not been handed to delivery, so it cannot be closed. " +
        "If it did not proceed, record it as Lost instead.",
    );
  }

  const existing = await findOne(
    "ClosureRegister",
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
          closureId: existing.fields.ClosureID,
          message: "This project has already been closed",
        },
      },
    };
  }

  const nowIso = new Date().toISOString();
  const closureId =
    "CLS-" + String(await allocate("closure_serial")).padStart(5, "0");

  const fields = {
    Title: pcode,
    ClosureID: closureId,
    PCode: pcode,
    TF08Reference: p.tf08Reference || "",
    CompletionCertificateLink: p.completionCertificateLink || "",
    FeedbackFormLink: p.feedbackFormLink || "",
    FNFLink: p.fnfLink || "",
    FinalInvoiceNo: p.finalInvoiceNo || "",
    FNFAmount: Number(p.fnfAmount) || 0,
    FNFDateIso: p.fnfDate,
    RemarksByBDTeam: p.remarksByBDTeam || "",
    RemarksByAccounts: p.remarksByAccounts || "",
    ClosedByEmail: caller.email,
    ClosedAtIso: nowIso,
    CreatedByEmail: caller.email,
    CreatedAtIso: nowIso,
  };
  for (const [field, column] of AAR) fields[column] = String(p[field]).trim();

  await graph("POST", `/sites/${SITE_ID}/lists/ClosureRegister/items`, {
    fields,
  });

  // Lessons go to their own register, for the Operations Council to read
  // across projects rather than within one.
  const lessons = Array.isArray(p.lessons) ? p.lessons : [];
  const recorded = [];
  for (const l of lessons) {
    if (isBlank(l.lesson)) continue;
    const lessonId =
      "LSN-" + String(await allocate("lesson_serial")).padStart(5, "0");
    await graph("POST", `/sites/${SITE_ID}/lists/LearningRegister/items`, {
      fields: {
        Title: lessonId,
        LessonID: lessonId,
        PCode: pcode,
        Lesson: String(l.lesson).trim(),
        Category: l.category || "Other",
        OwnerCouncil: "Operations",
        Status: "Open",
        RaisedByEmail: caller.email,
        RaisedAtIso: nowIso,
        CreatedByEmail: caller.email,
        CreatedAtIso: nowIso,
      },
    });
    recorded.push({ lessonId, category: l.category || "Other" });
  }

  // Closed is a terminal status, set deliberately here rather than derived.
  await graph(
    "PATCH",
    `/sites/${SITE_ID}/lists/ProjectRegister/items/${project.id}/fields`,
    { Status: "Closed" },
  );

  const staged = await refreshStage({
    id: project.id,
    ...project.fields,
    Status: "Closed",
  });

  context.log(
    `${pcode} closed by ${caller.email}, closure ${closureId}, ${recorded.length} lessons`,
  );

  const mail = await sendProjectClosed(pcode, caller, {
    fnfAmount: Number(p.fnfAmount) || 0,
    fnfDate: p.fnfDate,
    tf08Reference: p.tf08Reference,
    aarWhatWentWell: p.aarWhatWentWell,
    aarWhatDidNot: p.aarWhatDidNot,
    aarWhatWeLearned: p.aarWhatWeLearned,
    aarWhatWeWouldChange: p.aarWhatWeWouldChange,
    lessonTexts: lessons.filter((l) => l.lesson && l.lesson.trim()),
  });
  if (!mail.sent) context.log(`Closure mail not sent: ${mail.reason}`);

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        pcode,
        closureId,
        lessons: recorded,
        stage: staged.derived,
      },
    },
  };
}

app.http("closeProject", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "closure",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in closeProject:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});
