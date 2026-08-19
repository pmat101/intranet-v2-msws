function submitWPF01(payload) {
  const db = getDB();
  const now = new Date();
  const createdBy = Session.getActiveUser().getEmail() || "";
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateWPF01Server(payload);

  writeWPF01Main(db, payload, submissionId, createdBy, now);
  writeWPF01Lines(db, payload, submissionId, createdBy, now);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "WPF01",
    pcode: firstPcodeFromWPF(payload),
    createdBy: createdBy,
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "WPF01",
    createdBy: createdBy,
    now: now,
    payload: payload,
  });

  sendWPF01Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateWPF01Server(payload) {
  if (!payload.week_start) throw new Error("Week Start Date is missing.");
  if (!payload.week_end) throw new Error("Week End Date is missing.");
  if (!payload.team_name) throw new Error("Team Name is missing.");
  if (!payload.tf_filled) throw new Error("TFs filled this week is missing.");

  if (
    !Array.isArray(payload.weekly_team_info) ||
    payload.weekly_team_info.length === 0
  ) {
    throw new Error("Weekly Team Work Info must contain at least one row.");
  }

  if (
    !Array.isArray(payload.weekly_team_details) ||
    payload.weekly_team_details.length === 0
  ) {
    throw new Error("Weekly Team Work Details must contain at least one row.");
  }

  if (
    payload.tf_filled === "yes" &&
    (!Array.isArray(payload.tf_details) || payload.tf_details.length === 0)
  ) {
    throw new Error("TF rows are required when TFs filled this week is YES.");
  }

  if (
    payload.milestone_achieved === "yes" &&
    (!Array.isArray(payload.milestone_details) ||
      payload.milestone_details.length === 0)
  ) {
    throw new Error(
      "Milestone rows are required when Milestone achieved this week is YES.",
    );
  }

  validateRosterHoursServer(payload);
}

function validateRosterHoursServer(payload) {
  const roster = payload.weekly_team_info || [];
  const workRows = payload.weekly_team_details || [];

  const expectedByMember = {};
  roster.forEach(function (m) {
    if (!m.member_key) return;
    expectedByMember[m.member_key] = (parseFloat(m.working_days) || 0) * 8;
  });

  const actualByMember = {};
  workRows.forEach(function (r) {
    if (!r.member_key) return;
    actualByMember[r.member_key] =
      (actualByMember[r.member_key] || 0) + (parseFloat(r.time_spent) || 0);
  });

  const errors = [];
  Object.keys(expectedByMember).forEach(function (key) {
    const expected = Number(expectedByMember[key].toFixed(2));
    const actual = Number((actualByMember[key] || 0).toFixed(2));

    if (Math.abs(expected - actual) > 0.01) {
      const member = roster.find(function (r) {
        return r.member_key === key;
      });

      errors.push(
        (member?.name || "Member") +
          ": expected " +
          expected +
          " hours, got " +
          actual +
          " hours",
      );
    }
  });

  if (errors.length) {
    throw new Error(
      "Roster hours do not match work-detail hours:\n\n" + errors.join("\n"),
    );
  }
}

function writeWPF01Main(db, payload, submissionId, createdBy, now) {
  const sheet = db.getSheetByName("WPF01_main");
  if (!sheet) throw new Error("Missing sheet: WPF01_main");

  appendObjectRow(
    sheet,
    {
      week_start: payload.week_start || "",
      week_end: payload.week_end || "",
      team_name: payload.team_name || "",
      tf_filled: payload.tf_filled || "",
      milestone_achieved: payload.milestone_achieved || "",
      number_of_active_projects: payload.number_of_active_projects || "",
      targets_planned_this_week: payload.targets_planned_this_week || "",
      targets_achieved_this_week: payload.targets_achieved_this_week || "",
      highlights: payload.highlights || "",
      low_points_complaints: payload.low_points_complaints || "",
      challenges_faced: payload.challenges_faced || "",
      internal_bottlenecks: payload.internal_bottlenecks || "",
      external_bottlenecks: payload.external_bottlenecks || "",
      projected_targets_next_week: payload.projected_targets_next_week || "",
      total_working_hours: payload.total_working_hours || "",
    },
    {
      submissionId: submissionId,
      createdBy: createdBy,
      now: now,
    },
  );
}

function writeWPF01Lines(db, payload, submissionId, createdBy, now) {
  appendRowsFromArray(
    db.getSheetByName("WPF01_tf_details"),
    payload.tf_details || [],
    {
      submissionId: submissionId,
      createdBy: createdBy,
      now: now,
    },
  );

  appendRowsFromArray(
    db.getSheetByName("WPF01_milestone_details"),
    payload.milestone_details || [],
    {
      submissionId: submissionId,
      createdBy: createdBy,
      now: now,
    },
  );

  appendRowsFromArray(
    db.getSheetByName("WPF01_weekly_team_info"),
    payload.weekly_team_info || [],
    {
      submissionId: submissionId,
      createdBy: createdBy,
      now: now,
    },
  );

  appendRowsFromArray(
    db.getSheetByName("WPF01_weekly_team_details"),
    payload.weekly_team_details || [],
    {
      submissionId: submissionId,
      createdBy: createdBy,
      now: now,
    },
  );
}

function appendRowsFromArray(sheet, rows, meta) {
  if (!sheet || !rows.length) return;

  rows.forEach(function (obj, index) {
    appendObjectRow(sheet, obj, {
      submissionId: meta.submissionId,
      createdBy: meta.createdBy,
      now: meta.now,
      rowNo: index + 1,
    });
  });
}

function appendObjectRow(sheet, obj, meta) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(function (header) {
    const key = String(header || "").trim();

    if (!key) return "";
    if (key === "submission_id")
      return meta.submissionId || obj.submission_id || "";
    if (key === "created_at" || key === "timestamp")
      return meta.now || new Date();
    if (key === "created_by") return meta.createdBy || "";
    if (key === "row_no") return meta.rowNo || "";

    const value = obj[key];
    return value === undefined || value === null ? "" : value;
  });

  sheet.appendRow(row);
}

function appendSubmissionLedger(db, meta) {
  const sheet = db.getSheetByName("submissions");
  if (!sheet) throw new Error("Missing sheet: submissions");

  sheet.appendRow([
    meta.submissionId,
    meta.formCode,
    meta.pcode || "",
    meta.createdBy,
    meta.now,
    "submitted",
    JSON.stringify(meta.payload),
    "",
  ]);
}

function appendAuditLog(db, meta) {
  const sheet = db.getSheetByName("audit_log");
  if (!sheet) return;

  sheet.appendRow([
    meta.now,
    meta.createdBy,
    "submit",
    "WPF01",
    meta.submissionId,
    JSON.stringify(meta.payload),
  ]);
}

function firstPcodeFromWPF(payload) {
  const groups = [
    payload.weekly_team_details,
    payload.milestone_details,
    payload.tf_details,
  ];

  for (const group of groups) {
    if (!Array.isArray(group)) continue;
    for (const row of group) {
      if (row && row.pcode) return row.pcode;
    }
  }

  return "";
}

function submitBD01A(payload) {
  const db = getDB();
  const sheet = db.getSheetByName("bd01a");
  if (!sheet) throw new Error("Missing sheet: bd01a");

  payload = payload || {};

  validateBD01AServer(payload);

  const now = new Date();
  const submissionId = Utilities.getUuid();
  const ids = genProposalIDnPCODE(payload);
  const proposalID = ids.proposalID;
  const pcode = ids.pcode;

  payload.submission_id = submissionId;
  payload.proposal_id = proposalID;
  payload.pcode = pcode;

  appendBD01ARow(sheet, payload, submissionId, proposalID, pcode, now);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "BD01A",
    pcode: pcode,
    createdBy: payload.officialEmail || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "BD01A",
    createdBy: payload.officialEmail || "",
    now: now,
    payload: payload,
  });

  sendBD01AEmail(payload, submissionId, proposalID, pcode);

  return {
    ok: true,
    submission_id: submissionId,
    proposalID: proposalID,
    pcode: pcode,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateBD01AServer(payload) {
  const required = [
    ["leadDate", "Date of Client's Mail/ Lead Generation"],
    ["formFillerFirstName", "Form filler first name"],
    ["formFillerLastName", "Form filler last name"],
    ["officialEmail", "Official Email ID"],
    ["customerCompany", "Customer's Company Legal Name"],
    ["customerContact", "Customer contact number"],
    ["customerEmail", "Customer Email"],
    ["customerEmailConfirm", "Confirm Email"],
    ["isRepeatCustomer", "Repeat customer yes/no"],
    ["activityProposed", "Type of Activity Proposed"],
    ["stUt", "ST/UT"],
    ["workType", "Type of Work"],
    ["specs", "Specifications"],
    ["finYear", "Financial Year"],
    ["pgCompany", "Perfact group company name"],
    ["customerClass", "Customer Classification"],
    ["leadSource", "Lead Source"],
  ];
  if (
    String(payload.leadSource || "").toLowerCase() === "others" &&
    !String(payload.leadSourceOtherSpecify || "").trim()
  ) {
    throw new Error("Please fill: Lead Source specify");
  }
  if (
    String(payload.workType || "").toLowerCase() === "others" &&
    !String(payload.workTypeOtherSpecify || "").trim()
  ) {
    throw new Error("Please fill: Type of Work specify");
  }

  const missing = required
    .filter(([key]) => !String(payload[key] || "").trim())
    .map(([, label]) => label);

  if (
    payload.customerEmail &&
    payload.customerEmailConfirm &&
    String(payload.customerEmail).trim() !==
      String(payload.customerEmailConfirm).trim()
  ) {
    missing.push("Customer email and confirm email do not match");
  }

  if (missing.length) {
    throw new Error("Please fill: " + missing.join(", "));
  }
}

function appendBD01ARow(sheet, payload, submissionId, proposalID, pcode, now) {
  sheet.appendRow([
    submissionId,
    now,
    proposalID,
    pcode,
    payload.leadDate || "",
    payload.formFillerFirstName || "",
    payload.formFillerLastName || "",
    payload.officialEmail || "",
    payload.customerCompany || "",
    payload.customerFirstName || "",
    payload.customerLastName || "",
    payload.customerContact || "",
    payload.customerEmail || "",
    payload.customerEmailConfirm || "",
    payload.isRepeatCustomer || "",
    payload.activityProposed || "",
    payload.village || "",
    payload.taluka || "",
    payload.district || "",
    payload.state || "",
    payload.postalCode || "",
    payload.country || "",
    payload.stUt || "",
    payload.workType || "",
    payload.sector || "",
    payload.specs || "",
    payload.finYear || "",
    payload.pgCompany || "",
    payload.customerClass || "",
    payload.leadSource || "",
    payload.leadSourceOtherSpecify || "",
    payload.rfqUrl || "",
    payload.remarks || "",
    payload.workTypeOtherSpecify || "",
  ]);
}

function submitBD02(payload) {
  const db = getDB();
  const sheet = db.getSheetByName("BD02");
  if (!sheet) throw new Error("Missing sheet: BD02");

  payload = payload || {};
  validateBD02Server(payload);

  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload.submission_id = submissionId;

  appendBD02Row(sheet, payload, submissionId, now);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "BD02",
    pcode: payload.pcode || "",
    createdBy: payload.officialEmail || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "BD02",
    createdBy: payload.officialEmail || "",
    now: now,
    payload: payload,
  });

  sendBD02Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateBD02Server(payload) {
  const required = [
    ["leadDate", "Date of Client's Mail/ Lead Generation"],
    ["officialEmail", "Official Email ID"],
    ["customerCompany", "Customer's Company Legal Name"],
    ["projectName", "Project Name"],
    ["projectLocation", "Project Location"],
    ["pcode", "P CODE"],
    ["salesOrderLink", "Link to sales order"],
    ["costComputerLink", "Link to Cost Computer"],
    ["finalProposalLink", "Link to final proposal"],
  ];

  const missing = required
    .filter(([key]) => !String(payload[key] || "").trim())
    .map(([, label]) => label);

  if (
    String(payload.gstAvailable || "").toUpperCase() === "YES" &&
    !String(payload.gstNumber || "").trim()
  ) {
    missing.push("GST number");
  }

  if (
    String(payload.panAvailable || "").toUpperCase() === "YES" &&
    !String(payload.panNumber || "").trim()
  ) {
    missing.push("PAN number");
  }

  if (
    String(payload.tanAvailable || "").toUpperCase() === "YES" &&
    !String(payload.tanNumber || "").trim()
  ) {
    missing.push("TAN number");
  }

  if (missing.length) {
    throw new Error("Please fill: " + missing.join(", "));
  }
}

function appendBD02Row(sheet, payload, submissionId, now) {
  function num(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    const n = Number(s);
    return Number.isFinite(n) ? n : "";
  }

  sheet.appendRow([
    submissionId,
    now,
    payload.leadDate || "",
    payload.formFillerFirstName || "",
    payload.formFillerLastName || "",
    payload.officialEmail || "",
    payload.customerCompany || "",
    payload.customerFirstName || "",
    payload.customerLastName || "",
    payload.customerContactCode || "",
    payload.customerContactNumber || "",
    payload.customerEmail || "",
    payload.gstAvailable || "",
    payload.gstNumber || "",
    payload.panAvailable || "",
    payload.panNumber || "",
    payload.tanAvailable || "",
    payload.tanNumber || "",
    payload.projectName || "",
    payload.projectLocation || "",
    payload.proposalId || "",
    payload.pcode || "",
    payload.dateProposalSent || "",
    payload.gstTreatment || "",
    payload.proposalTrendsSummaryLink || "",
    payload.dateProposalWon || "",
    payload.workOrderLink || "",
    payload.salesOrderLink || "",
    payload.costComputerLink || "",
    payload.finalProposalLink || "",
    payload.prR || "",
    payload.prB || "",
    payload.travellingExpensesInScope || "",
    num(payload.overheadCosts),
    num(payload.testingCharges),
    num(payload.adminExpenses),
    num(payload.manpowerCosts),
    num(payload.outsourcingCosts),
    num(payload.commissions),
    num(payload.outsourcedManpower),
    num(payload.secondaryDataCosts),
    num(payload.contingencyCosts),
    num(payload.siteVisitCosts),
    num(payload.projectBaseLevelCost),
    num(payload.finalQuoteValue),
    num(payload.percentageMargin),
    payload.prMode || "",
    payload.remarks || "",
  ]);
}

function submitBD03(payload) {
  const db = getDB();
  const now = new Date();
  payload = payload || {};

  validateBD03Server(payload);

  const submissionId = Utilities.getUuid();
  payload.submission_id = submissionId;

  const mainSheet = db.getSheetByName("BD03_main");
  if (!mainSheet) throw new Error("Missing sheet: BD03_main");

  appendObjectRow(mainSheet, payload, {
    submissionId: submissionId,
    createdBy: payload.official_email || "",
    now: now,
  });

  appendRowsFromArray(
    db.getSheetByName("BD03_other_persons"),
    payload.other_persons || [],
    {
      submissionId: submissionId,
      createdBy: payload.official_email || "",
      now: now,
    },
  );

  appendRowsFromArray(
    db.getSheetByName("BD03_milestones"),
    payload.milestones || [],
    {
      submissionId: submissionId,
      createdBy: payload.official_email || "",
      now: now,
    },
  );

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "BD03",
    pcode: payload.pcode || "",
    createdBy: payload.official_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "BD03",
    createdBy: payload.official_email || "",
    now: now,
    payload: payload,
  });

  sendBD03Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateBD03Server(payload) {
  const required = [
    ["lead_date", "Date of Client's Mail/ Lead Generation"],
    ["official_email", "Official Email ID"],
    ["team", "Team Name"],
    ["team_head_email", "Team Head Email ID"],
    ["csuite_officer_email", "C-Suite Officer Email ID"],
    ["customer_company", "Customer's Company Legal Name"],
    ["client_first_name", "Client First Name"],
    ["client_last_name", "Client Last Name"],
    ["client_contact_code", "Client Contact Code"],
    ["client_contact_number", "Client Contact Number"],
    ["client_email", "Client Email"],
    ["project_name", "Project Name"],
    ["pcode", "PCode"],
    ["scope_of_work", "Scope of Work"],
    ["category", "Category"],
    ["service_type_code_nabet_sector", "Service Type/ Code/ NABET Sector"],
    ["baseline_season", "Baseline Season"],
    ["eac_name", "EAC Name"],
    ["pg_company", "Perfact Group company name"],
  ];

  const missing = required
    .filter(([key]) => !String(payload[key] || "").trim())
    .map(([, label]) => label);

  if (
    String(payload.type_of_work || "").toLowerCase() === "other" &&
    !String(payload.type_of_work_other_specify || "").trim()
  ) {
    missing.push("Type of Work specify");
  }

  if (
    String(payload.category || "").toLowerCase() === "others" &&
    !String(payload.category_other_specify || "").trim()
  ) {
    missing.push("Category specify");
  }

  if (
    String(payload.service_type_code_nabet_sector || "").toLowerCase() ===
      "others" &&
    !String(payload.sector_other_specify || "").trim()
  ) {
    missing.push("Sector specify");
  }

  if (
    String(payload.baseline_season || "").toLowerCase() === "others" &&
    !String(payload.baseline_season_other_specify || "").trim()
  ) {
    missing.push("Season specify");
  }

  if (
    String(payload.eac_name || "").toLowerCase() === "others" &&
    !String(payload.eac_name_other_specify || "").trim()
  ) {
    missing.push("EAC specify");
  }

  if (
    String(payload.pg_company || "").toLowerCase() === "others" &&
    !String(payload.pg_company_other_specify || "").trim()
  ) {
    missing.push("PG company specify");
  }

  if (
    String(payload.travelling_borne_by || "").toLowerCase() === "other" &&
    !String(payload.travelling_borne_by_other_specify || "").trim()
  ) {
    missing.push("Travelling specify");
  }

  if (missing.length) {
    throw new Error("Please fill: " + missing.join(", "));
  }
}

function submitTF02(payload) {
  const db = getDB();
  const sheet = db.getSheetByName("TF02");
  if (!sheet) throw new Error("Missing sheet: TF02");

  payload = payload || {};
  validateTF02(payload);

  const now = new Date();
  const submissionId = Utilities.getUuid();
  payload.submission_id = submissionId;

  appendTF02Row(sheet, payload, submissionId, now);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF02",
    pcode: payload.pcode || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF02",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF02Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF02(p) {
  const required = [
    ["date", "Date"],
    ["employee_email", "Employee Email ID"],
    ["team_name", "Team Name"],
    ["eia_coordinator_name", "EIA Coordinator Name"],
    ["committee_name", "Name of the Committee"],
    ["agenda_number", "Agenda Number"],
    ["project_name", "Project Name"],
    ["meeting_type", "Type of Meeting"],
    ["proposal_number", "Proposal Number"],
    ["pcode", "Project Code"],
    ["meeting_date", "Date of Meeting"],
    ["key_points_queries", "Key Points & Queries Raised by EAC"],
    ["eac_future_focus", "EAC’s Future Focus / Issues"],
    ["fae_suggestions", "Suggestions on FAE Reports"],
    ["ppt_changes", "Change in PPT Format"],
    ["immediate_actions", "Immediate Actions Required"],
    ["post_submittal_points", "Post-Submittals Related Points"],
    ["key_learnings", "Key Learnings for Team & FAEs"],
    ["struggles_and_reason", "Points We Struggled In & Reason"],
    ["future_implications", "Implications for Future Projects"],
    ["case_recommended", "Case Recommended"],
    ["warning_signs", "Warning Signs"],
    ["meeting_recording_link", "Meeting Recording Link"],
    ["final_presentation_link", "Final Presentation Link"],
  ];

  const missing = required
    .filter(([key]) => !String(p[key] || "").trim())
    .map(([, label]) => label);

  if (
    String(p.meeting_type || "").toLowerCase() === "others" &&
    !String(p.meeting_type_other || "").trim()
  ) {
    missing.push("Please specify for Type of Meeting");
  }

  if (
    String(p.case_recommended || "").toLowerCase() === "others" &&
    !String(p.case_recommended_other || "").trim()
  ) {
    missing.push("Please specify for Case Recommended");
  }

  if (!String(p.qcc_reviewers || "").trim()) {
    missing.push("QCC Reviewer Name");
  }

  if (missing.length) {
    throw new Error("Please fill: " + missing.join(", "));
  }
}

function appendTF02Row(sheet, p, submissionId, now) {
  sheet.appendRow([
    submissionId,
    now,
    p.date || "",
    p.first_name || "",
    p.last_name || "",
    p.employee_email || "",
    p.team_name || "",
    p.eia_coordinator_name || "",
    p.qcc_reviewers || "",
    p.committee_name || "",
    p.agenda_number || "",
    p.project_name || "",
    p.proposed_project_cost || "",
    p.existing_project_cost || "",
    p.case_type || "",
    p.meeting_type || "",
    p.meeting_type_other || "",
    p.proposal_number || "",
    p.pcode || "",
    p.meeting_date || "",
    p.meeting_time || "",
    p.perfact_officials || "",
    p.project_proponent || "",
    p.presenter_first_name || "",
    p.presenter_last_name || "",
    p.key_points_queries || "",
    p.eac_future_focus || "",
    p.fae_suggestions || "",
    p.ppt_changes || "",
    p.immediate_actions || "",
    p.post_submittal_points || "",
    p.key_learnings || "",
    p.struggles_and_reason || "",
    p.future_implications || "",
    p.feedback_suggestions || "",
    p.reply_to_be_submitted || "",
    p.case_recommended || "",
    p.case_recommended_other || "",
    p.warning_signs || "",
    p.action_points || "",
    p.meeting_recording_link || "",
    p.final_presentation_link || "",
    p.remarks || "",
  ]);
}

function submitWPF03(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;
  payload.team_name = "Fountain";

  validateWPF03Server(payload);

  writeWPF03Main(db, payload, submissionId, now);
  writeWPF03AnalysisRows(db, payload, submissionId, now);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "WPF03",
    pcode: "",
    createdBy: payload.created_by || payload.team_name || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "WPF03",
    createdBy: payload.created_by || payload.team_name || "",
    now: now,
    payload: payload,
  });

  sendWPF03Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateWPF03Server(payload) {
  if (!payload.week_start_date) throw new Error("Week Start Date is missing.");
  if (!payload.week_end_date) throw new Error("Week End Date is missing.");
  if (
    !payload.analysis_rows ||
    !Array.isArray(payload.analysis_rows) ||
    payload.analysis_rows.length === 0
  ) {
    throw new Error("Analysis rows are required.");
  }

  const missingRows = [];
  payload.analysis_rows.forEach(function (r, idx) {
    if (!String(r.analysis_item || "").trim())
      missingRows.push(`Analysis row ${idx + 1}: item`);
    if (
      r.planned_last_week === "" ||
      r.planned_last_week === null ||
      r.planned_last_week === undefined
    ) {
      missingRows.push(`Analysis row ${idx + 1}: planned last week`);
    }
    if (
      r.achieving_this_week === "" ||
      r.achieving_this_week === null ||
      r.achieving_this_week === undefined
    ) {
      missingRows.push(`Analysis row ${idx + 1}: achieving this week`);
    }
    if (
      r.plan_for_next_week === "" ||
      r.plan_for_next_week === null ||
      r.plan_for_next_week === undefined
    ) {
      missingRows.push(`Analysis row ${idx + 1}: plan for next week`);
    }
  });

  if (missingRows.length) {
    throw new Error(
      "Please fill all analysis fields:\n\n" + missingRows.join("\n"),
    );
  }
}

function writeWPF03Main(db, payload, submissionId, now) {
  const sheet = db.getSheetByName("WPF03_main");
  if (!sheet) throw new Error("Missing sheet: WPF03_main");

  appendObjectRow(
    sheet,
    {
      week_start_date: payload.week_start_date || "",
      week_end_date: payload.week_end_date || "",
      team_name: payload.team_name || "",
      test_reports_issued: payload.test_reports_issued || "",
      test_reports_planned: payload.test_reports_planned || "",
      monitorings_completed: payload.monitorings_completed || "",
      monitorings_planned: payload.monitorings_planned || "",
      data_review_priority: payload.data_review_priority || "",
      highlights: payload.highlights || "",
      low_points: payload.low_points || "",
      challenges_faced: payload.challenges_faced || "",
      projected_targets_next_week: payload.projected_targets_next_week || "",
      weekly_ppt_link: payload.weekly_ppt_link || "",
      remarks: payload.remarks || "",
    },
    {
      submissionId: submissionId,
      createdBy: payload.created_by || payload.team_name || "",
      now: now,
    },
  );
}

function writeWPF03AnalysisRows(db, payload, submissionId, now) {
  appendRowsFromArray(
    db.getSheetByName("WPF03_analysis"),
    payload.analysis_rows || [],
    {
      submissionId: submissionId,
      createdBy: payload.created_by || payload.team_name || "",
      now: now,
    },
  );
}

function submitTF01(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF01(payload);

  writeTF01Main(db, payload, submissionId, now);
  writeTF01ProjectRows(db, payload, submissionId, now);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF01",
    pcode: firstPcodeFromTF01(payload),
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF01",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF01Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF01(payload) {
  const missing = [];

  if (!String(payload.date || "").trim()) missing.push("Date");
  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");

  const rows = Array.isArray(payload.project_details)
    ? payload.project_details
    : [];
  if (!rows.length) missing.push("PROJECT(S) DETAILS");

  rows.forEach(function (r, idx) {
    if (!String(r.project_name || "").trim())
      missing.push(`Project row ${idx + 1}: Project Name`);
    if (!String(r.pcode || "").trim())
      missing.push(`Project row ${idx + 1}: PCODE`);
    if (!String(r.pp_name || "").trim())
      missing.push(`Project row ${idx + 1}: PP Name`);
    if (!String(r.report_name || "").trim())
      missing.push(`Project row ${idx + 1}: Report Name`);
    if (!String(r.purpose_of_printing || "").trim())
      missing.push(`Project row ${idx + 1}: Purpose of Printing`);
    if (!String(r.pdf_link || "").trim())
      missing.push(`Project row ${idx + 1}: PDF Link`);
    if (
      r.no_of_pages === "" ||
      r.no_of_pages === null ||
      r.no_of_pages === undefined
    ) {
      missing.push(`Project row ${idx + 1}: No. of Pages`);
    }
    if (!String(r.type_of_print || "").trim())
      missing.push(`Project row ${idx + 1}: Type of Print`);
    if (
      r.no_of_copies === "" ||
      r.no_of_copies === null ||
      r.no_of_copies === undefined
    ) {
      missing.push(`Project row ${idx + 1}: No. of Copies`);
    }
  });

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function writeTF01Main(db, payload, submissionId, now) {
  const sheet = db.getSheetByName("TF01_main");
  if (!sheet) throw new Error("Missing sheet: TF01_main");

  appendObjectRow(
    sheet,
    {
      date: payload.date || "",
      employee_first_name: payload.employee_first_name || "",
      employee_last_name: payload.employee_last_name || "",
      employee_email: payload.employee_email || "",
      team_name: payload.team_name || "",
      remarks: payload.remarks || "",
    },
    {
      submissionId: submissionId,
      createdBy: payload.employee_email || "",
      now: now,
    },
  );
}

function writeTF01ProjectRows(db, payload, submissionId, now) {
  appendRowsFromArray(
    db.getSheetByName("tf01_project_details"),
    payload.project_details || [],
    {
      submissionId: submissionId,
      createdBy: payload.employee_email || "",
      now: now,
    },
  );
}

function firstPcodeFromTF01(payload) {
  const rows = payload.project_details || [];
  for (const r of rows) {
    if (r && r.pcode) return r.pcode;
  }
  return "";
}

function submitTF22(payload) {
  const db = getDB();
  const sheet = db.getSheetByName("TF22");
  if (!sheet) throw new Error("Missing sheet: TF22");

  payload = payload || {};
  validateTF22(payload);

  const now = new Date();
  const submissionId = Utilities.getUuid();

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.type_of_work || "",
    payload.project_name || "",
    payload.date_of_completion || "",
    payload.project_code || "",
    payload.type_of_service || "",
    payload.attachments_url || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF22",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF22",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF22Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF22(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team");
  if (!String(payload.type_of_work || "").trim()) missing.push("Type of Work");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.date_of_completion || "").trim())
    missing.push("Date of completion of project");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.type_of_service || "").trim())
    missing.push("Type of Service");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF07(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF07(payload);

  const sheet = db.getSheetByName("TF07");
  if (!sheet) throw new Error("Missing sheet: TF07");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.type_of_work || "",
    payload.type_of_work_other || "",
    payload.milestone_achieved || "",
    payload.milestone_achieved_other || "",
    payload.date_of_milestone_achieved || "",
    payload.proof_link || "",
    payload.submission_status || "",
    payload.person_to_bill || "",
    payload.email_of_person_to_bill || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF07",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF07",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF07Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF07(payload) {
  const missing = [];

  if (!String(payload.date || "").trim()) missing.push("Date");
  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.type_of_work || "").trim()) missing.push("Type of Work");
  if (!String(payload.milestone_achieved || "").trim())
    missing.push("Milestone Achieved");
  if (!String(payload.date_of_milestone_achieved || "").trim())
    missing.push("Date of Milestone achieved");
  if (!String(payload.proof_link || "").trim())
    missing.push("Link to Screenshot or Proof of Achieving Milestone");
  if (!String(payload.submission_status || "").trim())
    missing.push("Submission Status");
  if (!String(payload.person_to_bill || "").trim())
    missing.push("Person to Bill");
  if (!String(payload.email_of_person_to_bill || "").trim())
    missing.push("Email ID of Person to Bill");

  if (
    String(payload.type_of_work || "").toLowerCase() === "other" &&
    !String(payload.type_of_work_other || "").trim()
  ) {
    missing.push("Type of Work - other specify");
  }

  if (
    String(payload.milestone_achieved || "").toLowerCase() === "other" &&
    !String(payload.milestone_achieved_other || "").trim()
  ) {
    missing.push("Milestone Achieved - other specify");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF05(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF05(payload);

  const sheet = db.getSheetByName("TF05");
  if (!sheet) throw new Error("Missing sheet: TF05");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.official_email || "",
    payload.team_name || "",
    payload.eia_coordinator_name || "",
    payload.qcc_reviewers || "",
    payload.presenter_first_name || "",
    payload.presenter_last_name || "",
    payload.presenter_email || "",
    payload.developer_company_name || "",
    payload.project_name || "",
    payload.project_proponent_first_name || "",
    payload.project_proponent_last_name || "",
    payload.project_code || "",
    payload.proposed_project_cost_lacs || "",
    payload.existing_project_cost_lacs || "",
    payload.project_cost_after_proposed_ec_lacs || "",
    payload.project_location || "",
    payload.plot_area_sq_m || "",
    payload.built_up_area_sq_m || "",
    payload.capacity || "",
    payload.emp_cost_capital_lacs || "",
    payload.category || "",
    payload.activity || "",
    payload.parivesh_login_id || "",
    payload.parivesh_password || "",
    payload.type_of_presentation || "",
    payload.type_of_presentation_other || "",
    payload.eac_committee || "",
    payload.proposal_no || "",
    payload.date_of_uploading || "",
    payload.agenda_no || "",
    payload.date_of_eac_meeting || "",
    payload.internal_meeting_link || "",
    payload.eac_meeting_link || "",
    payload.meeting_s_no || "",
    payload.master_ppt_link || "",
    payload.summarised_ppt_link || "",
    payload.brief_writeup_annexure || "",
    payload.uploading_document_single_file_link || "",
    payload.online_report_link || "",
    payload.undertaking_link || "",
    payload.kml_file_link || "",
    payload.backup_folder_link || "",
    payload.circulation_documents_link_docx || "",
    payload.circulation_documents_pdf || "",
    payload.critical_points || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF05",
    pcode: payload.project_code || "",
    createdBy: payload.official_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF05",
    createdBy: payload.official_email || "",
    now: now,
    payload: payload,
  });

  sendTF05Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF05(payload) {
  const missing = [];

  if (!String(payload.official_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator Name");
  if (!String(payload.presenter_email || "").trim())
    missing.push("Email ID of the person who will present in EAC/ SEAC");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.proposed_project_cost_lacs || "").trim())
    missing.push("Proposed Project Cost");
  if (!String(payload.project_location || "").trim())
    missing.push("Project Location");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.activity || "").trim()) missing.push("Activity");
  if (!String(payload.type_of_presentation || "").trim())
    missing.push("Type of Presentation");
  if (!String(payload.eac_committee || "").trim())
    missing.push("EAC Committee");
  if (!String(payload.proposal_no || "").trim()) missing.push("Proposal No.");
  if (!String(payload.agenda_no || "").trim()) missing.push("Agenda No.");
  if (!String(payload.internal_meeting_link || "").trim())
    missing.push("Internal Meeting Link");
  if (!String(payload.eac_meeting_link || "").trim())
    missing.push("EAC Meeting Link");
  if (!String(payload.master_ppt_link || "").trim())
    missing.push("Master PPT Link");
  if (!String(payload.summarised_ppt_link || "").trim())
    missing.push("Summarised PPT Link");
  if (!String(payload.uploading_document_single_file_link || "").trim())
    missing.push("Uploading Document - Single File Link");
  if (!String(payload.online_report_link || "").trim())
    missing.push("Online Report Link");
  if (!String(payload.undertaking_link || "").trim())
    missing.push("Undertaking Link");
  if (!String(payload.kml_file_link || "").trim())
    missing.push("KML File Link");
  if (!String(payload.backup_folder_link || "").trim())
    missing.push("Backup folder Link");
  if (!String(payload.circulation_documents_link_docx || "").trim())
    missing.push("Circulation Documents Link- in Docx");
  if (!String(payload.critical_points || "").trim())
    missing.push("Critical Points");

  if (
    String(payload.type_of_presentation || "").toLowerCase() === "other" &&
    !String(payload.type_of_presentation_other || "").trim()
  ) {
    missing.push("If Others, Pls Specify");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF06(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF06(payload);

  const sheet = db.getSheetByName("TF06");
  if (!sheet) throw new Error("Missing sheet: TF06");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.official_email || "",
    payload.team_name || "",
    payload.eia_coordinator_name || "",
    payload.qcc_reviewers || "",
    payload.c_level_officer_name || "",
    payload.project_name || "",
    payload.project_proponent_first_name || "",
    payload.project_proponent_last_name || "",
    payload.project_code || "",
    payload.proposed_project_cost_lacs || "",
    payload.existing_project_cost_lacs || "",
    payload.project_cost_after_proposed_ec_lacs || "",
    payload.cer_budget_lacs || "",
    payload.project_location || "",
    payload.location_type || "",
    payload.plot_area_sq_m || "",
    payload.built_up_area_sq_m || "",
    payload.capacity || "",
    payload.kml_with_project_boundary_url || "",
    payload.emp_cost_capital_lacs || "",
    payload.emp_slides_url || "",
    payload.category || "",
    payload.activity || "",
    payload.major_sector || "",
    payload.minor_sector || "",
    payload.ph_applicable || "",
    payload.ph_mom_english_url || "",
    payload.ph_mom_local_language_url || "",
    payload.summary_of_ph_mom_url || "",
    payload.compliance_of_ph_url || "",
    payload.link_to_registration_details_pdf || "",
    payload.parivesh_login_details || "",
    payload.type_of_uploading || "",
    payload.type_of_uploading_other || "",
    payload.eac_committee || "",
    payload.proposal_no || "",
    payload.final_fae_list_url || "",
    payload.draft_form_i_part_a_pdf_url || "",
    payload.draft_form_i_part_a_docx_link || "",
    payload.draft_form_i_part_b_pdf_url || "",
    payload.draft_form_i_part_b_docx_link || "",
    payload.draft_form_i_part_c_pdf_url || "",
    payload.draft_form_i_part_c_docx_link || "",
    payload.life_cycle_assessment_pdf_url || "",
    payload.life_cycle_assessment_pptx_link || "",
    payload.wlcp_url || "",
    payload.distance_certification_url || "",
    payload.nbwl_url || "",
    payload.forest_clearance_url || "",
    payload.water_balance_pdf_url || "",
    payload.waste_tables_pdf_url || "",
    payload.process_emissions_pdf_url || "",
    payload.utility_emissions_pdf_url || "",
    payload.baseline_season || "",
    payload.baseline_location_maps_url || "",
    payload.master_ppt_pdf_url || "",
    payload.master_ppt_link || "",
    payload.cover_letter_pdf_url || "",
    payload.cover_letter_docx_link || "",
    payload.plans_annexure_pdf_url || "",
    payload.plans_annexure_docx_link || "",
    payload.annexure_pdf_url || "",
    payload.risk_assessment_pdf_url || "",
    payload.risk_assessment_docx_link || "",
    payload.signed_copy_initial_pages_url || "",
    payload.emp_eia_single_file_before_annexure_pdf_url || "",
    payload.emp_eia_single_file_before_annexure_docx_link || "",
    payload.conceptual_plan_pfr_pdf_url || "",
    payload.conceptual_plan_pfr_docx_link || "",
    payload.layout_pdf_url || "",
    payload.additional_files_pdf_url || "",
    payload.additional_files_docx_link || "",
    payload.board_resolution_pdf_url || "",
    payload.board_resolution_docx_link || "",
    payload.uploading_folder_pdf_link || "",
    payload.uploading_folder_docx_link || "",
    payload.single_file_pdf_url || "",
    payload.single_file_docx_link || "",
    payload.additional_critical_files_pdf_link || "",
    payload.additional_critical_files_docx_link || "",
    payload.authorisation_board_resolution_pdf_url || "",
    payload.authorisation_board_resolution_docx_link || "",
    payload.issues_in_uploading_or_pendency || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF06",
    pcode: payload.project_code || "",
    createdBy: payload.official_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF06",
    createdBy: payload.official_email || "",
    now: now,
    payload: payload,
  });

  sendTF06Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF06(payload) {
  const missing = [];

  if (!String(payload.official_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator Name");
  if (!String(payload.c_level_officer_name || "").trim())
    missing.push("C-Level Officer Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.ph_applicable || "").trim())
    missing.push("PH Applicable");
  if (!String(payload.type_of_uploading || "").trim())
    missing.push("Type of Uploading");
  if (!String(payload.eac_committee || "").trim())
    missing.push("EAC Committee");
  if (!String(payload.proposal_no || "").trim()) missing.push("Proposal No.");
  if (!String(payload.link_to_registration_details_pdf || "").trim())
    missing.push("Link to Registration Details - PDF");
  if (!String(payload.final_fae_list_url || "").trim())
    missing.push("Final FAE list");
  if (!String(payload.baseline_season || "").trim())
    missing.push("Baseline Season");
  if (!String(payload.master_ppt_link || "").trim())
    missing.push("Link to Master PPT");
  if (!String(payload.remarks || "").trim() && false) {
  } // keep optional

  if (
    String(payload.type_of_uploading || "").toLowerCase() === "others" &&
    !String(payload.type_of_uploading_other || "").trim()
  ) {
    missing.push("If Others, Pls Specify");
  }

  if (String(payload.ph_applicable || "").toLowerCase() === "yes") {
    [
      ["ph_mom_english_url", "PH MoM (english)"],
      ["ph_mom_local_language_url", "PH MoM (local language)"],
      ["summary_of_ph_mom_url", "Summary of PH MoM"],
      ["compliance_of_ph_url", "Compliance of PH"],
    ].forEach(function ([key, label]) {
      if (!String(payload[key] || "").trim()) missing.push(label);
    });
  }

  if (
    String(payload.type_of_uploading || "").toLowerCase() === "others" &&
    !String(payload.type_of_uploading_other || "").trim()
  ) {
    missing.push("If Others, Pls Specify");
  }

  [
    ["kml_with_project_boundary_url", "KML with project boundary"],
    ["emp_slides_url", "EMP Slides"],
    ["draft_form_i_part_a_pdf_url", "Draft Form-I (part A)- PDF"],
    ["draft_form_i_part_b_pdf_url", "Draft Form-I (part B)- PDF"],
    ["draft_form_i_part_c_pdf_url", "Draft Form-I (part C)- PDF"],
    ["life_cycle_assessment_pdf_url", "Life Cycle Assessment- PDF"],
    ["water_balance_pdf_url", "Water Balance- PDF"],
    [
      "waste_tables_pdf_url",
      "Hazardous waste, Non-hazardous waste and other waste tables- PDF",
    ],
    ["process_emissions_pdf_url", "Process emissions with APCM- PDF"],
    ["utility_emissions_pdf_url", "Utility emissions with APCM- PDF"],
    [
      "baseline_location_maps_url",
      "Baseline location Maps with sampling details",
    ],
    ["master_ppt_pdf_url", "Master PPT- PDF"],
    ["uploading_folder_pdf_link", "Link to Uploading Folder- PDF"],
    [
      "authorisation_board_resolution_pdf_url",
      "Authorisation of the Concerned person making application (Board resolution)- PDF",
    ],
  ].forEach(function ([key, label]) {
    if (!String(payload[key] || "").trim()) {
      // These are required in the source, so keep them mandatory
      missing.push(label);
    }
  });

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF25(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF25(payload);

  const sheet = db.getSheetByName("TF25");
  if (!sheet) throw new Error("Missing sheet: TF25");

  sheet.appendRow([
    submissionId,
    now,
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.parivesh_proposal_number || "",
    payload.type_of_case || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_seac || "",
    payload.eia_coordinator_name || "",
    payload.query_raised || "",
    payload.ads_screenshot_url || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF25",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF25",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF25Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF25(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator Name");
  if (!String(payload.query_raised || "").trim()) missing.push("Query Raised");
  if (!String(payload.eac_seac || "").trim()) missing.push("EAC/SEAC");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF24(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF24(payload);

  const sheet = db.getSheetByName("TF24");
  if (!sheet) throw new Error("Missing sheet: TF24");

  sheet.appendRow([
    submissionId,
    now,
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.parivesh_proposal_number || "",
    payload.type_of_case || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_seac || "",
    payload.eia_coordinator_name || "",
    payload.query_raised || "",
    payload.eds_screenshot_url || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF24",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF24",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF24Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF24(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator Name");
  if (!String(payload.query_raised || "").trim()) missing.push("Query Raised");
  if (!String(payload.eac_seac || "").trim()) missing.push("EAC/SEAC");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF16(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF16(payload);

  const sheet = db.getSheetByName("TF16");
  if (!sheet) throw new Error("Missing sheet: TF16");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.agenda_number || "",
    payload.date_of_tf06_submission || "",
    payload.date_of_pfr_emp_eia_submission || "",
    payload.date_of_eds_raised || "",
    payload.date_of_eds_submitted || "",
    payload.date_of_project_enlistment || "",
    payload.meeting_datetime || "",
    payload.meeting_link || "",
    payload.critical_points || "",
    payload.potential_attendees_perfact || "",
    payload.potential_attendees_pp || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF16",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF16",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF16Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF16(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.agenda_number || "").trim())
    missing.push("Agenda Number");
  if (!String(payload.date_of_tf06_submission || "").trim())
    missing.push("Date of TF06 Submission");
  if (!String(payload.date_of_pfr_emp_eia_submission || "").trim())
    missing.push("Date of PFR/EMP/EIA Submission");
  if (!String(payload.date_of_project_enlistment || "").trim())
    missing.push("Date of Project Enlistment");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitHR01(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateHR01(payload);

  const sheet = db.getSheetByName("HR01");
  if (!sheet) throw new Error("Missing sheet: HR01");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_email || "",
    payload.applicant_first_name || "",
    payload.applicant_last_name || "",
    payload.position_applied_for || "",
    payload.interview_date || "",
    payload.interviewer_first_name || "",
    payload.interviewer_last_name || "",
    payload.meeting_recording_link || "",
    payload.education_training || "",
    payload.technical_skills || "",
    payload.communication || "",
    payload.job_knowledge || "",
    payload.work_experience || "",
    payload.body_language || "",
    payload.attitude_towards_interview_job || "",
    payload.culture_compatibility || "",
    payload.interviewer_comments || "",
    payload.star_rating || "",
    payload.final_recommendation || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "HR01",
    pcode: "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "HR01",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendHR01Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateHR01(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Email of person filling the form");
  if (!String(payload.applicant_first_name || "").trim())
    missing.push("Applicant First Name");
  if (!String(payload.applicant_last_name || "").trim())
    missing.push("Applicant Last Name");
  if (!String(payload.position_applied_for || "").trim())
    missing.push("Position applied for");
  if (!String(payload.interview_date || "").trim())
    missing.push("InterviewDate");
  if (!String(payload.interviewer_first_name || "").trim())
    missing.push("Interviewer First Name");
  if (!String(payload.interviewer_last_name || "").trim())
    missing.push("Interviewer Last Name");
  if (!String(payload.final_recommendation || "").trim())
    missing.push("Final Recommendation");

  [
    ["education_training", "Education/Training"],
    ["technical_skills", "Technical Skills"],
    ["communication", "Communication"],
    ["job_knowledge", "Job Knowledge"],
    ["work_experience", "Work Experience"],
    ["body_language", "Body Language"],
    ["attitude_towards_interview_job", "Attitude towards Interview/Job"],
    ["culture_compatibility", "Culture Compatibility"],
    ["star_rating", "Star Rating"],
  ].forEach(function ([key, label]) {
    if (!String(payload[key] || "").trim()) missing.push(label);
  });

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitADM06(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateADM06(payload);

  const sheet = db.getSheetByName("ADM06");
  if (!sheet) throw new Error("Missing sheet: ADM06");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.purpose_of_hotspot_requirement || "",
    payload.hotspot_required_from_date || "",
    payload.hotspot_required_till_date || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ADM06",
    pcode: "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ADM06",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendADM06Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateADM06(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Requestor Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.purpose_of_hotspot_requirement || "").trim())
    missing.push("Purpose of Hotspot Requirement");
  if (!String(payload.hotspot_required_from_date || "").trim())
    missing.push("Hotspot required from date");
  if (!String(payload.hotspot_required_till_date || "").trim())
    missing.push("Hotspot required till date");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitADM04(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateADM04(payload);

  const sheet = db.getSheetByName("ADM04");
  if (!sheet) throw new Error("Missing sheet: ADM04");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.department || "",
    payload.team_name || "",
    payload.vehicle_detail || "",
    payload.type_of_work || "",
    payload.workshop || "",
    payload.date_of_last_service || "",
    payload.last_service_kms || "",
    payload.amount_incurred_last_periodic_service || "",
    payload.current_running_kms || "",
    payload.proposed_date_of_service || "",
    payload.puc_valid_till || "",
    payload.puc_to_be_renewed_on_or_before || "",
    payload.last_time_tyres_purchase_date || "",
    payload.cost_of_last_tyres_purchase || "",
    payload.proposed_date_of_new_tyres_purchase || "",
    payload.brand_of_tyres || "",
    payload.vendor_name_tyres || "",
    payload.warranty_of_tyres || "",
    payload.last_battery_purchase_date || "",
    payload.cost_of_last_purchase_battery || "",
    payload.buy_back_cost_of_exiting_old_battery || "",
    payload.cost_of_new_battery || "",
    payload.brand_of_battery || "",
    payload.warranty_of_battery || "",
    payload.vendor_name_battery || "",
    payload.insurance_valid_till || "",
    payload.current_insurance_provider || "",
    payload.last_insurance_premium_paid || "",
    payload.insurance_renewal_on_or_before || "",
    payload.details_of_emergency_repair_and_maintenance || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ADM04",
    pcode: "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ADM04",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendADM04Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateADM04(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim()) missing.push("Email");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.vehicle_detail || "").trim())
    missing.push("Vehicle Detail");
  if (!String(payload.type_of_work || "").trim())
    missing.push("Type of work to be done");

  const t = String(payload.type_of_work || "").toLowerCase();

  if (t === "periodic service") {
    [
      "workshop",
      "date_of_last_service",
      "last_service_kms",
      "amount_incurred_on_last_periodic_service",
      "current_running_kms",
      "proposed_date_of_service",
    ].forEach(function (key) {
      if (!String(payload[key] || "").trim()) missing.push(key);
    });
  }

  if (t === "puc renewal") {
    ["puc_valid_till", "puc_to_be_renewed_on_or_before"].forEach(
      function (key) {
        if (!String(payload[key] || "").trim()) missing.push(key);
      },
    );
  }

  if (t === "new tyres to be purchased") {
    [
      "last_time_tyres_purchase_date",
      "cost_of_last_tyres_purchase",
      "proposed_date_of_new_tyres_purchase",
      "brand_of_tyres",
      "vendor_name_tyres",
      "warranty_of_tyres",
    ].forEach(function (key) {
      if (!String(payload[key] || "").trim()) missing.push(key);
    });
  }

  if (t === "new battery required") {
    [
      "last_battery_purchase_date",
      "cost_of_last_purchase_battery",
      "buy_back_cost_of_exiting_old_battery",
      "cost_of_new_battery",
      "brand_of_battery",
      "warranty_of_battery",
      "vendor_name_battery",
    ].forEach(function (key) {
      if (!String(payload[key] || "").trim()) missing.push(key);
    });
  }

  if (t === "insurance renewal") {
    [
      "insurance_valid_till",
      "current_insurance_provider",
      "last_insurance_premium_paid",
      "insurance_renewal_on_or_before",
    ].forEach(function (key) {
      if (!String(payload[key] || "").trim()) missing.push(key);
    });
  }

  if (t === "emergency repair & maintenance work") {
    if (
      !String(payload.details_of_emergency_repair_and_maintenance || "").trim()
    ) {
      missing.push("Details of emergency repair and maintenance");
    }
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitADM03(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateADM03Server(payload);

  const mainSheet = db.getSheetByName("ADM03_main");
  const detailsSheet = db.getSheetByName("ADM03_visit_details");

  if (!mainSheet) throw new Error("Missing sheet: ADM03_main");
  if (!detailsSheet) throw new Error("Missing sheet: ADM03_details");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.department || "",
    payload.remarks || "",
  ]);

  const rows = Array.isArray(payload.details) ? payload.details : [];
  const usedRows = rows.filter(function (r) {
    return (
      String(r.date_of_pick_up || "").trim() ||
      String(r.vehicle_required_till_date || "").trim() ||
      String(r.name_of_person_going_for_visit || "").trim() ||
      String(r.time_of_pickup_team || "").trim() ||
      String(r.pickup_point || "").trim() ||
      String(r.places_to_be_visited || "").trim() ||
      String(r.project_name || "").trim() ||
      String(r.pcode || "").trim() ||
      String(r.distance_travelled || "").trim() ||
      String(r.purpose_of_visit || "").trim()
    );
  });

  usedRows.forEach(function (r, index) {
    detailsSheet.appendRow([
      submissionId,
      index + 1,
      r.date_of_pickup || "",
      r.vehicle_required_till_date || "",
      r.name_of_person_going_for_visit || "",
      r.time_of_pickup_team || "",
      r.pickup_point || "",
      r.places_to_be_visited || "",
      r.project_name || "",
      r.pcode || "",
      r.distance_travelled || "",
      r.purpose_of_visit || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ADM03",
    pcode: firstPcodeFromADM03(payload),
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ADM03",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendADM03Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateADM03Server(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requester");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");

  const rows = Array.isArray(payload.details) ? payload.details : [];
  const usedRows = rows.filter(function (r) {
    return (
      String(r.date_of_pick_up || "").trim() ||
      String(r.vehicle_required_till_date || "").trim() ||
      String(r.name_of_person_going_for_visit || "").trim() ||
      String(r.time_of_pickup_team || "").trim() ||
      String(r.pickup_point || "").trim() ||
      String(r.places_to_be_visited || "").trim() ||
      String(r.project_name || "").trim() ||
      String(r.pcode || "").trim() ||
      String(r.distance_travelled || "").trim() ||
      String(r.purpose_of_visit || "").trim()
    );
  });

  if (!usedRows.length) {
    missing.push("Vehicle Requirement Details");
  } else {
    usedRows.forEach(function (r, i) {
      if (!String(r.project_name || "").trim())
        missing.push(`Project Name (row ${i + 1})`);
      if (!String(r.pcode || "").trim()) missing.push(`PCODE (row ${i + 1})`);
      if (!String(r.distance_travelled || "").trim())
        missing.push(`Distance travelled (row ${i + 1})`);
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function firstPcodeFromADM03(payload) {
  const rows = Array.isArray(payload.details) ? payload.details : [];
  for (const row of rows) {
    if (row && String(row.pcode || "").trim()) return row.pcode;
  }
  return "";
}

function submitFQ01(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ01(payload);

  const sheet = db.getSheetByName("FQ01");
  if (!sheet) throw new Error("Missing sheet: FQ01");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.aq_questionnaire_sheet_link || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ01",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ01",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ01Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ01(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.aq_questionnaire_sheet_link || "").trim())
    missing.push("AQ Questionnaire sheet link");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ02(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ02(payload);

  const sheet = db.getSheetByName("FQ02");
  if (!sheet) throw new Error("Missing sheet: FQ02");

  sheet.appendRow([
    submissionId,
    now,
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.eac_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.developed_by || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.baseline_season || "",
    payload.aq_dispersion_model_link || "",
    payload.remarks || "",
  ]);

  sendFQ02Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ02(payload) {
  const missing = [];

  if (!payload.requestor_email) missing.push("Official Email ID");
  if (!payload.team_name) missing.push("Team Name");
  if (!payload.pcode) missing.push("PCODE");
  if (!payload.aq_dispersion_model_link)
    missing.push("AQ Dispersion Model link");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ03(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ03(payload);

  const sheet = db.getSheetByName("FQ03");
  if (!sheet) throw new Error("Missing sheet: FQ03");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.type_of_project || "",
    payload.type_of_industry || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.total_land_area_m2 || "",
    payload.green_belt_area_m2 || "",
    payload.existing_storage_area_m2 || "",
    payload.proposed_storage_area_m2 || "",
    payload.manpower_details || "",
    payload.emp_report_url || "",
    payload.pfr_or_eia_report_url || "",
    payload.kml_file_url || "",
    payload.msds_safety_datasheet_url || "",
    payload.applicable_tor_details_url || "",
    payload.manufacturing_process_details_url || "",
    payload.process_flow_charts_pid_url || "",
    payload.ec_url || "",
    payload.cte_url || "",
    payload.cto_url || "",
    payload.layout_of_plant_url || "",
    payload.layout_of_storage_area_url || "",
    payload.list_of_hazardous_chemical_handled_url || "",
    payload.list_of_solvents_handled_url || "",
    payload.project_sheet_url || "",
    payload.accidents_reported_past_year || "",
    payload.hazop_report_existing || "",
    payload.existing_fire_fighting_system_details || "",
    payload.safety_audit_report_url || "",
    payload.list_of_ppes_used || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ03",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ03",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ03Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ03(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.type_of_project || "").trim())
    missing.push("Type of Project");
  if (!String(payload.type_of_industry || "").trim())
    missing.push("Type of Industry");
  if (!String(payload.total_land_area_m2 || "").trim())
    missing.push("Total land Area (m²)");
  if (!String(payload.green_belt_area_m2 || "").trim())
    missing.push("Green Belt Area (m²)");
  if (!String(payload.existing_storage_area_m2 || "").trim())
    missing.push("Existing Storage Area (m²)");
  if (!String(payload.proposed_storage_area_m2 || "").trim())
    missing.push("Proposed Storage Area (m²)");

  [
    ["pfr_or_eia_report_url", "PFR Report/EIA report"],
    ["kml_file_url", "KML file"],
    [
      "msds_safety_datasheet_url",
      "MSDS/safety datasheet of Hazardous chemical",
    ],
    ["applicable_tor_details_url", "Applicable TOR Details"],
    ["manufacturing_process_details_url", "Mnaufacturing/Process details"],
    ["process_flow_charts_pid_url", "Process Flow charts/ P&IDs"],
    ["layout_of_plant_url", "Layout of the Plant"],
    [
      "list_of_hazardous_chemical_handled_url",
      "List of Hazardous Chemical handled",
    ],
    ["list_of_solvents_handled_url", "List of Solvents handled"],
    ["project_sheet_url", "Project Sheet"],
  ].forEach(function ([key, label]) {
    if (!String(payload[key] || "").trim()) missing.push(label);
  });

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ04(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ04(payload);

  const sheet = db.getSheetByName("FQ04");
  if (!sheet) throw new Error("Missing sheet: FQ04");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.type_of_project || "",
    payload.type_of_industry || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.total_land_area_m2 || "",
    payload.green_belt_area_m2 || "",
    payload.existing_storage_area_m2 || "",
    payload.proposed_storage_area_m2 || "",
    payload.manpower_details || "",
    payload.pfr_or_eia_report_url || "",
    payload.kml_file_url || "",
    payload.msds_safety_datasheet_url || "",
    payload.applicable_tor_details_url || "",
    payload.manufacturing_process_details_url || "",
    payload.process_flow_charts_pid_url || "",
    payload.layout_of_plant_url || "",
    payload.layout_of_storage_area_url || "",
    payload.list_of_hazardous_chemical_handled || "",
    payload.list_of_solvents_handled || "",
    payload.project_sheet_url || "",
    payload.existing_hazop_report || "",
    payload.existing_qra_report || "",
    payload.existing_fire_fighting_system_details || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ04",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ04",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ04Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ04(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.type_of_project || "").trim())
    missing.push("Type of Project");
  if (!String(payload.type_of_industry || "").trim())
    missing.push("Type of Industry");
  if (!String(payload.total_land_area_m2 || "").trim())
    missing.push("Total Land Area");
  if (!String(payload.green_belt_area_m2 || "").trim())
    missing.push("Green Belt Area");
  if (!String(payload.existing_storage_area_m2 || "").trim())
    missing.push("Existing Storage Area");
  if (!String(payload.proposed_storage_area_m2 || "").trim())
    missing.push("Proposed Storage Area");

  [
    ["pfr_or_eia_report_url", "PFR Report/EIA report"],
    ["kml_file_url", "KML file"],
    [
      "msds_safety_datasheet_url",
      "MSDS/safety datasheet of Hazardous chemical",
    ],
    ["applicable_tor_details_url", "Applicable TOR Details"],
    ["manufacturing_process_details_url", "Mnaufacturing/Process details"],
    ["process_flow_charts_pid_url", "Process Flow charts/ P&IDs"],
    ["layout_of_plant_url", "Layout of the Plant"],
    [
      "list_of_hazardous_chemical_handled",
      "List of Hazardous Chemical handled",
    ],
    ["list_of_solvents_handled", "List of Solvents handled"],
    ["project_sheet_url", "Link to Project Sheet"],
  ].forEach(function ([key, label]) {
    if (!String(payload[key] || "").trim()) missing.push(label);
  });

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ06(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ06(payload);

  const sheet = db.getSheetByName("FQ06");
  if (!sheet) throw new Error("Missing sheet: FQ06");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.kml_link || "",
    payload.topo_map_link || "",
    payload.other_maps_link || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ06",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ06",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ06Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ06(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.kml_link || "").trim()) missing.push("Link to KML");
  if (!String(payload.topo_map_link || "").trim())
    missing.push("Link to Topo Map");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ07(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ07(payload);

  const mainSheet = db.getSheetByName("FQ07_main");
  const archSheet = db.getSheetByName("FQ07_archaeological_details");

  if (!mainSheet) throw new Error("Missing sheet: FQ07_main");
  if (!archSheet) throw new Error("Missing sheet: FQ07_archaeological_details");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.type_of_project || "",
    payload.physical_features || "",
    payload.core_zone_type || "",
    payload.buffer_zone_type || "",
    payload.project_area || "",
    payload.build_up_area || "",
    payload.mine_area || "",
    payload.dump_area || "",
    payload.plantation_area || "",
    payload.road_area || "",
    payload.open_area || "",
    payload.other_details || "",
    payload.environmentally_sensitive_area || "",
    payload.core_zone_distance || "",
    payload.buffer_zone_distance || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.fae_report_link || "",
    payload.remarks || "",
  ]);

  (payload.archaeological_details || []).forEach(function (row, index) {
    archSheet.appendRow([
      submissionId,
      index + 1,
      row.name || "",
      row.distance_from_project_site || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ07",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ07",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ07Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ07(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.type_of_project || "").trim())
    missing.push("Type of Project");
  if (!String(payload.fae_report_link || "").trim())
    missing.push("FAE report link");

  if (
    payload.archaeological_details &&
    Array.isArray(payload.archaeological_details)
  ) {
    payload.archaeological_details.forEach(function (row, index) {
      const hasAny =
        String(row.name || "").trim() ||
        String(row.distance_from_project_site || "").trim();
      if (hasAny) {
        if (!String(row.name || "").trim())
          missing.push(
            `Archeological or important buildings - Name (row ${index + 1})`,
          );
        if (!String(row.distance_from_project_site || "").trim())
          missing.push(
            `Archeological or important buildings - Distance from project site (row ${index + 1})`,
          );
      }
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ08(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ08(payload);

  const sheet = db.getSheetByName("FQ08");
  if (!sheet) throw new Error("Missing sheet: FQ08");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.type_of_project || "",
    payload.tor_letter_link || "",
    payload.kml_kmz_link || "",
    payload.topo_map_link || "",
    payload.chapter_2_link || "",
    payload.industries_in_study_area || "",
    payload.primary_se_data || "",
    payload.other_info || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId,
    formCode: "FQ08",
    pcode: payload.pcode,
    createdBy: payload.requestor_email,
    now,
    payload,
  });

  appendAuditLog(db, {
    submissionId,
    formCode: "FQ08",
    createdBy: payload.requestor_email,
    now,
    payload,
  });

  sendFQ08Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ08(payload) {
  const missing = [];

  if (!payload.requestor_email) missing.push("Official Email ID");
  if (!payload.team_name) missing.push("Team Name");
  if (!payload.project_name) missing.push("Project Name");
  if (!payload.pcode) missing.push("PCODE");
  if (!payload.type_of_project) missing.push("Type of Project");
  if (!payload.tor_letter_link) missing.push("TOR Letter");
  if (!payload.kml_kmz_link) missing.push("KML/KMZ");
  if (!payload.topo_map_link) missing.push("Topographical Map");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ09(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ09(payload);

  const sheet = db.getSheetByName("FQ09");
  if (!sheet) throw new Error("Missing sheet: FQ09");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.basic_requirements || "",
    payload.layout_upload_link || "",
    payload.coordinates_upload_link || "",
    payload.kml_upload_link || "",
    payload.topo_map_and_sensitivity_required || "",
    payload.other_maps_required || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ09",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ09",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ09Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ09(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.layout_upload_link || "").trim())
    missing.push("Layout Upload");
  if (!String(payload.coordinates_upload_link || "").trim())
    missing.push("Coordinates Upload");
  if (!String(payload.kml_upload_link || "").trim()) missing.push("KML Upload");
  if (!String(payload.topo_map_and_sensitivity_required || "").trim())
    missing.push("Topo Map and Sensitivity");

  if (
    String(payload.topo_map_and_sensitivity_required || "")
      .toLowerCase()
      .includes("other maps") &&
    !String(payload.other_maps_required || "").trim()
  ) {
    missing.push("other maps required");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ10(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ10(payload);

  const sheet = db.getSheetByName("FQ10");
  if (!sheet) throw new Error("Missing sheet: FQ10");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.type_of_work || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.basic_requirements || "",
    payload.layout_upload_link || "",
    payload.coordinates_upload_link || "",
    payload.kml_upload_link || "",
    payload.lu_map_required || "",
    payload.other_maps_required || "",
    payload.sampling_maps_required || "",
    payload.idw_maps_required || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ10",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ10",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ10Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ10(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.type_of_work || "").trim()) missing.push("Type of Work");
  if (!String(payload.layout_upload_link || "").trim())
    missing.push("Layout Upload");
  if (!String(payload.coordinates_upload_link || "").trim())
    missing.push("Coordinates Upload");
  if (!String(payload.kml_upload_link || "").trim()) missing.push("KML Upload");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ11(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ11(payload);

  const sheet = db.getSheetByName("FQ11");
  if (!sheet) throw new Error("Missing sheet: FQ11");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.city || "",
    payload.state || "",
    payload.postal_code || "",
    payload.country || "",
    payload.road_network_residential_localities || "",
    payload.road_width_m || "",
    payload.road_lane || "",
    payload.type_of_road || "",
    payload.road_linkage_from || "",
    payload.road_linkage_to || "",
    payload.parking_requirement || "",
    payload.parking_provision_at_site || "",
    payload.traffic_circulation_plan || "",
    payload.details_of_entry_exit_gates || "",
    payload.parking_photos_url || "",
    payload.traffic_volume_survey_of_roads || "",
    payload.incremental_traffic_from_project_site || "",
    payload.kml_file_url || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ11",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ11",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ11Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ11(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.kml_file_url || "").trim())
    missing.push("KML file of Project");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ13(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ13(payload);

  const sheet = db.getSheetByName("FQ13");
  if (!sheet) throw new Error("Missing sheet: FQ13");

  sheet.appendRow([
    submissionId,
    now,
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.pcode || "",
    payload.project_name || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.additional_report_type || "",
    payload.expected_target_date || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ13",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ13",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ13Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ13(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.additional_report_type || "").trim())
    missing.push("Additional Report Type");
  if (!String(payload.expected_target_date || "").trim())
    missing.push("Expected Target Date");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ15(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ15(payload);

  const sheet = db.getSheetByName("FQ15");
  if (!sheet) throw new Error("Missing sheet: FQ15");

  sheet.appendRow([
    submissionId,
    now,
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.pcode || "",
    payload.project_name || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.cba_sheet_link || "",
    payload.expected_target_date || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId,
    formCode: "FQ15",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now,
    payload,
  });

  appendAuditLog(db, {
    submissionId,
    formCode: "FQ15",
    createdBy: payload.requestor_email || "",
    now,
    payload,
  });

  sendFQ15Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ15(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.cba_sheet_link || "").trim())
    missing.push("CBA sheet link");
  if (!String(payload.expected_target_date || "").trim())
    missing.push("Expected Target Date");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF12(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF12(payload);

  const mainSheet = db.getSheetByName("TF12_main");
  const reviewSheet = db.getSheetByName("TF12_files_to_review");

  if (!mainSheet) throw new Error("Missing sheet: TF12_main");
  if (!reviewSheet) throw new Error("Missing sheet: TF12_files_to_review");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.team_name || "",
    payload.eia_coordinator || "",
    payload.csuite_officer || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.location_of_project || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.stage_of_case || "",
    payload.project_sheet_link || "",
    payload.kml_link || "",
    payload.annexure_folder_link || "",
    payload.initial_pages_link || "",
    payload.target_date_for_review || "",
    payload.remarks || "",
  ]);

  (payload.files_to_be_reviewed || []).forEach(function (row, index) {
    reviewSheet.appendRow([
      submissionId,
      index + 1,
      row.type_of_document || "",
      row.document_link || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF12",
    pcode: payload.pcode || "",
    createdBy: payload.eia_coordinator || payload.team_name || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF12",
    createdBy: payload.eia_coordinator || payload.team_name || "",
    now: now,
    payload: payload,
  });

  sendTF12Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF12(payload) {
  const missing = [];

  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.eia_coordinator || "").trim())
    missing.push("EIA Coordinator");
  if (!String(payload.csuite_officer || "").trim())
    missing.push("C-Suite Officer involved");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.location_of_project || "").trim())
    missing.push("Location of the project");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.stage_of_case || "").trim())
    missing.push("Status/ Stage of the Case");
  if (!String(payload.project_sheet_link || "").trim())
    missing.push("Link to Project Sheet");
  if (!String(payload.kml_link || "").trim()) missing.push("Link to KML");
  if (!String(payload.target_date_for_review || "").trim())
    missing.push("Target Date for review");

  const files = Array.isArray(payload.files_to_be_reviewed)
    ? payload.files_to_be_reviewed
    : [];
  const usableRows = files.filter(function (r) {
    return (
      String(r.type_of_document || "").trim() ||
      String(r.document_link || "").trim()
    );
  });

  if (!usableRows.length) {
    missing.push("Files to be reviewed");
  } else {
    usableRows.forEach(function (row, index) {
      if (!String(row.type_of_document || "").trim()) {
        missing.push(
          `Files to be reviewed - Type of document (row ${index + 1})`,
        );
      }
      if (!String(row.document_link || "").trim()) {
        missing.push(`Files to be reviewed - Link (row ${index + 1})`);
      }
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF17(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF17(payload);

  const mainSheet = db.getSheetByName("TF17_main");
  const inviteeSheet = db.getSheetByName("TF17_person_expert_invited");
  const actionSheet = db.getSheetByName("TF17_action_points");

  if (!mainSheet) throw new Error("Missing sheet: TF17_main");
  if (!inviteeSheet)
    throw new Error("Missing sheet: TF17_person_expert_invited");
  if (!actionSheet) throw new Error("Missing sheet: TF17_action_points");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.eac_seac || "",
    payload.agenda_number || "",
    payload.mom_publish_date || "",
    payload.mom_link || "",
    payload.remarks || "",
  ]);

  (payload.person_expert_invited || []).forEach(function (row, index) {
    inviteeSheet.appendRow([
      submissionId,
      index + 1,
      row.name_of_invitee || "",
      row.email_id_of_invitee || "",
    ]);
  });

  (payload.action_points || []).forEach(function (row, index) {
    actionSheet.appendRow([
      submissionId,
      index + 1,
      row.actionable_point || "",
      row.responsible_person_name || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF17",
    pcode: payload.pcode || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF17",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF17Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF17(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.pcode || "").trim()) missing.push("Project Code");
  if (!String(payload.agenda_number || "").trim())
    missing.push("Agenda Number");
  if (!String(payload.mom_publish_date || "").trim())
    missing.push("MoM publish date");
  if (!String(payload.mom_link || "").trim()) missing.push("MoM link");

  const invitees = Array.isArray(payload.person_expert_invited)
    ? payload.person_expert_invited
    : [];
  const usedInvitees = invitees.filter(function (r) {
    return (
      String(r.name_of_invitee || "").trim() ||
      String(r.email_id_of_invitee || "").trim()
    );
  });

  if (!usedInvitees.length) {
    missing.push("Person/Expert Invited");
  } else {
    usedInvitees.forEach(function (row, index) {
      if (!String(row.name_of_invitee || "").trim())
        missing.push(
          `Person/Expert Invited - Name of Invitee (row ${index + 1})`,
        );
      if (!String(row.email_id_of_invitee || "").trim())
        missing.push(
          `Person/Expert Invited - Email ID of Invitee (row ${index + 1})`,
        );
    });
  }

  const actions = Array.isArray(payload.action_points)
    ? payload.action_points
    : [];
  const usedActions = actions.filter(function (r) {
    return (
      String(r.actionable_point || "").trim() ||
      String(r.responsible_person_name || "").trim()
    );
  });

  if (!usedActions.length) {
    missing.push("Action Points and responsibility");
  } else {
    usedActions.forEach(function (row, index) {
      if (!String(row.actionable_point || "").trim())
        missing.push(
          `Action Points and responsibility - actionable point (row ${index + 1})`,
        );
      if (!String(row.responsible_person_name || "").trim())
        missing.push(
          `Action Points and responsibility - responsible person name (row ${index + 1})`,
        );
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF13(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF13(payload);

  const mainSheet = db.getSheetByName("TF13_main");
  const obsSheet = db.getSheetByName("TF13_observations");
  const filesSheet = db.getSheetByName("TF13_files_reviewed");

  if (!mainSheet) throw new Error("Missing sheet: TF13_main");
  if (!obsSheet) throw new Error("Missing sheet: TF13_observations");
  if (!filesSheet) throw new Error("Missing sheet: TF13_files_reviewed");

  const filesReviewed = Array.isArray(payload.files_reviewed)
    ? payload.files_reviewed
    : [];
  const filesReviewedUsed = filesReviewed.filter(
    (r) =>
      String(r.type_of_document || "").trim() ||
      String(r.document_link || "").trim(),
  );

  mainSheet.appendRow([
    submissionId,
    now,
    payload.recipient_team_name || "",
    payload.eia_coordinator_name || "",
    payload.csuite_officer_name || "",
    payload.project_name || "",
    payload.company_name || "",
    payload.location_of_project || "",
    payload.pcode || "",
    payload.status_stage_of_case || "",
    payload.review_levels || "",
    payload.level1_reviewer_names || "",
    payload.level1_reviewer_remarks || "",
    payload.level2_reviewer_names || "",
    payload.level2_reviewer_remarks || "",
    payload.level3_reviewer_names || "",
    payload.level3_reviewer_remarks || "",
    filesReviewedUsed.length,
    filesReviewedUsed
      .map((r) => r.type_of_document)
      .filter(Boolean)
      .join(", "),
    payload.review_date || "",
    payload.remarks || "",
  ]);

  (payload.level1_observations || []).forEach(function (row, index) {
    obsSheet.appendRow([
      submissionId,
      "Level 1",
      index + 1,
      row.observation_link || "",
    ]);
  });
  (payload.level2_observations || []).forEach(function (row, index) {
    obsSheet.appendRow([
      submissionId,
      "Level 2",
      index + 1,
      row.observation_link || "",
    ]);
  });
  (payload.level3_observations || []).forEach(function (row, index) {
    obsSheet.appendRow([
      submissionId,
      "Level 3",
      index + 1,
      row.observation_link || "",
    ]);
  });

  filesReviewedUsed.forEach(function (row, index) {
    filesSheet.appendRow([
      submissionId,
      index + 1,
      row.type_of_document || "",
      row.document_link || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF13",
    pcode: payload.pcode || "",
    createdBy: payload.eia_coordinator_name || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF13",
    createdBy: payload.eia_coordinator_name || "",
    now: now,
    payload: payload,
  });

  sendTF13Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF13(payload) {
  const missing = [];

  if (!String(payload.recipient_team_name || "").trim())
    missing.push("Recipient Team Name");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator");
  if (!String(payload.csuite_officer_name || "").trim())
    missing.push("C-Suite officer Involved");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.location_of_project || "").trim())
    missing.push("Location of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.status_stage_of_case || "").trim())
    missing.push("Status/ Stage of the Case");
  if (!String(payload.review_levels || "").trim()) missing.push("Review Level");
  if (!String(payload.review_date || "").trim()) missing.push("Review Date");

  const levels = String(payload.review_levels || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  function validateLevel(levelNum, namesField, remarksField, obsField) {
    const selected = levels.includes(`Level ${levelNum}`);
    if (!selected) return;

    if (!String(payload[namesField] || "").trim()) {
      missing.push(`Level-${levelNum} Reviewer Name`);
    }
    if (!String(payload[remarksField] || "").trim()) {
      missing.push(`Level-${levelNum} Reviewer Remarks`);
    }

    const rows = Array.isArray(payload[obsField]) ? payload[obsField] : [];
    const used = rows.filter((r) => String(r.observation_link || "").trim());
    if (!used.length) {
      missing.push(`Level-${levelNum} Reviewer Observations`);
    } else {
      used.forEach(function (row, index) {
        if (!String(row.observation_link || "").trim()) {
          missing.push(
            `Level-${levelNum} Reviewer Observations - link (row ${index + 1})`,
          );
        }
      });
    }
  }

  validateLevel(
    1,
    "level1_reviewer_names",
    "level1_reviewer_remarks",
    "level1_observations",
  );
  validateLevel(
    2,
    "level2_reviewer_names",
    "level2_reviewer_remarks",
    "level2_observations",
  );
  validateLevel(
    3,
    "level3_reviewer_names",
    "level3_reviewer_remarks",
    "level3_observations",
  );

  const filesReviewed = Array.isArray(payload.files_reviewed)
    ? payload.files_reviewed
    : [];
  const filesUsed = filesReviewed.filter(
    (r) =>
      String(r.type_of_document || "").trim() ||
      String(r.document_link || "").trim(),
  );

  if (!filesUsed.length) {
    missing.push("Files Reviewed");
  } else {
    filesUsed.forEach(function (row, index) {
      if (!String(row.type_of_document || "").trim()) {
        missing.push(
          `Files Reviewed - Type of Documents submitted (row ${index + 1})`,
        );
      }
      if (!String(row.document_link || "").trim()) {
        missing.push(`Files Reviewed - Link to document (row ${index + 1})`);
      }
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF04(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF04(payload);

  const mainSheet = db.getSheetByName("TF04_main");
  const detailSheet = db.getSheetByName("TF04_projects_handover");

  if (!mainSheet) throw new Error("Missing sheet: TF04_main");
  if (!detailSheet) throw new Error("Missing sheet: TF04_projects_handover");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.designation || "",
    payload.joining_date || "",
    payload.leaving_or_relieving_date || "",
    payload.reason_for_handover || "",
    payload.team_head_first_name || "",
    payload.team_head_last_name || "",
    payload.team_head_email || "",
    payload.remarks || "",
  ]);

  const projects = Array.isArray(payload.projects_being_handeled)
    ? payload.projects_being_handeled
    : [];
  const usedProjects = projects.filter(function (r) {
    return (
      String(r.project_name || "").trim() ||
      String(r.pcode || "").trim() ||
      String(r.details_of_project || "").trim() ||
      String(r.important_docs_docx_link || "").trim() ||
      String(r.important_docs_pdf_link || "").trim() ||
      String(r.critical_points || "").trim() ||
      String(r.new_contact_person_name || "").trim()
    );
  });

  usedProjects.forEach(function (row, index) {
    detailSheet.appendRow([
      submissionId,
      index + 1,
      row.project_name || "",
      row.pcode || "",
      row.details_of_project || "",
      row.important_docs_docx_link || "",
      row.important_docs_pdf_link || "",
      row.critical_points || "",
      row.new_contact_person_name || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF04",
    pcode: "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF04",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF04Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF04(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.employee_first_name || "").trim())
    missing.push("Employee First Name");
  if (!String(payload.employee_last_name || "").trim())
    missing.push("Employee Last Name");
  if (!String(payload.team_head_email || "").trim())
    missing.push("Team Head Email ID");

  const projects = Array.isArray(payload.projects_being_handeled)
    ? payload.projects_being_handeled
    : [];
  const usedProjects = projects.filter(function (r) {
    return (
      String(r.project_name || "").trim() ||
      String(r.pcode || "").trim() ||
      String(r.details_of_project || "").trim() ||
      String(r.important_docs_docx_link || "").trim() ||
      String(r.important_docs_pdf_link || "").trim() ||
      String(r.critical_points || "").trim() ||
      String(r.new_contact_person_name || "").trim()
    );
  });

  if (!usedProjects.length) {
    missing.push("Details of Projects being handeled");
  } else {
    usedProjects.forEach(function (row, index) {
      if (!String(row.project_name || "").trim())
        missing.push(`Project Name (row ${index + 1})`);
      if (!String(row.pcode || "").trim())
        missing.push(`PCode (row ${index + 1})`);
      if (!String(row.details_of_project || "").trim())
        missing.push(`Details of project (row ${index + 1})`);
      if (!String(row.important_docs_docx_link || "").trim())
        missing.push(`Important documents Docx link (row ${index + 1})`);
      if (!String(row.important_docs_pdf_link || "").trim())
        missing.push(`Important documents PDF link (row ${index + 1})`);
      if (!String(row.new_contact_person_name || "").trim())
        missing.push(`New contact person for project (row ${index + 1})`);
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitADM05(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateADM05(payload);

  const mainSheet = db.getSheetByName("ADM05_main");
  const detailSheet = db.getSheetByName("ADM05_travel_details");

  if (!mainSheet) throw new Error("Missing sheet: ADM05_main");
  if (!detailSheet) throw new Error("Missing sheet: ADM05_travel_details");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.purpose_of_travel || "",
    payload.purpose_of_travel_other || "",
    payload.trip_type || "",
    payload.visit_start_date || "",
    payload.visit_end_date || "",
    payload.travel_in_scope_of || "",
    payload.total_ticket_amount || "",
    payload.lodging_food_in_scope_of || "",
    payload.total_hotel_amount || "",
    payload.remarks || "",
  ]);

  const legs = [{ key: "onward", data: payload.onward || {} }];
  if (String(payload.trip_type || "") !== "One way") {
    legs.push({ key: "return", data: payload.return || {} });
  }

  legs.forEach(function (leg) {
    const d = leg.data || {};

    const row = [
      submissionId,
      leg.key === "onward" ? "Onward" : "Return",
      d.date_of_travel || "",
      d.name_of_person_travelling || "",
      d.source_city_name || "",
      d.destination_city_name || "",
      d.mode_of_travel || "",
      d.airline_name || "",
      d.flight_number || "",
      d.departure_terminal || "",
      d.departure_time || "",
      d.arrival_time || "",
      d.excess_baggage_required || "",
      d.ticket_price_per_person || "",
      d.train_name_and_number || "",
      d.departure_railway_station_name_and_code || "",
      d.arrival_railway_station_name_and_code || "",
      d.train_departure_time || "",
      d.train_arrival_time || "",
      d.bus_service_provider_name || "",
      d.bus_departure_point || "",
      d.bus_departure_time || "",
      d.bus_arrival_time || "",
      d.bus_ticket_price_per_person || "",
    ];

    if (leg.key === "onward") {
      row.push(
        d.hotel_booking_required || "",
        d.check_in_date || "",
        d.check_out_date || "",
        d.occupancy || "",
        d.preferred_hotel_name || "",
        d.tariff_per_night || "",
      );
    } else {
      row.push("", "", "", "", "", "");
    }

    detailSheet.appendRow(row);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ADM05",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ADM05",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendADM05Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateADM05(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Email Id of the requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.pcode || "").trim()) missing.push("Project Code");
  if (!String(payload.purpose_of_travel || "").trim())
    missing.push("Purpose of travel");
  if (!String(payload.trip_type || "").trim()) missing.push("Trip Type");
  if (!String(payload.visit_start_date || "").trim())
    missing.push("Visit Start Date");
  if (!String(payload.visit_end_date || "").trim())
    missing.push("Visit End Date");
  if (!String(payload.travel_in_scope_of || "").trim())
    missing.push("Travel in scope of");
  if (!String(payload.total_ticket_amount || "").trim())
    missing.push(
      String(payload.trip_type || "") === "One way"
        ? "Total Amount for ticket booking (One way)"
        : "Total Amount for ticket booking (To & Fro)",
    );
  if (!String(payload.lodging_food_in_scope_of || "").trim())
    missing.push("Lodging/ Food in scope of");
  if (!String(payload.total_hotel_amount || "").trim())
    missing.push("Total amount for Hotel booking");

  if (
    payload.purpose_of_travel === "Others" &&
    !String(payload.purpose_of_travel_other || "").trim()
  ) {
    missing.push("If Others (Pls specify)");
  }

  function validateLeg(legLabel, leg) {
    const d = leg || {};

    if (!String(d.date_of_travel || "").trim())
      missing.push(`${legLabel} - Date of travel`);
    if (!String(d.name_of_person_travelling || "").trim())
      missing.push(`${legLabel} - Name of person travelling`);
    if (!String(d.source_city_name || "").trim())
      missing.push(`${legLabel} - Source city name`);
    if (!String(d.destination_city_name || "").trim())
      missing.push(`${legLabel} - Destination city name`);
    if (!String(d.mode_of_travel || "").trim())
      missing.push(`${legLabel} - Mode of travel`);

    const mode = String(d.mode_of_travel || "").toLowerCase();

    if (mode === "air") {
      if (!String(d.airline_name || "").trim())
        missing.push(`${legLabel} - Airline name`);
      if (!String(d.flight_number || "").trim())
        missing.push(`${legLabel} - Flight number`);
      if (!String(d.departure_terminal || "").trim())
        missing.push(`${legLabel} - Departure terminal`);
      if (!String(d.departure_time || "").trim())
        missing.push(`${legLabel} - Departure time`);
      if (!String(d.arrival_time || "").trim())
        missing.push(`${legLabel} - Arrival time`);
      if (!String(d.excess_baggage_required || "").trim())
        missing.push(`${legLabel} - Whether excess baggage required`);
      if (!String(d.ticket_price_per_person || "").trim())
        missing.push(`${legLabel} - Ticket price per person`);
    }

    if (mode === "train") {
      if (!String(d.train_name_and_number || "").trim())
        missing.push(`${legLabel} - Train name and number`);
      if (!String(d.departure_railway_station_name_and_code || "").trim())
        missing.push(`${legLabel} - Departure railway station name and code`);
      if (!String(d.arrival_railway_station_name_and_code || "").trim())
        missing.push(`${legLabel} - Arrival railway station and code`);
      if (!String(d.train_departure_time || "").trim())
        missing.push(`${legLabel} - Departure time`);
      if (!String(d.train_arrival_time || "").trim())
        missing.push(`${legLabel} - Arrival time`);
      if (!String(d.ticket_price_per_person || "").trim())
        missing.push(`${legLabel} - Ticket price per person`);
    }

    if (mode === "bus") {
      if (!String(d.bus_service_provider_name || "").trim())
        missing.push(`${legLabel} - Bus service provider name`);
      if (!String(d.bus_departure_point || "").trim())
        missing.push(`${legLabel} - Departure point`);
      if (!String(d.bus_departure_time || "").trim())
        missing.push(`${legLabel} - Departure time`);
      if (!String(d.bus_arrival_time || "").trim())
        missing.push(`${legLabel} - Arrival time`);
      if (!String(d.bus_ticket_price_per_person || "").trim())
        missing.push(`${legLabel} - Per person ticket price`);
    }

    if (String(d.hotel_booking_required || "").toLowerCase() === "yes") {
      if (!String(d.check_in_date || "").trim())
        missing.push(`${legLabel} - Check-in date`);
      if (!String(d.check_out_date || "").trim())
        missing.push(`${legLabel} - Check-out date`);
      if (!String(d.occupancy || "").trim())
        missing.push(`${legLabel} - Occupancy`);
      if (!String(d.preferred_hotel_name || "").trim())
        missing.push(`${legLabel} - Preferred hotel name`);
      if (!String(d.tariff_per_night || "").trim())
        missing.push(`${legLabel} - Tariff per night`);
    }
  }

  validateLeg("Travel booking details - onward", payload.onward);
  if (String(payload.trip_type || "") !== "One way") {
    validateLeg("Travel booking details - return", payload.return);
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF18(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF18(payload);

  const sheet = db.getSheetByName("TF18");
  if (!sheet) throw new Error("Missing sheet: TF18");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.site_address_line1 || "",
    payload.site_address_line2 || "",
    payload.site_city || "",
    payload.site_state || "",
    payload.site_zipcode || "",
    payload.site_country || "",
    payload.pcode || "",
    payload.contact_person_first_name || "",
    payload.contact_person_last_name || "",
    payload.contact_detail_of_contact_person || "",
    payload.project_incharge_first_name || "",
    payload.project_incharge_last_name || "",
    payload.brief_description_of_project || "",
    payload.baseline_season || "",
    payload.baseline_season_other_specify || "",
    payload.baseline_season_start_date || "",
    payload.baseline_season_end_date || "",
    payload.date_of_monitoring || "",
    payload.tor_specific_requirements || "",
    payload.socio_economy_requirements || "",
    payload.eb_requirements || "",
    payload.eb_requirement_specifications || "",
    payload.eb_requirement_remark || "",
    payload.upload_topo_sheet_link || "",
    payload.upload_kml_file_link || "",
    payload.upload_environmental_sensitivity_file_link || "",
    payload.any_other_details_required_from_site || "",
    payload.scope_of_travelling_boarding_lodging || "",
    payload.completion_target_date || "",
    payload.critical_parameters_if_any || "",
    payload.sampling_plan_details_link || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF18",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF18",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendTF18Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF18(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim()) missing.push("Email");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.site_address_line1 || "").trim())
    missing.push("Site Address");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.contact_person_first_name || "").trim())
    missing.push("Name of contact person");
  if (!String(payload.contact_detail_of_contact_person || "").trim())
    missing.push("Contact detail of contact person");
  if (!String(payload.project_incharge_first_name || "").trim())
    missing.push("Project Incharge name");
  if (!String(payload.brief_description_of_project || "").trim())
    missing.push("Brief description of Project");
  if (!String(payload.baseline_season || "").trim())
    missing.push("Baseline / Project specific monitoring season");
  const baselineValue = String(payload.baseline_season || "").toLowerCase();

  if (baselineValue === "others") {
    if (!String(payload.baseline_season_other_specify || "").trim()) {
      missing.push("Baseline season specify");
    }
    if (!String(payload.baseline_season_start_date || "").trim()) {
      missing.push("Baseline Season Start Date");
    }
    if (!String(payload.baseline_season_end_date || "").trim()) {
      missing.push("Baseline Season End Date");
    }
  }
  if (!String(payload.tor_specific_requirements || "").trim())
    missing.push("TOR Specific Requirements");
  if (!String(payload.socio_economy_requirements || "").trim())
    missing.push("Socio Economy requirements");
  if (!String(payload.eb_requirements || "").trim())
    missing.push("EB requirements");
  if (!String(payload.any_other_details_required_from_site || "").trim())
    missing.push("Any other Details required from Site");
  if (!String(payload.scope_of_travelling_boarding_lodging || "").trim())
    missing.push("Scope of Travelling, Boarding, Lodging, etc");
  if (!String(payload.completion_target_date || "").trim())
    missing.push("Completion target Date");
  if (!String(payload.critical_parameters_if_any || "").trim())
    missing.push("Critical Parameters if any");
  if (!String(payload.upload_kml_file_link || "").trim())
    missing.push("Upload KML file");
  if (!String(payload.upload_environmental_sensitivity_file_link || "").trim())
    missing.push("Upload Environmental Sensitivity file");
  if (!String(payload.sampling_plan_details_link || "").trim())
    missing.push("Sampling Plan Details");

  if (
    String(payload.baseline_season || "").toLowerCase() === "others" &&
    !String(payload.baseline_season_other_specify || "").trim()
  ) {
    missing.push("Baseline season specify");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitADM09(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateADM09Server(payload);

  const mainSheet = db.getSheetByName("ADM09_main");
  const peopleSheet = db.getSheetByName("ADM09_people");
  const projectsSheet = db.getSheetByName("ADM09_projects");

  if (!mainSheet) throw new Error("Missing sheet: ADM09_main");
  if (!peopleSheet) throw new Error("Missing sheet: ADM09_people");
  if (!projectsSheet) throw new Error("Missing sheet: ADM09_projects");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.employee_id || "",
    payload.visit_type || "",
    payload.place_visited || "",
    payload.last_visit_date || "",
    payload.next_visit_planned_date || "",
    payload.key_personnel_with_whom_communicated || "",
    payload.details_of_visit || "",
    payload.action_required_expected_update || "",
    payload.remarks || "",
  ]);

  const peopleRows = Array.isArray(payload.people) ? payload.people : [];
  const usedPeople = peopleRows.filter(function (r) {
    return (
      String(r.name_of_person || "").trim() ||
      String(r.email_id_of_person || "").trim()
    );
  });

  usedPeople.forEach(function (r, index) {
    peopleSheet.appendRow([
      submissionId,
      index + 1,
      r.name_of_person || "",
      r.email_id_of_person || "",
    ]);
  });

  const projectRows = Array.isArray(payload.projects) ? payload.projects : [];
  const usedProjects = projectRows.filter(function (r) {
    return (
      String(r.project_name || "").trim() ||
      String(r.pcode || "").trim() ||
      String(r.outcome_of_visit || "").trim()
    );
  });

  usedProjects.forEach(function (r, index) {
    projectsSheet.appendRow([
      submissionId,
      index + 1,
      r.project_name || "",
      r.pcode || "",
      r.outcome_of_visit || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ADM09",
    pcode: firstPcodeFromADM09(payload),
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ADM09",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendADM09Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateADM09Server(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Email ID of Employee");
  if (!String(payload.employee_id || "").trim()) missing.push("Employee ID");
  if (!String(payload.visit_type || "").trim()) missing.push("Visit Type");
  if (!String(payload.place_visited || "").trim())
    missing.push("Place Visited");
  if (!String(payload.last_visit_date || "").trim())
    missing.push("Last visit date");
  if (!String(payload.next_visit_planned_date || "").trim())
    missing.push("Next visit planned date");
  if (!String(payload.key_personnel_with_whom_communicated || "").trim())
    missing.push("Key personnel with whom we communicated in ministry");
  if (!String(payload.details_of_visit || "").trim())
    missing.push("Details of visit");
  if (!String(payload.action_required_expected_update || "").trim())
    missing.push("Action required / expected update");

  const peopleRows = Array.isArray(payload.people) ? payload.people : [];
  const usedPeople = peopleRows.filter(function (r) {
    return (
      String(r.name_of_person || "").trim() ||
      String(r.email_id_of_person || "").trim()
    );
  });

  if (!usedPeople.length) {
    missing.push("Name email of person");
  } else {
    usedPeople.forEach(function (r, i) {
      if (!String(r.name_of_person || "").trim())
        missing.push(`Name of person (row ${i + 1})`);
      if (!String(r.email_id_of_person || "").trim())
        missing.push(`Email ID of person (row ${i + 1})`);
    });
  }

  const projectRows = Array.isArray(payload.projects) ? payload.projects : [];
  const usedProjects = projectRows.filter(function (r) {
    return (
      String(r.project_name || "").trim() ||
      String(r.pcode || "").trim() ||
      String(r.outcome_of_visit || "").trim()
    );
  });

  if (!usedProjects.length) {
    missing.push("Relevant Project Details");
  } else {
    usedProjects.forEach(function (r, i) {
      if (!String(r.project_name || "").trim())
        missing.push(`Project Name (row ${i + 1})`);
      if (!String(r.pcode || "").trim()) missing.push(`PCODE (row ${i + 1})`);
      if (!String(r.outcome_of_visit || "").trim())
        missing.push(`Outcome of the Visit (row ${i + 1})`);
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function firstPcodeFromADM09(payload) {
  const rows = Array.isArray(payload.projects) ? payload.projects : [];
  for (const row of rows) {
    if (row && String(row.pcode || "").trim()) return row.pcode;
  }
  return "";
}

function submitTF19(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();
  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF19(payload);

  const mainSheet = db.getSheetByName("TF19_main");
  const eiaSheet = db.getSheetByName("TF19_eia_coordinators");
  const faeASheet = db.getSheetByName("TF19_fae_catA");
  const faeBSheet = db.getSheetByName("TF19_fae_catB");
  const faaSheet = db.getSheetByName("TF19_faa");
  const teamSheet = db.getSheetByName("TF19_team_members");
  if (!mainSheet) throw new Error("Missing sheet: TF19_main");
  if (!eiaSheet) throw new Error("Missing sheet: TF19_eia_coordinators");
  if (!faeASheet) throw new Error("Missing sheet: TF19_fae_catA");
  if (!faeBSheet) throw new Error("Missing sheet: TF19_fae_catB");
  if (!faaSheet) throw new Error("Missing sheet: TF19_faa");
  if (!teamSheet) throw new Error("Missing sheet: TF19_team_members");

  appendObjectRow(
    mainSheet,
    {
      date: payload.date || "",
      requestor_first_name: payload.requestor_first_name || "",
      requestor_last_name: payload.requestor_last_name || "",
      official_email: payload.official_email || "",
      client_name: payload.client_name || "",
      project_name: payload.project_name || "",
      site_address_line1: payload.site_address_line1 || "",
      site_address_line2: payload.site_address_line2 || "",
      site_city: payload.site_city || "",
      site_state: payload.site_state || "",
      site_zipcode: payload.site_zipcode || "",
      site_country: payload.site_country || "",
      pcode: payload.pcode || "",
      team_name: payload.team_name || "",
      sector: payload.sector || "",
      category: payload.category || "",
      type_of_work: payload.type_of_work || "",
      eac_name: payload.eac_name || "",
      stage_of_case: payload.stage_of_case || "",
      project_sheet_link: payload.project_sheet_link || "",
      kml_link: payload.kml_link || "",
      target_date_for_review: payload.target_date_for_review || "",
      initial_pages_word_link: payload.initial_pages_word_link || "",
      initial_pages_pdf_link: payload.initial_pages_pdf_link || "",
      signed_copy_initial_pages_url:
        payload.signed_copy_initial_pages_url || "",
      remarks: payload.remarks || "",
    },
    { submissionId, createdBy: payload.official_email || "", now },
  );

  appendRowsFromArray(eiaSheet, payload.eia_rows || [], {
    submissionId,
    createdBy: payload.official_email || "",
    now,
  });
  appendRowsFromArray(faeASheet, payload.faeA_rows || [], {
    submissionId,
    createdBy: payload.official_email || "",
    now,
  });
  appendRowsFromArray(faeBSheet, payload.faeB_rows || [], {
    submissionId,
    createdBy: payload.official_email || "",
    now,
  });
  appendRowsFromArray(faaSheet, payload.faa_rows || [], {
    submissionId,
    createdBy: payload.official_email || "",
    now,
  });
  appendRowsFromArray(teamSheet, payload.team_rows || [], {
    submissionId,
    createdBy: payload.official_email || "",
    now,
  });

  appendSubmissionLedger(db, {
    submissionId,
    formCode: "TF19",
    pcode: payload.pcode || "",
    createdBy: payload.official_email || "",
    now,
    payload,
  });

  appendAuditLog(db, {
    submissionId,
    formCode: "TF19",
    createdBy: payload.official_email || "",
    now,
    payload,
  });

  sendTF19Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF19(payload) {
  const missing = [];
  if (!String(payload.official_email || "").trim())
    missing.push("Official Email ID of requestor");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");

  checkTF19PeopleRows(
    payload.eia_rows,
    "Details of EIA Coordinators & Assistants to EIA Coordinators",
    true,
    missing,
  );
  checkTF19PeopleRows(
    payload.faeA_rows,
    "Details for Category A FAEs",
    false,
    missing,
  );
  checkTF19PeopleRows(
    payload.faeB_rows,
    "Details for Category B FAEs",
    false,
    missing,
  );
  checkTF19PeopleRows(payload.faa_rows, "Details of FAA", false, missing);
  checkTF19PeopleRows(
    payload.team_rows,
    "Details of Team members",
    false,
    missing,
  );

  if (missing.length) throw new Error("Please fill:\n\n" + missing.join("\n"));
}

function checkTF19PeopleRows(rows, label, isEia, missing) {
  rows = Array.isArray(rows) ? rows : [];
  const usable = rows.filter(
    (r) =>
      String(r.name || "").trim() ||
      String(r.functional_area || "").trim() ||
      String(r.assistant_name || "").trim() ||
      String(r.assistant_email || "").trim(),
  );
  // Empty sections are allowed — no "at least one row" requirement.
  usable.forEach(function (r, i) {
    if (!String(r.name || "").trim())
      missing.push(`${label} - Name (row ${i + 1})`);
    if (!isEia) {
      if (!String(r.functional_area || "").trim())
        missing.push(`${label} - Functional Area (row ${i + 1})`);
    }
  });
}

function submitTF08(payload) {
  const db = getDB();
  const sheet = db.getSheetByName("TF08");
  if (!sheet) throw new Error("Missing sheet: TF08");

  payload = payload || {};
  validateTF08(payload);

  const now = new Date();
  const submissionId = Utilities.getUuid();
  payload.submission_id = submissionId;

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.project_proponent_first_name || "",
    payload.project_proponent_last_name || "",
    payload.proposed_project_cost_lacs || "",
    payload.existing_project_cost_lacs || "",
    payload.project_cost_after_proposed_ec_lacs || "",
    payload.plot_area_sq_m || "",
    payload.built_up_area_sq_m || "",
    payload.capacity || "",
    payload.emp_cost_capital_lacs || "",
    payload.type_of_work || "",
    payload.type_of_work_other || "",
    payload.project_folder_link || "",
    payload.milestone_achieved || "",
    payload.milestone_achieved_other || "",
    payload.parivesh_login_id || "",
    payload.parivesh_password || "",
    payload.proposal_number || "",
    payload.appraising_committee || "",
    payload.eds_ads_count || "",
    payload.appraisals_with_dates || "",
    payload.project_sheet_link || "",
    payload.tor_application_pdf_link || "",
    payload.tor_agenda_pdf_link || "",
    payload.tor_presentation_ppt_link || "",
    payload.tor_presentation_pdf_link || "",
    payload.tor_mom_pdf_link || "",
    payload.tor_letter_pdf_link || "",
    payload.form1a_docx_link || "",
    payload.form1a_pdf_link || "",
    payload.form1b_docx_link || "",
    payload.form1b_pdf_link || "",
    payload.form1c_docx_link || "",
    payload.form1c_pdf_link || "",
    payload.ph_document_pdf_link || "",
    payload.ph_ppt_link || "",
    payload.ph_ppt_pdf_link || "",
    payload.ph_advertisement_pdf_link || "",
    payload.ph_mom_pdf_link || "",
    payload.final_eia_emp_docx_link || "",
    payload.final_eia_emp_pdf_link || "",
    payload.agenda_pdf_link || "",
    payload.circulation_docs_docx_link || "",
    payload.circulation_docs_pdf_link || "",
    payload.final_master_presentation_ppt_link || "",
    payload.final_master_presentation_pdf_link || "",
    payload.final_summarised_presentation_pdf_link || "",
    payload.post_eac_submittals_pdf_link || "",
    payload.eac_seiaa_seac_mom_pdf_link || "",
    payload.project_completion_certificate_pdf_link || "",
    payload.project_feedback_pdf_link || "",
    payload.final_ec_letter_pdf_link || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF08",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF08",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF08Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF08(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");
  if (!String(payload.parivesh_login_id || "").trim())
    missing.push("Parivesh Login ID");

  if (
    String(payload.type_of_work || "").toLowerCase() === "others" &&
    !String(payload.type_of_work_other || "").trim()
  ) {
    missing.push("Type of Work — pls specify");
  }

  if (
    String(payload.milestone_achieved || "").toLowerCase() === "other" &&
    !String(payload.milestone_achieved_other || "").trim()
  ) {
    missing.push("Milestone Achieved — pls specify");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF26(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF26(payload);

  const sheet = db.getSheetByName("TF26");
  if (!sheet) throw new Error("Missing sheet: TF26");

  sheet.appendRow([
    submissionId,
    now,
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.eia_word_link || "",
    payload.eia_gdoc_link || "",
    payload.eia_pdf_link || "",
    payload.eia_single_file_with_annexure_link || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF26",
    pcode: payload.project_code || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF26",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendTF26Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF26(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the Project");
  if (!String(payload.project_code || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");
  if (!String(payload.eia_word_link || "").trim())
    missing.push("Link to EIA MS Word file");
  if (!String(payload.eia_gdoc_link || "").trim())
    missing.push("Link to EIA Google Doc file");
  if (!String(payload.eia_pdf_link || "").trim())
    missing.push("Link to EIA PDF file");
  if (!String(payload.eia_single_file_with_annexure_link || "").trim())
    missing.push("Link to EIA Single File with Annexure");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF15(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF15(payload);

  const mainSheet = db.getSheetByName("TF15_main");
  const inviteeSheet = db.getSheetByName("TF15_person_expert_invited");
  const actionSheet = db.getSheetByName("TF15_action_points");

  if (!mainSheet) throw new Error("Missing sheet: TF15_main");
  if (!inviteeSheet)
    throw new Error("Missing sheet: TF15_person_expert_invited");
  if (!actionSheet) throw new Error("Missing sheet: TF15_action_points");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.meeting_date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.eac_seac || "",
    payload.eia_coordinator_name || "",
    payload.mom_link || "",
    payload.remarks || "",
  ]);

  (payload.person_expert_invited || []).forEach(function (row, index) {
    inviteeSheet.appendRow([
      submissionId,
      index + 1,
      row.name_of_invitee || "",
      row.email_id_of_invitee || "",
    ]);
  });

  (payload.action_points || []).forEach(function (row, index) {
    actionSheet.appendRow([
      submissionId,
      index + 1,
      row.actionable_point || "",
      row.responsible_person_name || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF15",
    pcode: payload.pcode || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF15",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF15Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF15(payload) {
  const missing = [];

  if (!String(payload.meeting_date || "").trim())
    missing.push("Date of Meeting");
  if (!String(payload.employee_email || "").trim())
    missing.push("Official Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the Project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator");
  if (!String(payload.mom_link || "").trim()) missing.push("MoM link");

  const invitees = Array.isArray(payload.person_expert_invited)
    ? payload.person_expert_invited
    : [];
  const usedInvitees = invitees.filter(function (r) {
    return (
      String(r.name_of_invitee || "").trim() ||
      String(r.email_id_of_invitee || "").trim()
    );
  });

  if (!usedInvitees.length) {
    missing.push("Person/Expert Invited");
  } else {
    usedInvitees.forEach(function (row, index) {
      if (!String(row.name_of_invitee || "").trim())
        missing.push(
          `Person/Expert Invited - Name of Invitee (row ${index + 1})`,
        );
      if (!String(row.email_id_of_invitee || "").trim())
        missing.push(
          `Person/Expert Invited - Email ID of Invitee (row ${index + 1})`,
        );
    });
  }

  const actions = Array.isArray(payload.action_points)
    ? payload.action_points
    : [];
  const usedActions = actions.filter(function (r) {
    return (
      String(r.actionable_point || "").trim() ||
      String(r.responsible_person_name || "").trim()
    );
  });

  if (!usedActions.length) {
    missing.push("Action Points and responsibility");
  } else {
    usedActions.forEach(function (row, index) {
      if (!String(row.actionable_point || "").trim())
        missing.push(
          `Action Points and responsibility - actionable point (row ${index + 1})`,
        );
      if (!String(row.responsible_person_name || "").trim())
        missing.push(
          `Action Points and responsibility - responsible person name (row ${index + 1})`,
        );
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitTF14(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF14(payload);

  const mainSheet = db.getSheetByName("TF14_main");
  const inviteeSheet = db.getSheetByName("TF14_person_expert_invited");

  if (!mainSheet) throw new Error("Missing sheet: TF14_main");
  if (!inviteeSheet)
    throw new Error("Missing sheet: TF14_person_expert_invited");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.meeting_date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.eac_seac || "",
    payload.eia_coordinator_name || "",
    payload.level_of_coordination_meeting || "",
    payload.agenda_of_coordination_meeting || "",
    payload.meeting_link || "",
  ]);

  (payload.person_expert_invited || []).forEach(function (row, index) {
    inviteeSheet.appendRow([
      submissionId,
      index + 1,
      row.name_of_invitee || "",
      row.email_id_of_invitee || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF14",
    pcode: payload.pcode || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF14",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF14Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF14(payload) {
  const missing = [];

  if (!String(payload.meeting_date || "").trim())
    missing.push("Date of Meeting");
  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Official Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the Project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.eia_coordinator_name || "").trim())
    missing.push("EIA Coordinator Name");
  if (!String(payload.level_of_coordination_meeting || "").trim())
    missing.push("Level of Coordination Meeting");
  if (!String(payload.agenda_of_coordination_meeting || "").trim())
    missing.push("Agenda of Coordination Meeting");

  const invitees = Array.isArray(payload.person_expert_invited)
    ? payload.person_expert_invited
    : [];
  const usedInvitees = invitees.filter(function (r) {
    return (
      String(r.name_of_invitee || "").trim() ||
      String(r.email_id_of_invitee || "").trim()
    );
  });

  if (!usedInvitees.length) {
    missing.push("Person/Expert Invited");
  } else {
    usedInvitees.forEach(function (row, index) {
      if (!String(row.name_of_invitee || "").trim())
        missing.push(
          `Person/Expert Invited - Name of Invitee (row ${index + 1})`,
        );
      if (!String(row.email_id_of_invitee || "").trim())
        missing.push(
          `Person/Expert Invited - Email ID of Invitee (row ${index + 1})`,
        );
    });
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitHR03(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateHR03(payload);

  const sheet = db.getSheetByName("HR03");
  if (!sheet) throw new Error("Missing sheet: HR03");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.job_title || "",
    payload.no_of_post || "",
    payload.existing_staff_in_category || "",
    payload.location || "",
    payload.type_of_appointment || "",
    payload.educational_qualifications_required || "",
    payload.skills_required || "",
    payload.experience_required || "",
    payload.job_description || "",
    payload.date_resource_required || "",
    payload.vacancy_caused_due_to || "",
    payload.internal_transfer_possible || "",
    payload.position_approval_status || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "HR03",
    pcode: "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "HR03",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendHR03Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateHR03(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Requestor Email ID");
  if (!String(payload.team_name || "").trim())
    missing.push("Team / Department");
  if (!String(payload.job_title || "").trim()) missing.push("Job Title");
  if (!String(payload.no_of_post || "").trim()) missing.push("No. of Posts");
  if (!String(payload.existing_staff_in_category || "").trim())
    missing.push("Existing Staff in this Category");
  if (!String(payload.location || "").trim()) missing.push("Location");
  if (!String(payload.type_of_appointment || "").trim())
    missing.push("Type of Appointment");
  if (!String(payload.educational_qualifications_required || "").trim())
    missing.push("Educational / Professional Qualifications Required");
  if (!String(payload.skills_required || "").trim())
    missing.push("Skills Required");
  if (!String(payload.experience_required || "").trim())
    missing.push("Experience Required");
  if (!String(payload.job_description || "").trim())
    missing.push("Job Description");
  if (!String(payload.date_resource_required || "").trim())
    missing.push("Date by which Resource is Required");
  if (!String(payload.vacancy_caused_due_to || "").trim())
    missing.push("Vacancy caused due to");
  if (!String(payload.internal_transfer_possible || "").trim())
    missing.push(
      "Can vacancy be filled through internal transfers / promotion?",
    );
  if (!String(payload.position_approval_status || "").trim())
    missing.push("Is Position Approved?");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitFQ05(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ05(payload);

  const sheet = db.getSheetByName("FQ05");
  if (!sheet) throw new Error("Missing sheet: FQ05");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.type_of_development || "",
    payload.type_of_development_other || "",
    payload.area_of_project_m2 || "",
    payload.green_area_percentage || "",
    payload.green_area_status || "",
    payload.existing_trees_shrub_grass_list || "",
    payload.flora_fauna_list_url || "",
    payload.primary_site_visit_report_url || "",
    payload.kml_file_url || "",
    payload.lulc_map_url || "",
    payload.dem_url || "",
    payload.topo_map_url || "",
    payload.drainage_map_url || "",
    payload.forest_cover_map_url || "",
    payload.moisture_conservation_map_url || "",
    payload.fire_prone_area_map_url || "",
    payload.project_sheet_url || "",
    payload.other_project_area_maps_url || "",
    payload.coordinate_details_chapter2 || "",
    payload.eb_tor_point_details || "",
    payload.requirement || "",
    payload.requirement_other || "",
    payload.environment_sensitivity_sheet_url || "",
    payload.eb_sheet_url || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "FQ05",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "FQ05",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendFQ05Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ05(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.category || "").trim()) missing.push("Category");
  if (!String(payload.sector || "").trim()) missing.push("Sector");
  if (!String(payload.eac_name || "").trim()) missing.push("EAC Name");

  if (
    String(payload.type_of_development || "").trim() === "Other" &&
    !String(payload.type_of_development_other || "").trim()
  ) {
    missing.push("If Others (Specify) - Type of Development");
  }

  [
    ["primary_site_visit_report_url", "Primary Site visit data / report"],
    ["kml_file_url", "KML file"],
    ["project_sheet_url", "Project Sheet link"],
    ["eb_sheet_url", "EB sheet link"],
  ].forEach(function ([key, label]) {
    if (!String(payload[key] || "").trim()) missing.push(label);
  });

  // Category-driven required uploads
  const category = String(payload.category || "").trim();
  const categoryUploadRules = {
    A: [
      ["lulc_map_url", "LULC map"],
      ["dem_url", "DEM"],
      ["topo_map_url", "TOPO map"],
      ["drainage_map_url", "Drainage map"],
      ["forest_cover_map_url", "Forest Cover map"],
      ["moisture_conservation_map_url", "Moisture Conservation map"],
      ["fire_prone_area_map_url", "Fire Prone Area map"],
    ],
    B1: [
      ["lulc_map_url", "LULC map"],
      ["dem_url", "DEM"],
      ["topo_map_url", "TOPO map"],
      ["drainage_map_url", "Drainage map"],
      ["forest_cover_map_url", "Forest Cover map"],
    ],
    B2: [
      ["lulc_map_url", "LULC map"],
      ["dem_url", "DEM"],
      ["topo_map_url", "TOPO map"],
      ["drainage_map_url", "Drainage map"],
      ["forest_cover_map_url", "Forest Cover map"],
    ],
  };

  (categoryUploadRules[category] || []).forEach(function ([key, label]) {
    if (!String(payload[key] || "").trim()) missing.push(label);
  });

  if (!String(payload.requirement || "").trim()) missing.push("Requirement");
  if (
    String(payload.requirement || "").trim() === "other" &&
    !String(payload.requirement_other || "").trim()
  ) {
    missing.push("Other requirement");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitADM01(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateADM01(payload);

  const mainSheet = db.getSheetByName("ADM01_main");
  const hotelSheet = db.getSheetByName("ADM01_hotel");
  const foodSheet = db.getSheetByName("ADM01_food");
  const vehicleSheet = db.getSheetByName("ADM01_vehicle");

  if (!mainSheet) throw new Error("Missing sheet: ADM01_main");
  if (!hotelSheet) throw new Error("Missing sheet: ADM01_hotel");
  if (!foodSheet) throw new Error("Missing sheet: ADM01_food");
  if (!vehicleSheet) throw new Error("Missing sheet: ADM01_vehicle");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.project_name || "",
    payload.pcode || "",
    payload.client_first_name || "",
    payload.client_last_name || "",
    payload.client_mobile_code || "",
    payload.client_mobile_number || "",
    payload.date_of_arrival || "",
    payload.date_of_departure || "",
    payload.no_of_persons_visiting || "",
    payload.purpose_of_visit || "",
    payload.conference_room_required || "",
    payload.conference_room_dates || "",
    payload.requirements || "",
    payload.remarks || "",
  ]);

  if (payload.hotel_booking) {
    const h = payload.hotel_booking;
    hotelSheet.appendRow([
      submissionId,
      now,
      payload.pcode || "",
      h.guest_name || "",
      h.check_in_date || "",
      h.check_out_date || "",
      h.payment_due_by || "",
    ]);
  }

  if (payload.food_arrangements) {
    const f = payload.food_arrangements;
    foodSheet.appendRow([
      submissionId,
      now,
      payload.pcode || "",
      f.meal_type || "",
      f.date || "",
      f.no_of_clients || "",
    ]);
  }

  if (payload.vehicle) {
    const v = payload.vehicle;
    vehicleSheet.appendRow([
      submissionId,
      now,
      payload.pcode || "",
      v.pickup_date || "",
      v.end_date || "",
      v.no_of_visitors || "",
      v.pickup_time || "",
      v.pickup_point || "",
      v.place_to_visit || "",
      v.other_details || "",
    ]);
  }

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ADM01",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ADM01",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendADM01Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateADM01(payload) {
  const missing = [];

  if (!String(payload.date || "").trim()) missing.push("Date");
  if (!String(payload.requestor_first_name || "").trim())
    missing.push("Name of Requester - First Name");
  if (!String(payload.requestor_last_name || "").trim())
    missing.push("Name of Requester - Last Name");
  if (!String(payload.requestor_email || "").trim())
    missing.push("Email of Requester");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.project_name || "").trim()) missing.push("Project Name");
  if (!String(payload.pcode || "").trim()) missing.push("P Code");
  if (!String(payload.client_first_name || "").trim())
    missing.push("Client Name - First Name");
  if (!String(payload.client_last_name || "").trim())
    missing.push("Client Name - Last Name");
  if (!String(payload.client_mobile_number || "").trim())
    missing.push("Client Mobile Number");

  if (
    String(payload.conference_room_required || "").toLowerCase() === "yes" &&
    !String(payload.conference_room_dates || "").trim()
  ) {
    missing.push("Conference Room dates");
  }

  if (payload.hotel_booking) {
    const h = payload.hotel_booking;
    if (!String(h.guest_name || "").trim())
      missing.push("Hotel Booking - Guest Name");
    if (!String(h.check_in_date || "").trim())
      missing.push("Hotel Booking - Check-in Date");
    if (!String(h.check_out_date || "").trim())
      missing.push("Hotel Booking - Check-out Date");
    if (!String(h.payment_due_by || "").trim())
      missing.push("Hotel Booking - Payment Due By");
  }

  if (payload.food_arrangements) {
    const f = payload.food_arrangements;
    if (!String(f.meal_type || "").trim())
      missing.push("Food Arrangements - Meal Type");
    if (!String(f.date || "").trim()) missing.push("Food Arrangements - Date");
    if (!String(f.no_of_clients || "").trim())
      missing.push("Food Arrangements - Number of Clients");
  }

  if (payload.vehicle) {
    const v = payload.vehicle;
    if (!String(v.pickup_date || "").trim())
      missing.push("Vehicle - Date of Pickup");
    if (!String(v.end_date || "").trim())
      missing.push("Vehicle - Vehicle Requirement End Date");
    if (!String(v.no_of_visitors || "").trim())
      missing.push("Vehicle - Number of Visitors");
    if (!String(v.pickup_time || "").trim())
      missing.push("Vehicle - Pickup Time");
    if (!String(v.pickup_point || "").trim())
      missing.push("Vehicle - Pickup Point");
    if (!String(v.place_to_visit || "").trim())
      missing.push("Vehicle - Place to Visit");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitACC03(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateACC03Server(payload);

  const mainSheet = db.getSheetByName("ACC03");
  if (!mainSheet) throw new Error("Missing sheet: ACC03");

  // Office expenses must not carry project name / PCODE
  const isProject = String(payload.expense_type || "") === "Project expense";
  const projectName = isProject ? payload.project_name || "" : "";
  const pcode = isProject ? payload.pcode || "" : "";

  // "Other" / "Project site" specification is irrelevant for the rest
  const deliveryOther =
    payload.delivery_location === "Other" ||
    payload.delivery_location === "Project site"
      ? payload.delivery_location_other || ""
      : "";

  mainSheet.appendRow([
    submissionId,
    now,
    payload.requestor_email || "",
    payload.date || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.employee_code || "",
    payload.team_name || "",
    payload.pg_company || "",
    payload.expense_type || "",
    projectName,
    pcode,
    payload.item_name || "",
    payload.category || "",
    payload.estimated_amount || "",
    payload.required_by_date || "",
    payload.urgency || "",
    payload.reason_for_purchase || "",
    payload.preferred_vendor || "",
    payload.delivery_location || "",
    deliveryOther,
    payload.gst_tds_applicable || "",
    payload.mode_of_payment || "",
    payload.quote_or_document_link || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ACC03",
    pcode: pcode,
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ACC03",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendACC03Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateACC03Server(payload) {
  const missing = [];

  if (!String(payload.requestor_first_name || "").trim())
    missing.push("First Name");
  if (!String(payload.requestor_last_name || "").trim())
    missing.push("Last Name");
  if (!String(payload.employee_code || "").trim())
    missing.push("Employee Code");
  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.pg_company || "").trim())
    missing.push("Concerned PG Company");
  if (!String(payload.expense_type || "").trim())
    missing.push("Office expense or Project expense");

  if (String(payload.expense_type || "") === "Project expense") {
    if (!String(payload.project_name || "").trim())
      missing.push("Project Name");
    if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  }

  if (!String(payload.item_name || "").trim()) missing.push("Item Name(s)");
  if (!String(payload.category || "").trim())
    missing.push("Category of Purchase");
  if (!String(payload.estimated_amount || "").trim())
    missing.push("Estimated Amount");
  if (!String(payload.urgency || "").trim()) missing.push("Urgency");
  if (!String(payload.reason_for_purchase || "").trim())
    missing.push("Reason for Purchase");
  if (!String(payload.delivery_location || "").trim())
    missing.push("Delivery Location");

  if (
    (payload.delivery_location === "Other" ||
      payload.delivery_location === "Project site") &&
    !String(payload.delivery_location_other || "").trim()
  ) {
    missing.push("Specify delivery location");
  }

  // Numeric sanity for estimated_amount
  const amt = parseFloat(payload.estimated_amount);
  if (payload.estimated_amount && (isNaN(amt) || amt < 0)) {
    missing.push("Estimated Amount must be a valid non-negative number");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitACC02(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateACC02Server(payload);

  const mainSheet = db.getSheetByName("ACC02_main");
  const itemsSheet = db.getSheetByName("ACC02_items");

  if (!mainSheet) throw new Error("Missing sheet: ACC02_main");
  if (!itemsSheet) throw new Error("Missing sheet: ACC02_items");

  // GST number only valid when GST registered = Yes
  const gstRegistered = String(payload.gst_registered || "");
  const gstNumber = gstRegistered === "Yes" ? payload.gst_number || "" : "";

  // Address as a single, concatenated readable string for the main sheet
  const fullAddress = [
    payload.address_line1,
    payload.address_line2,
    payload.address_city,
    payload.address_region,
    payload.address_zip,
    payload.address_country,
  ]
    .map(function (p) {
      return String(p || "").trim();
    })
    .filter(Boolean)
    .join(", ");

  // Item totals — recompute server-side for the ledger
  const totals = computeACC02Totals(payload.items || []);

  mainSheet.appendRow([
    submissionId,
    now,
    payload.requestor_email || "",
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.vendor_name || "",
    fullAddress,
    payload.address_line1 || "",
    payload.address_line2 || "",
    payload.address_city || "",
    payload.address_region || "",
    payload.address_zip || "",
    payload.address_country || "",
    gstRegistered,
    gstNumber,
    payload.branch || "",
    payload.reference || "",
    payload.bill_number || "",
    payload.bill_date || "",
    payload.mode_of_payment || "",
    payload.target_date || "",
    payload.invoice_url || "",
    payload.advance_amount || "",
    payload.advance_date || "",
    payload.advance_paid_via || "",
    payload.remarks || "",
    totals.grand_amount,
    totals.grand_total,
    totals.grand_discount,
    totals.grand_net,
  ]);

  // Item rows — one row per line item
  (payload.items || []).forEach(function (row, index) {
    itemsSheet.appendRow([
      submissionId,
      index + 1,
      row.item_description || "",
      row.rate || "",
      row.quantity || "",
      row.amount || "",
      row.gst_percent || "",
      row.total_amount || "",
      row.discount || "",
      row.net_amount || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "ACC02",
    pcode: "",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "ACC02",
    createdBy: payload.requestor_email || "",
    now: now,
    payload: payload,
  });

  sendACC02Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateACC02Server(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");

  if (!String(payload.vendor_name || "").trim()) missing.push("Vendor Name");

  if (!String(payload.gst_registered || "").trim())
    missing.push("GST Registered");

  if (
    String(payload.gst_registered || "") === "Yes" &&
    !String(payload.gst_number || "").trim()
  ) {
    missing.push("GST Number");
  }

  if (!String(payload.bill_number || "").trim()) missing.push("Bill Number");
  if (!String(payload.bill_date || "").trim()) missing.push("Bill Date");

  if (!String(payload.invoice_url || "").trim())
    missing.push("Invoice Copy (URL link)");

  // Light URL sanity check
  const url = String(payload.invoice_url || "").trim();
  if (url && !/^https?:\/\//i.test(url)) {
    missing.push(
      "Invoice Copy (URL link) — must begin with http:// or https://",
    );
  }

  // Item table — must have at least one row with all required values
  const items = Array.isArray(payload.items) ? payload.items : [];
  const usedItems = items.filter(function (r) {
    return (
      String(r.item_description || "").trim() ||
      String(r.rate || "").trim() ||
      String(r.quantity || "").trim()
    );
  });

  if (!usedItems.length) {
    missing.push("Item Table — add at least one item");
  } else {
    usedItems.forEach(function (row, index) {
      const rn = index + 1;
      if (!String(row.item_description || "").trim())
        missing.push(`Item Table row ${rn} — Item Description`);
      if (!String(row.rate || "").trim())
        missing.push(`Item Table row ${rn} — Rate`);
      if (!String(row.quantity || "").trim())
        missing.push(`Item Table row ${rn} — Quantity`);

      const rate = parseFloat(row.rate);
      const qty = parseFloat(row.quantity);
      if (row.rate && (isNaN(rate) || rate < 0))
        missing.push(
          `Item Table row ${rn} — Rate must be a non-negative number`,
        );
      if (row.quantity && (isNaN(qty) || qty < 0))
        missing.push(
          `Item Table row ${rn} — Quantity must be a non-negative number`,
        );
    });
  }

  // Advance amount sanity
  if (payload.advance_amount) {
    const adv = parseFloat(payload.advance_amount);
    if (isNaN(adv) || adv < 0)
      missing.push("Amount Paid in Advance must be a non-negative number");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function computeACC02Totals(items) {
  let grandAmount = 0;
  let grandTotal = 0;
  let grandDiscount = 0;
  let grandNet = 0;

  (items || []).forEach(function (r) {
    const rate = parseFloat(r.rate);
    const qty = parseFloat(r.quantity);
    const gst = parseFloat(r.gst_percent);
    const disc = parseFloat(r.discount);

    const amount = (isNaN(rate) ? 0 : rate) * (isNaN(qty) ? 0 : qty);
    const total = amount + ((isNaN(gst) ? 0 : gst) / 100) * amount;
    const net = total - (isNaN(disc) ? 0 : disc);

    grandAmount += amount;
    grandTotal += total;
    grandDiscount += isNaN(disc) ? 0 : disc;
    grandNet += net;
  });

  function r2(v) {
    return Math.round(v * 100) / 100;
  }

  return {
    grand_amount: r2(grandAmount),
    grand_total: r2(grandTotal),
    grand_discount: r2(grandDiscount),
    grand_net: r2(grandNet),
  };
}

function submitTF09(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateTF09(payload);

  const sheet = db.getSheetByName("TF09");
  if (!sheet) throw new Error("Missing sheet: TF09");

  sheet.appendRow([
    submissionId,
    now,
    payload.date || "",
    payload.employee_first_name || "",
    payload.employee_last_name || "",
    payload.employee_email || "",
    payload.from_team_name || "",
    payload.recipient_team_name || "",
    payload.project_name || "",
    payload.project_code || "",
    payload.baseline_season || "",
    payload.lab_document_types || "",
    payload.lab_document_types_other || "",
    payload.lab_documents_link || "",
    payload.fae_expert_document_types || "",
    payload.fae_expert_document_types_other || "",
    payload.fae_expert_reports_link || "",
    payload.noc_document_types || "",
    payload.noc_document_types_other || "",
    payload.reservoir_document_link || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "TF09",
    pcode: payload.project_code || "",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "TF09",
    createdBy: payload.employee_email || "",
    now: now,
    payload: payload,
  });

  sendTF09Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateTF09(payload) {
  const missing = [];

  if (!String(payload.employee_email || "").trim())
    missing.push("Employee Email ID");
  if (!String(payload.from_team_name || "").trim())
    missing.push("From Team Name");
  if (!String(payload.recipient_team_name || "").trim())
    missing.push("Recipient Team Name");
  if (!String(payload.project_code || "").trim()) missing.push("Project Code");

  // "If others, specify" is mandatory only when the group includes "Others"
  if (
    tf09HasOther(payload.lab_document_types) &&
    !String(payload.lab_document_types_other || "").trim()
  ) {
    missing.push("Type of Document Received from Lab - If others, specify");
  }

  if (
    tf09HasOther(payload.fae_expert_document_types) &&
    !String(payload.fae_expert_document_types_other || "").trim()
  ) {
    missing.push(
      "Type of document as FAE Report or Expert Report - If others, specify",
    );
  }

  if (
    tf09HasOther(payload.noc_document_types) &&
    !String(payload.noc_document_types_other || "").trim()
  ) {
    missing.push("Type of document from NOC Team - If others, specify");
  }

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function tf09HasOther(checkedString) {
  return (
    String(checkedString || "")
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .indexOf("Others") !== -1
  );
}

function submitFQ14(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateFQ14(payload);

  const sheet = db.getSheetByName("FQ14");
  if (!sheet) throw new Error("Missing sheet: FQ14");

  sheet.appendRow([
    submissionId,
    now,
    payload.requestor_first_name || "",
    payload.requestor_last_name || "",
    payload.requestor_email || "",
    payload.team_name || "",
    payload.company_name || "",
    payload.pcode || "",
    payload.project_name || "",
    payload.category || "",
    payload.sector || "",
    payload.eac_name || "",
    payload.wfp_sheet_link || "",
    payload.expected_target_date || "",
    payload.remarks || "",
  ]);

  appendSubmissionLedger(db, {
    submissionId,
    formCode: "FQ14",
    pcode: payload.pcode || "",
    createdBy: payload.requestor_email || "",
    now,
    payload,
  });

  appendAuditLog(db, {
    submissionId,
    formCode: "FQ14",
    createdBy: payload.requestor_email || "",
    now,
    payload,
  });

  sendFQ14Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateFQ14(payload) {
  const missing = [];

  if (!String(payload.requestor_email || "").trim())
    missing.push("Official Email ID of Requestor");
  if (!String(payload.team_name || "").trim()) missing.push("Team Name");
  if (!String(payload.company_name || "").trim()) missing.push("Company Name");
  if (!String(payload.project_name || "").trim())
    missing.push("Name of the project");
  if (!String(payload.pcode || "").trim()) missing.push("PCODE");
  if (!String(payload.wfp_sheet_link || "").trim())
    missing.push("WFP sheet link");
  if (!String(payload.expected_target_date || "").trim())
    missing.push("Expected Target Date");

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

function submitMPF02(payload) {
  const db = getDB();
  const now = new Date();
  const submissionId = Utilities.getUuid();

  payload = payload || {};
  payload.submission_id = submissionId;

  validateMPF02(payload);

  const mainSheet = db.getSheetByName("MPF02_main");
  const visitsSheet = db.getSheetByName("MPF02_visits");
  const meetingsSheet = db.getSheetByName("MPF02_meetings");
  const reportsSheet = db.getSheetByName("MPF02_reports");
  const billsSheet = db.getSheetByName("MPF02_bills");

  if (!mainSheet) throw new Error("Missing sheet: MPF02_main");
  if (!visitsSheet) throw new Error("Missing sheet: MPF02_visits");
  if (!meetingsSheet) throw new Error("Missing sheet: MPF02_meetings");
  if (!reportsSheet) throw new Error("Missing sheet: MPF02_reports");
  if (!billsSheet) throw new Error("Missing sheet: MPF02_bills");

  mainSheet.appendRow([
    submissionId,
    now,
    payload.month || "",
    payload.name_first || "",
    payload.name_last || "",
    payload.employee_code || "",
    payload.email || "",
    payload.area_of_expertise || "",
    payload.rm_name_first || "",
    payload.rm_name_last || "",
    payload.rm_email || "",
    payload.visits_done || "",
    payload.meetings_attended || "",
    payload.reports_submitted || "",
    payload.targets_planned || "",
    payload.targets_achieved || "",
    payload.highlights || "",
    payload.low_points || "",
    payload.challenges_faced || "",
    payload.projected_targets || "",
    payload.retention_bill_link || "",
    payload.travel_reimbursement_link || "",
    payload.remarks || "",
  ]);

  (payload.visits || []).forEach(function (row, index) {
    visitsSheet.appendRow([
      submissionId,
      index + 1,
      row.start_date || "",
      row.end_date || "",
      row.project_name || "",
      row.pcode || "",
      row.location || "",
    ]);
  });

  (payload.meetings || []).forEach(function (row, index) {
    meetingsSheet.appendRow([
      submissionId,
      index + 1,
      row.date || "",
      row.project_name || "",
      row.pcode || "",
      row.type_of_meeting || "",
      row.guests_participants || "",
      row.agenda || "",
    ]);
  });

  (payload.reports || []).forEach(function (row, index) {
    reportsSheet.appendRow([
      submissionId,
      index + 1,
      row.date || "",
      row.project_name || "",
      row.pcode || "",
      row.remarks_of_client || "",
      row.feedback_of_eac || "",
    ]);
  });

  (payload.bills || []).forEach(function (row, index) {
    billsSheet.appendRow([
      submissionId,
      index + 1,
      row.project_name || "",
      row.pcode || "",
      row.link_to_bill || "",
    ]);
  });

  appendSubmissionLedger(db, {
    submissionId: submissionId,
    formCode: "MPF02",
    pcode: firstPcodeFromMPF02(payload),
    createdBy: payload.email || "",
    now: now,
    payload: payload,
  });

  appendAuditLog(db, {
    submissionId: submissionId,
    formCode: "MPF02",
    createdBy: payload.email || "",
    now: now,
    payload: payload,
  });

  sendMPF02Email(payload, submissionId);

  return {
    ok: true,
    submission_id: submissionId,
    thankYouHtml: HtmlService.createTemplateFromFile("thankyou")
      .evaluate()
      .getContent(),
  };
}

function validateMPF02(payload) {
  const missing = [];

  if (!String(payload.month || "").trim()) missing.push("Month");
  if (!String(payload.employee_code || "").trim())
    missing.push("Employee Code");
  if (!String(payload.email || "").trim()) missing.push("Email ID");
  if (!String(payload.rm_email || "").trim())
    missing.push("Reporting Manager Email ID");
  if (!String(payload.visits_done || "").trim()) missing.push("Visits Done");
  if (!String(payload.meetings_attended || "").trim())
    missing.push("Meetings Attended");
  if (!String(payload.reports_submitted || "").trim())
    missing.push("Reports Submitted");

  const visits = Array.isArray(payload.visits) ? payload.visits : [];
  const meetings = Array.isArray(payload.meetings) ? payload.meetings : [];
  const reports = Array.isArray(payload.reports) ? payload.reports : [];
  const bills = Array.isArray(payload.bills) ? payload.bills : [];

  if (payload.visits_done === "Yes" && !visits.length)
    missing.push("At least one Visit entry");
  if (payload.meetings_attended === "Yes" && !meetings.length)
    missing.push("At least one Meeting entry");
  if (payload.reports_submitted === "Yes" && !reports.length)
    missing.push("At least one Report entry");

  visits.forEach(function (r, i) {
    if (!String(r.project_name || "").trim())
      missing.push("Visit row " + (i + 1) + " - Project name");
    if (!String(r.pcode || "").trim())
      missing.push("Visit row " + (i + 1) + " - PCODE");
  });
  meetings.forEach(function (r, i) {
    if (!String(r.project_name || "").trim())
      missing.push("Meeting row " + (i + 1) + " - Project name");
    if (!String(r.pcode || "").trim())
      missing.push("Meeting row " + (i + 1) + " - PCODE");
  });
  reports.forEach(function (r, i) {
    if (!String(r.project_name || "").trim())
      missing.push("Report row " + (i + 1) + " - Project name");
    if (!String(r.pcode || "").trim())
      missing.push("Report row " + (i + 1) + " - PCODE");
  });
  bills.forEach(function (r, i) {
    if (!String(r.project_name || "").trim())
      missing.push("Project-wise bill row " + (i + 1) + " - Project name");
    if (!String(r.pcode || "").trim())
      missing.push("Project-wise bill row " + (i + 1) + " - PCODE");
  });

  if (missing.length) {
    throw new Error("Please fill:\n\n" + missing.join("\n"));
  }
}

// Returns the first PCODE found across the subforms, for the submission ledger.
function firstPcodeFromMPF02(payload) {
  const groups = [
    payload.visits,
    payload.meetings,
    payload.reports,
    payload.bills,
  ];
  for (let g = 0; g < groups.length; g++) {
    const arr = Array.isArray(groups[g]) ? groups[g] : [];
    for (let i = 0; i < arr.length; i++) {
      if (String(arr[i].pcode || "").trim()) return String(arr[i].pcode).trim();
    }
  }
  return "";
}
