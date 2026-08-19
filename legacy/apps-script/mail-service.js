function sendWPF01Email(payload, submissionId) {
  const to = "priority.wg@perfactgroup.in, gov.council@perfactgroup.in";
  const cc = buildTeamCc(payload.team_name) + ", pranav.mathur@perfactgroup.in";
  const subject =
    "Team Performance of " +
    (payload.team_name || "") +
    " for the week (" +
    (payload.week_start || "") +
    " to " +
    (payload.week_end || "") +
    ")";

  const htmlBody = buildWPF01EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "WPF01",
    cc: cc,
  });
}

function buildTeamCc(teamName) {
  const safe = String(teamName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return safe ? safe + "@perfactgroup.in" : "";
}

function buildWPF01EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(cells) {
    return `
      <tr>
        ${cells
          .map(
            (c) =>
              `<td style="border:1px solid #ccc;padding:6px;vertical-align:top;white-space:pre-wrap;">${esc(
                String(c ?? ""),
              )}</td>`,
          )
          .join("")}
      </tr>
    `;
  }

  function table(title, headers, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead>
            <tr>
              ${headers
                .map(
                  (h) =>
                    `<th style="border:1px solid #ccc;padding:6px;text-align:left;background:#f5f5f5;">${esc(
                      h,
                    )}</th>`,
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || ""}
          </tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    // row(["Submission ID", submissionId]),
    row(["Week Start Date", payload.week_start || ""]),
    row(["Week End Date", payload.week_end || ""]),
    row(["Team Name", payload.team_name || ""]),
    row(["TFs filled this week", payload.tf_filled || ""]),
    row(["Milestone achieved this week", payload.milestone_achieved || ""]),
    row(["Number of Active Projects", payload.number_of_active_projects || ""]),
    row(["Total Working Hours", payload.total_working_hours || ""]),
    row(["Targets planned this week", payload.targets_planned_this_week || ""]),
    row([
      "Targets achieved this week",
      payload.targets_achieved_this_week || "",
    ]),
    row(["Highlights", payload.highlights || ""]),
    row([
      "Low Points / Complaints Received",
      payload.low_points_complaints || "",
    ]),
    row(["Challenges Faced", payload.challenges_faced || ""]),
    row(["Internal Bottlenecks", payload.internal_bottlenecks || ""]),
    row(["External Bottlenecks", payload.external_bottlenecks || ""]),
    row([
      "Projected Targets for Next Week",
      payload.projected_targets_next_week || "",
    ]),
  ].join("");

  const tfRows = (payload.tf_details || [])
    .map((r, i) =>
      row([
        i + 1,
        r.tf_name || "",
        r.planned_last_week || "",
        r.achieving_this_week || "",
        r.plan_for_next_week || "",
      ]),
    )
    .join("");

  const milestoneRows = (payload.milestone_details || [])
    .map((r, i) =>
      row([
        i + 1,
        r.milestone_achieved || "",
        r.pcode || "",
        r.project_name || "",
        r.special_notes || "",
      ]),
    )
    .join("");

  const teamInfoRows = (payload.weekly_team_info || [])
    .map((r, i) =>
      row([
        i + 1,
        r.name || "",
        r.designation || "",
        r.working_days || "",
        r.site_visit_days || "",
      ]),
    )
    .join("");

  const workRows = (payload.weekly_team_details || [])
    .map((r, i) =>
      row([
        i + 1,
        r.name || "",
        r.project_name || "",
        r.pcode || "",
        r.task_description || "",
        r.time_spent || "",
      ]),
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Work Priority WG members,</p>
      <p>
        Team Performance of <b>${esc(payload.team_name || "")}</b> for the week
        (${esc(payload.week_start || "")} - ${esc(payload.week_end || "")})
        has been submitted successfully for your review.
      </p>

      ${table("Submission Summary", ["Field", "Value"], summaryRows)}
      ${table("Number of TFs Filled", ["#", "TF Name", "Planned Last Week", "Achieving This Week", "Plan for Next Week"], tfRows)}
      ${table("Details of Milestone Achieved", ["#", "Milestone Achieved", "PCODE", "Project Name", "Please Specify"], milestoneRows)}
      ${table("Weekly Team Work Info", ["#", "Name", "Designation", "Working Days", "Site Visit Days"], teamInfoRows)}
      ${table("Weekly Team Work Details", ["#", "Name", "Project Name", "PCODE", "Task Description", "Time Spent"], workRows)}

      <p style="margin-top:18px;">Regards,<br/>WPF01</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendBD01AEmail(payload, submissionId, proposalID, pcode) {
  const to = `glacier@perfactgroup.in, ${payload.officialEmail}`;
  const ccList = "info@perfactgroup.in";

  const subject = `New Proposal lead for ${payload.customerCompany} having ID ${proposalID} has been created successfully`;
  const htmlBody = buildBD01AEmailHtml(
    payload,
    submissionId,
    proposalID,
    pcode,
  );

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "BD-01(A)",
    cc: ccList,
  });
}

function buildBD01AEmailHtml(payload, submissionId, proposalID, pcode) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.formFillerFirstName} ${payload.formFillerLastName},</p>
      <p>Your Proposal ID ${proposalID} dated ${payload.leadDate} has been generated successfully</p>  

      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <tbody>
          ${row("Proposal ID", proposalID)}
          ${row("PCODE", pcode)}
          ${row("Lead Date", payload.leadDate)}
          ${row("Form Filler", `${payload.formFillerFirstName || ""} ${payload.formFillerLastName || ""}`.trim())}
          ${row("Official Email", payload.officialEmail)}
          ${row("Customer Company", payload.customerCompany)}
          ${row("Customer Name", `${payload.customerFirstName || ""} ${payload.customerLastName || ""}`.trim())}
          ${row("Customer Contact", payload.customerContact)}
          ${row("Customer Email", payload.customerEmail)}
          ${row("Repeat Customer", payload.isRepeatCustomer)}
          ${row("Activity Proposed", payload.activityProposed)}
          ${row("Location", [payload.village, payload.taluka, payload.district, payload.state, payload.postalCode, payload.country].filter(Boolean).join(", "))}
          ${row("ST/UT", payload.stUt)}
          ${row("Work Type", payload.workType)}
          ${
            payload.workType &&
            String(payload.workType).toLowerCase() === "others"
              ? row("Work Type Specify", payload.workTypeOtherSpecify)
              : ""
          }
          ${row("Sector", payload.sector)}
          ${row("Specifications", payload.specs)}
          ${row("Financial Year", payload.finYear)}
          ${row("PG Company", payload.pgCompany)}
          ${row("Customer Classification", payload.customerClass)}
          ${row("Lead Source", payload.leadSource)}
          ${
            payload.leadSource &&
            String(payload.leadSource).toLowerCase() === "others"
              ? row("Lead Source Specify", payload.leadSourceOtherSpecify)
              : ""
          }
          ${row("RFQ / Scope URL", payload.rfqUrl)}
          ${row("Remarks", payload.remarks)}
        </tbody>
      </table>

      <p style="margin-top:18px;">Regards,<br/>BD-01(A)</p>
    </div>
  `;
}

function sendBD02Email(payload, submissionId) {
  const to = `glacier@perfactgroup.in, ${payload.officialEmail}`;
  const cc = "arctic@perfactgroup.in, info@perfactgroup.in";

  const subject = `New Proposal ID ${payload.proposalId} of ${payload.customerCompany} has been won with Project code ${payload.pcode}`;
  const htmlBody = buildBD02EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "BD02",
    cc: cc,
  });
}

function buildBD02EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const customerRows = [
    row("Lead Date", payload.leadDate || ""),
    row("Official Email", payload.officialEmail || ""),
    row(
      "Form Filler",
      `${payload.formFillerFirstName || ""} ${payload.formFillerLastName || ""}`.trim(),
    ),
    row("Customer Company", payload.customerCompany || ""),
    row(
      "Customer Name",
      `${payload.customerFirstName || ""} ${payload.customerLastName || ""}`.trim(),
    ),
    row(
      "Customer Contact",
      `${payload.customerContactCode || ""} ${payload.customerContactNumber || ""}`.trim(),
    ),
    row("Customer Email", payload.customerEmail || ""),
  ].join("");

  const complianceRows = [
    row("GST Available", payload.gstAvailable || ""),
    row("GST Number", payload.gstNumber || ""),
    row("PAN Available", payload.panAvailable || ""),
    row("PAN Number", payload.panNumber || ""),
    row("TAN Available", payload.tanAvailable || ""),
    row("TAN Number", payload.tanNumber || ""),
    row("GST Treatment", payload.gstTreatment || ""),
  ].join("");

  const projectRows = [
    // row("Submission ID", submissionId),
    row("Project Name", payload.projectName || ""),
    row("Project Location", payload.projectLocation || ""),
    row("Proposal ID", payload.proposalId || ""),
    row("P CODE", payload.pcode || ""),
    row("Date of Proposal Sent", payload.dateProposalSent || ""),
    row("Date of Proposal Won", payload.dateProposalWon || ""),
    row(
      "Link of Proposal Trends/Summary",
      payload.proposalTrendsSummaryLink || "",
    ),
    row("Link to Work Order", payload.workOrderLink || ""),
    row("Link to sales order", payload.salesOrderLink || ""),
    row("Link to Cost Computer", payload.costComputerLink || ""),
    row("Link to final proposal", payload.finalProposalLink || ""),
    row("PR.R", payload.prR || ""),
    row("PR.B", payload.prB || ""),
    row(
      "Travelling Expenses in Perfact Group's scope",
      payload.travellingExpensesInScope || "",
    ),
    row("PR Mode", payload.prMode || ""),
  ].join("");

  const costRows = [
    row("Overhead Costs", payload.overheadCosts || ""),
    row("Testing charges", payload.testingCharges || ""),
    row("Admin Expenses", payload.adminExpenses || ""),
    row("Manpower costs", payload.manpowerCosts || ""),
    row("Outsourcing costs", payload.outsourcingCosts || ""),
    row("Comissions", payload.commissions || ""),
    row("Outsourced Manpower", payload.outsourcedManpower || ""),
    row("Secondary data costs", payload.secondaryDataCosts || ""),
    row("Contingency costs", payload.contingencyCosts || ""),
    row("Site visit costs", payload.siteVisitCosts || ""),
    row(
      "Project Base Level cost (PBL) - in Lacs",
      payload.projectBaseLevelCost || "",
    ),
    row("Final quote value (PBL10) - in Lacs", payload.finalQuoteValue || ""),
    row("Percentage Margin", payload.percentageMargin || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>BD-02 has been submitted successfully.</p>

      ${section("Customer Details", customerRows)}
      ${section("GST / PAN / TAN", complianceRows)}
      ${section("Project Details", projectRows)}
      ${section("Costing", costRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Remarks</div>
        <div style="border:1px solid #ccc;padding:8px;">${esc(payload.remarks || "")}</div>
      </div>

      <p style="margin-top:18px;">Regards,<br/>BD02</p>
    </div>
  `;
}

function buildBD03EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    // row("Submission ID", submissionId),
    row("Lead Date", payload.lead_date || ""),
    row(
      "Form Filler",
      `${payload.form_filler_first_name || ""} ${payload.form_filler_last_name || ""}`.trim(),
    ),
    row("Official Email", payload.official_email || ""),
    row("Team Name", payload.team || ""),
    row(
      "Team Head",
      `${payload.team_head_first_name || ""} ${payload.team_head_last_name || ""}`.trim(),
    ),
    row("Team Head Email", payload.team_head_email || ""),
    row("C-Suite Officer", payload.csuite_officer_name || ""),
    row("C-Suite Officer Email", payload.csuite_officer_email || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
    row("EIA Coordinator Email", payload.eia_coordinator_email || ""),
    row("Customer Company", payload.customer_company || ""),
    row(
      "Client Name",
      `${payload.client_first_name || ""} ${payload.client_last_name || ""}`.trim(),
    ),
    row(
      "Client Contact",
      `${payload.client_contact_code || ""} ${payload.client_contact_number || ""}`.trim(),
    ),
    row("Client Email", payload.client_email || ""),
    row("Project Name", payload.project_name || ""),
    row(
      "Project Location",
      [
        payload.project_location_address_line1,
        payload.project_location_village,
        payload.project_location_taluka,
        payload.project_location_district,
        payload.project_location_state,
        payload.project_location_postal_code,
        payload.project_location_country,
      ]
        .filter(Boolean)
        .join(", "),
    ),
    row("Type of Work", payload.type_of_work || ""),
    row("PCode", payload.pcode || ""),
    row("Current Status", payload.current_status || ""),
    row("Gantt Chart Link", payload.gantt_chart_link || ""),
    row("Date of Updating", payload.date_of_updating || ""),
    row("Project Start Date", payload.project_start_date || ""),
    row(
      "General Conditions Applicability",
      payload.general_conditions_applicability || "",
    ),
    row("Overhead Expenses borne by", payload.overhead_expenses_borne_by || ""),
    row("Travelling borne by", payload.travelling_borne_by || ""),
    row("Category", payload.category || ""),
    row(
      "Service Type/ Code/ NABET Sector",
      payload.service_type_code_nabet_sector || "",
    ),
    row("Baseline Season", payload.baseline_season || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Perfact Group company name", payload.pg_company || ""),
    row("Relevant documents URL", payload.relevant_documents_url || ""),
  ].join("");

  const otherPersonsRows = (payload.other_persons || [])
    .map((r, i) =>
      row(i + 1, `${r.name || ""} | ${r.email || ""} | ${r.purpose || ""}`),
    )
    .join("");

  const milestoneRows = (payload.milestones || [])
    .map((r, i) =>
      row(
        i + 1,
        [
          `Name: ${r.milestone_name || ""}`,
          `Details: ${r.milestone_details || ""}`,
          `Timeline: ${r.timeline || ""}`,
          `% Billing: ${r.billing_percent || ""}`,
        ].join(" | "),
      ),
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.form_filler_first_name || ""} ${payload.form_filler_last_name || ""},</p>
      <p>New Project ${payload.project_name || ""} with PCode ${payload.pcode || ""} has been won and assigned to ${payload.team || ""} </p>

      ${section("Main Details", mainRows)}
      ${section("Any other person whom details to be shared", otherPersonsRows || row("1", "No additional persons added"))}
      ${section("Milestone Achieved Details", milestoneRows || row("1", "No milestones added"))}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Scope of Work</div>
        <div style="border:1px solid #ccc;padding:8px;white-space:pre-wrap;">${esc(payload.scope_of_work || "")}</div>
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Terms and Conditions</div>
        <div style="border:1px solid #ccc;padding:8px;white-space:pre-wrap;">${esc(payload.terms_and_conditions || "")}</div>
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Details of previous EC and consents</div>
        <div style="border:1px solid #ccc;padding:8px;white-space:pre-wrap;">${esc(payload.details_of_previous_ec_and_consents || "")}</div>
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Remarks</div>
        <div style="border:1px solid #ccc;padding:8px;white-space:pre-wrap;">${esc(payload.remarks || "")}</div>
      </div>

      <p style="margin-top:18px;">Regards,<br/>BD03</p>
    </div>
  `;
}

function sendTF02Email(p, submissionId) {
  const to = `${p.employee_email}`;
  const ccList = `info@perfactgroup.in, teameia@perfactgroup.in, ${buildTeamCc(p.team_name)}, ${getEmailByName(p.eia_coordinator_name || "")}, ${String(
    p.qcc_reviewers || "",
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(getEmailByName)
    .join(", ")}`;
  const subject = `Submission on appraisal meeting dated- ${p.meeting_date || ""} completion of Project- ${truncate(p.project_name, 42)} for ${p.meeting_type || ""} -meeting at Agenda no. ${p.agenda_number || ""} in committee- ${p.committee_name || ""}`;
  const htmlBody = buildTF02EmailHtml(p, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF02",
    cc: ccList,
  });
}

function buildTF02EmailHtml(p, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basicRows = [
    row("Date", p.date),
    row("Employee Name", `${p.first_name || ""} ${p.last_name || ""}`),
    row("Employee Email", p.employee_email),
    row("Team", p.team_name),
    row("EIA Coordinator", p.eia_coordinator_name),
    row("QCC Reviewers", p.qcc_reviewers),
  ].join("");

  const projectRows = [
    row("Project Name", p.project_name),
    row("Project Code", p.pcode),
    row("Proposal Number", p.proposal_number),
    row("Committee", p.committee_name),
    row("Agenda Number", p.agenda_number),
    row("Case Type", p.case_type),
  ].join("");

  const meetingRows = [
    row(
      "Meeting Type",
      p.meeting_type === "Others" ? p.meeting_type_other : p.meeting_type,
    ),
    row("Meeting Date", p.meeting_date),
    row("Meeting Time", p.meeting_time),
    row("Perfact Officials", p.perfact_officials),
    row("Project Proponent", p.project_proponent),
    row(
      "Presenter",
      `${p.presenter_first_name || ""} ${p.presenter_last_name || ""}`,
    ),
  ].join("");

  const costRows = [
    row("Proposed Project Cost", p.proposed_project_cost),
    row("Existing Project Cost", p.existing_project_cost),
  ].join("");

  const analysisRows = [
    row("Key Points & Queries", p.key_points_queries),
    row("EAC Future Focus", p.eac_future_focus),
    row("FAE Suggestions", p.fae_suggestions),
    row("PPT Changes", p.ppt_changes),
    row("Immediate Actions", p.immediate_actions),
    row("Post Submittal Points", p.post_submittal_points),
    row("Key Learnings", p.key_learnings),
    row("Struggles & Reason", p.struggles_and_reason),
    row("Future Implications", p.future_implications),
  ].join("");

  const decisionRows = [
    row(
      "Case Recommended",
      p.case_recommended === "Others"
        ? p.case_recommended_other
        : p.case_recommended,
    ),
    row("Warning Signs", p.warning_signs),
    row("Action Points", p.action_points),
  ].join("");

  const linksRows = [
    row("Meeting Recording", p.meeting_recording_link),
    row("Final Presentation", p.final_presentation_link),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear all,</p>
      <p>Submission on appraisal meeting dated- ${p.meeting_date || ""} completion of Project- ${p.project_name} for ${p.meeting_type || ""} -meeting at Agenda no. ${p.agenda_number || ""} in committee- ${p.committee_name || ""}</p>

      ${section("Basic Details", basicRows)}
      ${section("Project Details", projectRows)}
      ${section("Meeting Details", meetingRows)}
      ${section("Project Cost", costRows)}
      ${section("Technical Analysis", analysisRows)}
      ${section("Decision & Risk", decisionRows)}
      ${section("Links", linksRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Remarks</div>
        <div style="border:1px solid #ccc;padding:8px;">${esc(p.remarks)}</div>
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF02</p>
    </div>
  `;
}

function sendWPF03Email(payload, submissionId) {
  const to = "priority.wg@perfactgroup.in, gov.council@perfactgroup.in";
  const cc =
    "fountain@perfactgroup.in, rachna.dogra@perfactgroup.in, pranav.mathur@perfactgroup.in";

  const subject = `Team Performance of Fountain for the week ${payload.week_start_date || ""} to ${payload.week_end_date || ""}`;
  const htmlBody = buildWPF03EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "WPF03",
    cc: cc,
  });
}

function buildWPF03EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    // row("Submission ID", submissionId),
    row("Week Start Date", payload.week_start_date || ""),
    row("Week End Date", payload.week_end_date || ""),
    row("Team Name", payload.team_name || "Fountain"),
    row("Test Reports Issued", payload.test_reports_issued || ""),
    row("Test Reports Planned", payload.test_reports_planned || ""),
    row("Monitorings Completed", payload.monitorings_completed || ""),
    row("Monitorings Planned", payload.monitorings_planned || ""),
    row("Data Review Priority", payload.data_review_priority || ""),
    row("Highlights", payload.highlights || ""),
    row("Low Points", payload.low_points || ""),
    row("Challenges Faced", payload.challenges_faced || ""),
    row(
      "Projected Targets for Next Week",
      payload.projected_targets_next_week || "",
    ),
    row("Weekly PPT Link", payload.weekly_ppt_link || ""),
  ].join("");

  const analysisRows = (payload.analysis_rows || [])
    .map(function (r, i) {
      return row(
        `${i + 1}. ${r.analysis_item || ""}`,
        `Planned: ${r.planned_last_week || ""} | Achieving: ${r.achieving_this_week || ""} | Next: ${r.plan_for_next_week || ""}`,
      );
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Work Priority WG,</p>
      <p>Team Performance of Fountain for the week ${payload.week_start_date || ""} to ${payload.week_end_date || ""} has been submitted successfully for your review.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Analysis", analysisRows)}

      <p style="margin-top:18px;">Regards,<br/>WPF03</p>
    </div>
  `;
}

function sendTF01Email(payload, submissionId) {
  const to = payload.employee_email;
  const cc = `logistics.wg@perfactgroup.in, topmanagement@perfactgroup.in, ${buildTeamCc(payload.team_name)}`;
  const subject = `Requisition slip printing`;
  const htmlBody = buildTF01EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF01",
    cc: cc,
  });
}

function buildTF01EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Employee",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const projectRows = (payload.project_details || [])
    .map(function (r, i) {
      return row(
        `Project ${i + 1}`,
        [
          `Project: ${r.project_name || ""}`,
          `PCODE: ${r.pcode || ""}`,
          `PP: ${r.pp_name || ""}`,
          `Report: ${r.report_name || ""}`,
          `Purpose: ${r.purpose_of_printing || ""}`,
          `PDF: ${r.pdf_link || ""}`,
          `Pages: ${r.no_of_pages || ""}`,
          `Print: ${r.type_of_print || ""}`,
          `Copies: ${r.no_of_copies || ""}`,
        ].join(" | "),
      );
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.employee_first_name || ""} ${payload.employee_last_name || ""},</p>
      <p>Your Requisition Slip For Printing response dated ${payload.date || ""} has been submitted successfully and sent for further processing.</p>

      ${section("Main Details", mainRows)}
      ${section("Project(s) Details", projectRows)}

      <p style="margin-top:18px;">Regards,<br/>TF01</p>
    </div>
  `;
}

function sendBD03Email(payload, submissionId) {
  const recipients = `glacier@perfactgroup.in, ${payload.official_email}, ${buildTeamCc(payload.team)}`;
  const otherEmails = (payload.other_persons || [])
    .map((p) => p.email)
    .filter((e) => e)
    .join(",");
  const ccList = [
    payload.csuite_officer_email,
    payload.eia_coordinator_email,
    "topmanagement@perfactgroup.in",
    "accounts@perfactgroup.in",
    "info@perfactgroup.in",
    "priority.wg@perfactgroup.in",
    payload.team_head_email,
    otherEmails,
  ]
    .filter(Boolean)
    .join(",");
  const subject = `New Project ${truncate(payload.project_name, 84)} with PCode ${payload.pcode || ""} has been won and assigned to ${payload.team || ""}`;
  const htmlBody = buildBD03EmailHtml(payload, submissionId);

  GmailApp.sendEmail(recipients, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "BD03",
    cc: ccList,
  });
}

function truncate(text, maxLength) {
  text = String(text || "");
  return text.length > maxLength
    ? text.substring(0, maxLength).trim() + "..."
    : text;
}

function sendTF22Email(payload, submissionId) {
  const toList = `${payload.employee_email}, ${buildTeamCc(payload.team_name)}`;
  const ccList =
    "info@perfactgroup.in, accounts@perfactgroup.in, glacier@perfactgroup.in";

  const subject = `Accounts info wrt submission/ completion of project for ${payload.type_of_work} of Project- ${truncate(payload.project_name, 42)} with PCode- ${payload.project_code} and Service Type- ${payload.type_of_service}`;
  const htmlBody = buildTF22EmailHtml(payload, submissionId);

  GmailApp.sendEmail(toList, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF22",
    cc: ccList,
  });
}

function buildTF22EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.employee_first_name || ""} ${payload.employee_last_name || ""},</p>
      <p>Account section wrt submission/ completion of project for  ${payload.type_of_work} of Project- ${payload.project_name} with PCode- ${payload.project_code} and Service Type- ${payload.type_of_service} has been submitted and sent for review.</p>

      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <tbody>
          ${row("Date", payload.date || "")}
          ${row("Employee Name", `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim())}
          ${row("Employee Email", payload.employee_email || "")}
          ${row("Team", payload.team_name || "")}
          ${row("Type of Work", payload.type_of_work || "")}
          ${row("Project Name", payload.project_name || "")}
          ${row("Date of Completion", payload.date_of_completion || "")}
          ${row("Project Code", payload.project_code || "")}
          ${row("Type of Service", payload.type_of_service || "")}
          ${row("Attachments URL", payload.attachments_url || "")}
          ${row("Remarks", payload.remarks || "")}
        </tbody>
      </table>

      <p style="margin-top:18px;">Regards,<br/>TF22</p>
    </div>
  `;
}

function sendTF07Email(payload, submissionId) {
  const to = `${payload.employee_email}, arctic@perfactgroup.in, glacier@perfactgroup.in`;

  const cc = `info@perfactgroup.in, ${buildTeamCc(payload.team_name)}, topmanagement@perfactgroup.in`;

  const subject = `Accounts Information of Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.project_code || ""} for Milestone achieved- ${payload.milestone_achieved || ""} on- ${payload.date_of_milestone_achieved || ""}`;
  const htmlBody = buildTF07EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF07",
    cc: cc,
  });
}

function buildTF07EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basicRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.project_code || ""),
  ].join("");

  const workRows = [
    row(
      "Type of Work",
      payload.type_of_work === "Other"
        ? payload.type_of_work_other
        : payload.type_of_work,
    ),
    row(
      "Milestone Achieved",
      payload.milestone_achieved === "Other"
        ? payload.milestone_achieved_other
        : payload.milestone_achieved,
    ),
    row("Date of Milestone Achieved", payload.date_of_milestone_achieved || ""),
    row("Proof Link", payload.proof_link || ""),
    row("Submission Status", payload.submission_status || ""),
  ].join("");

  const billRows = [
    row("Person to Bill", payload.person_to_bill || ""),
    row("Email ID of Person to Bill", payload.email_of_person_to_bill || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.employee_first_name || ""} ${payload.employee_last_name || ""},</p>
      <p>Accounts Information of Project response dated ${payload.date || ""} has been submitted successfully.</p>

      ${section("Basic Details", basicRows)}
      ${section("Work Details", workRows)}
      ${section("Billing Details", billRows)}

      <p style="margin-top:18px;">Regards,<br/>TF07</p>
    </div>
  `;
}

function sendTF05Email(payload, submissionId) {
  const to = payload.official_email;
  const cc = `info@perfactgroup.in, topmanagement@perfactgroup.in, vc@perfactgroup.in, paromita.das@perfactgroup.in, jasvinder.kaur@perfactgroup.in, ${getEmailByName(payload.eia_coordinator_name) || ""}, ${buildTeamCc(payload.team_name)}, it.wg@perfactgroup.in, ${String(
    payload.qcc_reviewers || "",
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(getEmailByName)
    .join(", ")}`;
  const subject = `Handover PPT_EAC Meeting response dated ${payload.date || ""} for ${truncate(payload.developer_company_name || "", 21)}, Project ${truncate(payload.project_name || "", 21)} with PCODE- ${payload.project_code || ""} at ${truncate(payload.project_location || "", 21)} in ${truncate(payload.eac_committee || "", 21)}`;
  const htmlBody = buildTF05EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF05",
    cc: cc,
  });
}

function buildTF05EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basicRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requestor",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Official Email", payload.official_email || ""),
    row("Team Name", payload.team_name || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
    row("QCC Reviewers", payload.qcc_reviewers || ""),
  ].join("");

  const projectRows = [
    row("Developer Company Name", payload.developer_company_name || ""),
    row("Project Name", payload.project_name || ""),
    row(
      "Project Proponent",
      `${payload.project_proponent_first_name || ""} ${payload.project_proponent_last_name || ""}`.trim(),
    ),
    row("Project Code", payload.project_code || ""),
    row(
      "Proposed Project Cost (in lacs)",
      payload.proposed_project_cost_lacs || "",
    ),
    row(
      "Existing Project Cost (in lacs)",
      payload.existing_project_cost_lacs || "",
    ),
    row(
      "Project Cost after getting proposed EC (in lacs)",
      payload.project_cost_after_proposed_ec_lacs || "",
    ),
    row("Project Location", payload.project_location || ""),
    row("Plot Area", payload.plot_area_sq_m || ""),
    row("Built up Area", payload.built_up_area_sq_m || ""),
    row("Capacity", payload.capacity || ""),
    row("EMP Cost (Capital)", payload.emp_cost_capital_lacs || ""),
    row("Category", payload.category || ""),
    row("Activity", payload.activity || ""),
    row("Parivesh Login ID", payload.parivesh_login_id || ""),
    row("Parivesh Password", payload.parivesh_password || ""),
  ].join("");

  const meetingRows = [
    row(
      "Type of Presentation",
      payload.type_of_presentation === "Other"
        ? `${payload.type_of_presentation} | ${payload.type_of_presentation_other || ""}`
        : payload.type_of_presentation || "",
    ),
    row("EAC Committee", payload.eac_committee || ""),
    row("Proposal No.", payload.proposal_no || ""),
    row("Date of uploading", payload.date_of_uploading || ""),
    row("Agenda No.", payload.agenda_no || ""),
    row("Date of EAC meeting", payload.date_of_eac_meeting || ""),
    row("Internal Meeting Link", payload.internal_meeting_link || ""),
    row("EAC Meeting Link", payload.eac_meeting_link || ""),
    row("Meeting S.No.", payload.meeting_s_no || ""),
    row("Master PPT Link", payload.master_ppt_link || ""),
    row("Summarised PPT Link", payload.summarised_ppt_link || ""),
  ].join("");

  const docRows = [
    row(
      "Brief Writeup (Annexure as per Agenda)",
      payload.brief_writeup_annexure || "",
    ),
    row(
      "Uploading Document - Single File Link",
      payload.uploading_document_single_file_link || "",
    ),
    row("Online Report Link", payload.online_report_link || ""),
    row("Undertaking Link", payload.undertaking_link || ""),
    row("KML File Link", payload.kml_file_link || ""),
    row("Backup folder Link", payload.backup_folder_link || ""),
    row(
      "Circulation Documents Link- in Docx",
      payload.circulation_documents_link_docx || "",
    ),
    row(
      "Circulation Documents- in PDF",
      payload.circulation_documents_pdf || "",
    ),
    row("Critical Points", payload.critical_points || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.requestor_first_name} ${payload.requestor_last_name || ""},</p>
      <p>Your Format for Handover PPT_EAC Meeting response dated ${payload.date || ""} for ${payload.developer_company_name || ""}, Project ${payload.project_name || ""} with PCODE- ${payload.project_code || ""} at ${payload.project_location || ""} in ${payload.eac_committee || ""} has been submitted successfully</p>

      ${section("Basic Details", basicRows)}
      ${section("Project Details", projectRows)}
      ${section("Meeting / Presentation", meetingRows)}
      ${section("Documents / Links", docRows)}

      <p style="margin-top:18px;">Regards,<br/>TF05</p>
    </div>
  `;
}

function sendTF06Email(payload, submissionId) {
  const to = payload.official_email || "";
  const cc = [
    getEmailByName(payload.eia_coordinator_name),
    getEmailByName(payload.c_level_officer_name),
    String(payload.qcc_reviewers || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(getEmailByName)
      .join(", "),
    buildTeamCc(payload.team_name),
    "info@perfactgroup.in",
    "topmanagement@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `Handover Uploading documents of Project- ${truncate(payload.project_name || "", 21)} with PCODE- ${payload.project_code || ""} in- ${truncate(payload.project_location || "", 21)}`;
  const htmlBody = buildTF06EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF06",
    cc: cc,
  });
}

function buildTF06EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basicRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requestor",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Official Email", payload.official_email || ""),
    row("Team Name", payload.team_name || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
    row("C-Level Officer", payload.c_level_officer_name || ""),
    row("QCC Reviewers", payload.qcc_reviewers || ""),
  ].join("");

  const projectRows = [
    row("Project Name", payload.project_name || ""),
    row(
      "Project Proponent",
      `${payload.project_proponent_first_name || ""} ${payload.project_proponent_last_name || ""}`.trim(),
    ),
    row("Project Code", payload.project_code || ""),
    row(
      "Proposed Project Cost (in lacs)",
      payload.proposed_project_cost_lacs || "",
    ),
    row(
      "Existing Project Cost (in lacs)",
      payload.existing_project_cost_lacs || "",
    ),
    row(
      "Project Cost after getting proposed EC (in lacs)",
      payload.project_cost_after_proposed_ec_lacs || "",
    ),
    row("CER Budget (in lacs)", payload.cer_budget_lacs || ""),
    row("Project Location", payload.project_location || ""),
    row("Location Type", payload.location_type || ""),
    row("Plot Area", payload.plot_area_sq_m || ""),
    row("Built Up Area", payload.built_up_area_sq_m || ""),
    row("Capacity", payload.capacity || ""),
    row("EMP Cost (Capital)", payload.emp_cost_capital_lacs || ""),
    row("Category", payload.category || ""),
    row("Activity", payload.activity || ""),
    row("Major Sector", payload.major_sector || ""),
    row("Minor Sector", payload.minor_sector || ""),
    row("Parivesh Login Details", payload.parivesh_login_details || ""),
    row(
      "Type of Uploading",
      payload.type_of_uploading === "Others"
        ? `${payload.type_of_uploading} | ${payload.type_of_uploading_other || ""}`
        : payload.type_of_uploading || "",
    ),
    row("EAC Committee", payload.eac_committee || ""),
    row("Proposal No.", payload.proposal_no || ""),
  ].join("");

  const phRows = [
    row("PH Applicable", payload.ph_applicable || ""),
    row("PH MoM (english)", payload.ph_mom_english_url || ""),
    row("PH MoM (local language)", payload.ph_mom_local_language_url || ""),
    row("Summary of PH MoM", payload.summary_of_ph_mom_url || ""),
    row("Compliance of PH", payload.compliance_of_ph_url || ""),
  ].join("");

  const docRows = [
    row(
      "KML with project boundary",
      payload.kml_with_project_boundary_url || "",
    ),
    row("EMP Slides", payload.emp_slides_url || ""),
    row(
      "Link to Registration Details - PDF",
      payload.link_to_registration_details_pdf || "",
    ),
    row("Final FAE list", payload.final_fae_list_url || ""),
    row(
      "Draft Form-I (part A)- PDF",
      payload.draft_form_i_part_a_pdf_url || "",
    ),
    row(
      "Draft Form-I (part B)- PDF",
      payload.draft_form_i_part_b_pdf_url || "",
    ),
    row(
      "Draft Form-I (part C)- PDF",
      payload.draft_form_i_part_c_pdf_url || "",
    ),
    row(
      "Life Cycle Assessment- PDF",
      payload.life_cycle_assessment_pdf_url || "",
    ),
    row(
      "Link to Life Cycle Assessment- PPTX",
      payload.life_cycle_assessment_pptx_link || "",
    ),
    row("WildLife Conservation Plan (WLCP)", payload.wlcp_url || ""),
    row("Distance certification", payload.distance_certification_url || ""),
    row("National Board for Wildlife (NBWL)", payload.nbwl_url || ""),
    row("Forest Clearance", payload.forest_clearance_url || ""),
    row("Water Balance- PDF", payload.water_balance_pdf_url || ""),
    row("Hazardous waste tables- PDF", payload.waste_tables_pdf_url || ""),
    row(
      "Process emissions with APCM- PDF",
      payload.process_emissions_pdf_url || "",
    ),
    row(
      "Utility emissions with APCM- PDF",
      payload.utility_emissions_pdf_url || "",
    ),
    row(
      "Baseline location Maps with sampling details",
      payload.baseline_location_maps_url || "",
    ),
    row("Master PPT- PDF", payload.master_ppt_pdf_url || ""),
    row("Link to Master PPT", payload.master_ppt_link || ""),
    row("Cover Letter- PDF", payload.cover_letter_pdf_url || ""),
    row("Link to Cover Letter- Docx", payload.cover_letter_docx_link || ""),
    row("Plans Annexure- PDF", payload.plans_annexure_pdf_url || ""),
    row("Link to Plans Annexure- Docx", payload.plans_annexure_docx_link || ""),
    row("Annexure - PDF", payload.annexure_pdf_url || ""),
    row("Risk Assessment- PDF", payload.risk_assessment_pdf_url || ""),
    row(
      "Link to Risk Assessment- Docx",
      payload.risk_assessment_docx_link || "",
    ),
    row(
      "Signed Copy of Initial Pages",
      payload.signed_copy_initial_pages_url || "",
    ),
    row(
      "EMP/EIA (Single File Before Annexure)- PDF",
      payload.emp_eia_single_file_before_annexure_pdf_url || "",
    ),
    row(
      "Link to EMP/EIA (Single File Before Annexure)- Docx",
      payload.emp_eia_single_file_before_annexure_docx_link || "",
    ),
    row("Conceptual Plan/ PFR- PDF", payload.conceptual_plan_pfr_pdf_url || ""),
    row(
      "Link to Conceptual Plan/ PFR- DOCX",
      payload.conceptual_plan_pfr_docx_link || "",
    ),
    row("Layout - PDF", payload.layout_pdf_url || ""),
    row("Additional Files- PDF", payload.additional_files_pdf_url || ""),
    row(
      "Link to Additional Files- Docx",
      payload.additional_files_docx_link || "",
    ),
    row("Board Resolution- PDF", payload.board_resolution_pdf_url || ""),
    row(
      "Link to Board Resolution- Docx",
      payload.board_resolution_docx_link || "",
    ),
    row(
      "Link to Uploading Folder- PDF",
      payload.uploading_folder_pdf_link || "",
    ),
    row(
      "Link to Uploading Folder- DOCX",
      payload.uploading_folder_docx_link || "",
    ),
    row("Single File- PDF", payload.single_file_pdf_url || ""),
    row("Link to Single File- Docx", payload.single_file_docx_link || ""),
    row(
      "Link to Additional Critical Files- PDF",
      payload.additional_critical_files_pdf_link || "",
    ),
    row(
      "Link to Additional Critical Files- DOCX",
      payload.additional_critical_files_docx_link || "",
    ),
    row(
      "Authorisation of the Concerned person making application (Board resolution)- PDF",
      payload.authorisation_board_resolution_pdf_url || "",
    ),
    row(
      "Link to Authorisation...- DOCX",
      payload.authorisation_board_resolution_docx_link || "",
    ),
    row(
      "Issues in uploading or pendency/ any deliberate compromise during the uploading",
      payload.issues_in_uploading_or_pendency || "",
    ),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.requestor_first_name} ${payload.requestor_last_name},</p>
      <p>Handover Uploading documents dated ${payload.date} has been submitted successfully.</p>

      ${section("Basic Details", basicRows)}
      ${section("Project Details", projectRows)}
      ${section("PH / Uploading", phRows)}
      ${section("Documents / Attachments", docRows)}

      <p style="margin-top:18px;">Regards,<br/>TF06</p>
    </div>
  `;
}

function sendTF25Email(payload, submissionId) {
  const to = "teameia@perfactgroup.in";
  const cc = `${payload.employee_email}, ${buildTeamCc(payload.team_name)}, ${getEmailByName(payload.eia_coordinator_name)}`;

  const subject = `ADS raised for Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.project_code || ""}`;
  const htmlBody = buildTF25EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF25",
    cc: cc,
  });
}

function buildTF25EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basicRows = [
    row("Submission ID", submissionId),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.project_code || ""),
    row("Parivesh Proposal Number", payload.parivesh_proposal_number || ""),
    row("Type of Case", payload.type_of_case || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC/SEAC", payload.eac_seac || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
  ].join("");

  const detailRows = [
    row("Query Raised", payload.query_raised || ""),
    row("ADS Screenshot URL", payload.ads_screenshot_url || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>ADS raised for Project- ${payload.project_name || ""} with PCODE- ${payload.project_code || ""}</p>

      ${section("Submission Summary", basicRows)}
      ${section("ADS Details", detailRows)}

      <p style="margin-top:18px;">Regards,<br/>TF25</p>
    </div>
  `;
}

function sendTF24Email(payload, submissionId) {
  const to = "teameia@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    payload.employee_email,
    getEmailByName(payload.eia_coordinator_name),
  ]
    .filter(Boolean)
    .join(",");

  const subject = `EDS raised Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.project_code || ""}`;
  const htmlBody = buildTF24EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF24",
    cc: cc,
  });
}

function buildTF24EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.project_code || ""),
    row("Parivesh Proposal Number", payload.parivesh_proposal_number || ""),
    row("Type of Case", payload.type_of_case || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC/SEAC", payload.eac_seac || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
  ].join("");

  const detailRows = [
    row("Query Raised", payload.query_raised || ""),
    row("EDS Screenshot URL", payload.eds_screenshot_url || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>EDS raised Project- ${payload.project_name || ""} with PCODE- ${payload.project_code || ""}</p>

      ${section("Submission Summary", summaryRows)}
      ${section("EDS Details", detailRows)}

      <p style="margin-top:18px;">Regards,<br/>TF24</p>
    </div>
  `;
}

function sendTF16Email(payload, submissionId) {
  const to = "teameia@perfactgroup.in";
  const cc = [buildTeamCc(payload.team_name), payload.employee_email]
    .filter(Boolean)
    .join(",");

  const subject = `Agenda Enlistment Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.project_code || ""} and Agenda no.- ${payload.agenda_number || ""}`;
  const htmlBody = buildTF16EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF16",
    cc: cc,
  });
}

function buildTF16EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.project_code || ""),
    row("Agenda Number", payload.agenda_number || ""),
    row("Date of TF06 Submission", payload.date_of_tf06_submission || ""),
    row(
      "Date of PFR/EMP/EIA Submission",
      payload.date_of_pfr_emp_eia_submission || "",
    ),
    row("Date of EDS Raised", payload.date_of_eds_raised || ""),
    row("Date of EDS Submitted", payload.date_of_eds_submitted || ""),
    row("Date of Project Enlistment", payload.date_of_project_enlistment || ""),
    row("Date-Time of the Meeting", payload.meeting_datetime || ""),
    row("Meeting Link", payload.meeting_link || ""),
  ].join("");

  const notesRows = [
    row("Critical Points", payload.critical_points || ""),
    row(
      "Potential Attendees - from Perfact",
      payload.potential_attendees_perfact || "",
    ),
    row("Potential Attendees - from PP", payload.potential_attendees_pp || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>Agenda Enlistment Project- ${payload.project_name || ""} with PCODE- ${payload.project_code || ""} and Agenda no.- ${payload.agenda_number || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Details", notesRows)}

      <p style="margin-top:18px;">Regards,<br/>TF16</p>
    </div>
  `;
}

function sendHR01Email(payload, submissionId) {
  const to = payload.employee_email || "";
  const cc = "river@perfactgroup.in, hr.wg@perfactgroup.in";

  const subject = `Interview Evaluation dated ${payload.date || ""} for ${payload.applicant_first_name || ""} ${payload.applicant_last_name || ""} `;

  const htmlBody = buildHR01EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "HR01",
    cc: cc,
  });
}

function buildHR01EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basics = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row("Employee Email", payload.employee_email || ""),
    row(
      "Applicant Name",
      `${payload.applicant_first_name || ""} ${payload.applicant_last_name || ""}`.trim(),
    ),
    row("Position Applied For", payload.position_applied_for || ""),
    row("Interview Date", payload.interview_date || ""),
    row(
      "Interviewer Name",
      `${payload.interviewer_first_name || ""} ${payload.interviewer_last_name || ""}`.trim(),
    ),
    row("Meeting Recording Link", payload.meeting_recording_link || ""),
  ].join("");

  const ratings = [
    row("Education/Training", payload.education_training || ""),
    row("Technical Skills", payload.technical_skills || ""),
    row("Communication", payload.communication || ""),
    row("Job Knowledge", payload.job_knowledge || ""),
    row("Work Experience", payload.work_experience || ""),
    row("Body Language", payload.body_language || ""),
    row(
      "Attitude towards Interview/Job",
      payload.attitude_towards_interview_job || "",
    ),
    row("Culture Compatibility", payload.culture_compatibility || ""),
    row("Overall Rating", payload.star_rating || ""),
    row("Final Recommendation", payload.final_recommendation || ""),
    row("Interviewer Comments", payload.interviewer_comments || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.interviewer_first_name || ""} ${payload.interviewer_last_name || ""},</p>
      <p>Your Interview Feedback dated ${payload.date || ""} for ${payload.applicant_first_name || ""} ${payload.applicant_last_name || ""} has been submitted successfully and sent for review.</p>

      ${section("Interview Details", basics)}
      ${section("Evaluation", ratings)}

      <p style="margin-top:18px;">Regards,<br/>HR01</p>
    </div>
  `;
}

function sendADM06Email(payload, submissionId) {
  const to = payload.requestor_email || "";
  const cc = [buildTeamCc(payload.team_name), "it.wg@perfactgroup.in"]
    .filter(Boolean)
    .join(",");

  const subject = `Hotspot Requirement for ${payload.team_name || ""} submitted successfully.`;
  const htmlBody = buildADM06EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ADM06",
    cc: cc,
  });
}

function buildADM06EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""},</p>
      <p>Your Hotspot Requirement has been submitted successfully.</p>

      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <tbody>
          ${row("Submission ID", submissionId)}
          ${row("Date", payload.date || "")}
          ${row("Requestor Name", `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim())}
          ${row("Requestor Email", payload.requestor_email || "")}
          ${row("Team Name", payload.team_name || "")}
          ${row("Purpose of Hotspot Requirement", payload.purpose_of_hotspot_requirement || "")}
          ${row("Hotspot required from date", payload.hotspot_required_from_date || "")}
          ${row("Hotspot required till date", payload.hotspot_required_till_date || "")}
          ${row("Remarks", payload.remarks || "")}
        </tbody>
      </table>

      <p style="margin-top:18px;">Regards,<br/>ADM06</p>
    </div>
  `;
}

function sendADM04Email(payload, submissionId) {
  const to = payload.requestor_email || "";
  const cc =
    "accounts@perfactgroup.in, logistics.wg@perfactgroup.in, budget.wg@perfactgroup.in, kushalbhargava@perfactgroup.in";

  const subject = `Vehicle Maintenance request for ${payload.vehicle_detail || ""} requiring ${payload.type_of_work || ""}`;
  const htmlBody = buildADM04EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ADM04",
    cc: cc,
  });
}

function buildADM04EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basics = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requestor Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requestor Email", payload.requestor_email || ""),
    row("Department", payload.department || ""),
    row("Team Name", payload.team_name || ""),
    row("Vehicle Detail", payload.vehicle_detail || ""),
    row("Type of Work", payload.type_of_work || ""),
  ].join("");

  const periodic = [
    row("Workshop", payload.workshop || ""),
    row("Date of last service", payload.date_of_last_service || ""),
    row("Last service done at -Kms", payload.last_service_kms || ""),
    row(
      "Amount incurred on last periodic service",
      payload.amount_incurred_on_last_periodic_service ||
        payload.amount_incurred_last_periodic_service ||
        "",
    ),
    row("Current running Kms", payload.current_running_kms || ""),
    row("Proposed date of service", payload.proposed_date_of_service || ""),
  ].join("");

  const puc = [
    row("PUC valid Till", payload.puc_valid_till || ""),
    row(
      "PUC to be renewed on or before",
      payload.puc_to_be_renewed_on_or_before || "",
    ),
  ].join("");

  const tyres = [
    row(
      "Last time Tyres purchase date",
      payload.last_time_tyres_purchase_date || "",
    ),
    row(
      "Cost of last Tyres purchase",
      payload.cost_of_last_tyres_purchase || "",
    ),
    row(
      "Proposed date of new Tyres purchace",
      payload.proposed_date_of_new_tyres_purchase || "",
    ),
    row("Brand of Tyres", payload.brand_of_tyres || ""),
    row("Vendor Name", payload.vendor_name_tyres || ""),
    row("Warranty of Tyres", payload.warranty_of_tyres || ""),
  ].join("");

  const battery = [
    row("Last battery purchase date", payload.last_battery_purchase_date || ""),
    row(
      "Cost Of last purchase battery",
      payload.cost_of_last_purchase_battery || "",
    ),
    row(
      "Buy back cost of exiting old battery",
      payload.buy_back_cost_of_exiting_old_battery || "",
    ),
    row("Cost of new battery", payload.cost_of_new_battery || ""),
    row("brand of battery", payload.brand_of_battery || ""),
    row("Warranty of battery", payload.warranty_of_battery || ""),
    row("Vendor name", payload.vendor_name_battery || ""),
  ].join("");

  const insurance = [
    row("Insurance valid Till", payload.insurance_valid_till || ""),
    row("Current insurance provider", payload.current_insurance_provider || ""),
    row(
      "Last insurance premium paid",
      payload.last_insurance_premium_paid || "",
    ),
    row(
      "Insurance renewal to be done on or before",
      payload.insurance_renewal_on_or_before || "",
    ),
  ].join("");

  const emergency = row(
    "Details of emergency repair and maintenance",
    payload.details_of_emergency_repair_and_maintenance || "",
  );

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>Vehicle Maintenance request for ${payload.vehicle_detail || ""} requiring ${payload.type_of_work || ""} has been submitted.</p>

      ${section("Submission Summary", basics)}
      ${payload.type_of_work === "Periodic Service" ? section("Periodic Service", periodic) : ""}
      ${payload.type_of_work === "PUC Renewal" ? section("PUC Renewal", puc) : ""}
      ${payload.type_of_work === "New Tyres to be purchased" ? section("Tyres", tyres) : ""}
      ${payload.type_of_work === "New Battery required" ? section("Battery", battery) : ""}
      ${payload.type_of_work === "Insurance Renewal" ? section("Insurance", insurance) : ""}
      ${payload.type_of_work === "Emergency repair & maintenance work" ? section("Emergency Repair", emergency) : ""}

      ${section("Remarks", row("Remarks", payload.remarks || ""))}

      <p style="margin-top:18px;">Regards,<br/>ADM04</p>
    </div>
  `;
}

function sendADM03Email(payload, submissionId) {
  const to = payload.requestor_email || "";

  const cc = [
    buildTeamCc(payload.team_name),
    "glacier@perfactgroup.in",
    "logistics.wg@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `Vehicle Requirement`;

  const htmlBody = buildADM03EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ADM03",
    cc: cc,
  });
}

function buildADM03EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;background:#f5f7fa;font-weight:600;width:30%;">
          ${esc(label)}
        </td>
        <td style="border:1px solid #ddd;padding:8px;">
          ${esc(String(value || ""))}
        </td>
      </tr>
    `;
  }

  function section(title, body) {
    return `
      <div style="margin-top:20px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#2c3e50;">
          ${esc(title)}
        </div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
    `;
  }

  // 🔹 MAIN DETAILS
  const mainDetails = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Department", payload.department || ""),
  ].join("");

  // 🔹 SUBFORM TABLE
  function buildDetailsTable(details) {
    if (!details || !details.length) return "<p>No entries</p>";

    const header = `
      <tr style="background:#2c3e50;color:#fff;">
        <th style="padding:6px;border:1px solid #ddd;">#</th>
        <th style="padding:6px;border:1px solid #ddd;">Pick up Date</th>
        <th style="padding:6px;border:1px solid #ddd;">Till Date</th>
        <th style="padding:6px;border:1px solid #ddd;">Person</th>
        <th style="padding:6px;border:1px solid #ddd;">Time</th>
        <th style="padding:6px;border:1px solid #ddd;">Pickup</th>
        <th style="padding:6px;border:1px solid #ddd;">Places</th>
        <th style="padding:6px;border:1px solid #ddd;">Project</th>
        <th style="padding:6px;border:1px solid #ddd;">PCODE</th>
        <th style="padding:6px;border:1px solid #ddd;">Distance</th>
        <th style="padding:6px;border:1px solid #ddd;">Purpose</th>
      </tr>
    `;

    const rows = details
      .map(function (d, i) {
        return `
        <tr>
          <td style="padding:6px;border:1px solid #ddd;">${i + 1}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.date_of_pickup)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.vehicle_required_till_date)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.name_of_person_going_for_visit)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.time_of_pickup_team)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.pickup_point)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.places_to_be_visited)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.project_name)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.pcode)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.distance_travelled)}</td>
          <td style="padding:6px;border:1px solid #ddd;">${esc(d.purpose_of_visit)}</td>
        </tr>
      `;
      })
      .join("");

    return `
      <table style="border-collapse:collapse;width:100%;font-size:12px;">
        ${header}
        ${rows}
      </table>
    `;
  }

  // 🔹 FINAL HTML
  return `
    <div style="font-family:Arial,sans-serif;color:#222;">
      
      <p>Dear Logistics WG,</p>
      <p><b>Vehicle Requirement Form</b> has been submitted.</p>

      ${section("Requester Details", mainDetails)}

      <div style="margin-top:20px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;">
          Vehicle Requirement Details
        </div>
        ${buildDetailsTable(payload.details)}
      </div>

      ${section("Remarks", row("Remarks", payload.remarks || ""))}

      <p style="margin-top:20px;">
        Regards,<br/>
        <b>ADM03</b>
      </p>

    </div>
  `;
}

function sendFQ01Email(payload, submissionId) {
  const to = "spring.aq@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `AQ Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ01EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ01",
    cc: cc,
  });
}

function buildFQ01EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row(
      "AQ Questionnaire Sheet Link",
      payload.aq_questionnaire_sheet_link || "",
    ),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>AQ Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}

      ${payload.remarks ? section("Remarks", row("Remarks", payload.remarks || "")) : ""}

      <p style="margin-top:18px;">Regards,<br/>FQ01</p>
    </div>
  `;
}

function sendFQ02Email(payload, submissionId) {
  const to = "spring.aq@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `AQ Dispersion Model Questionnaire for Project- ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;

  const htmlBody = buildFQ02EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody,
    name: "FQ02",
    cc,
  });
}

function buildFQ02EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;background:#f5f7fa;font-weight:600;">
          ${esc(label)}
        </td>
        <td style="border:1px solid #ddd;padding:8px;">
          ${esc(String(value || ""))}
        </td>
      </tr>
    `;
  }

  function section(title, body) {
    return `
      <div style="margin-top:20px;">
        <div style="font-weight:700;margin-bottom:6px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;">
          ${body}
        </table>
      </div>
    `;
  }

  const basic = [
    row("Submission ID", submissionId),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`,
    ),
    row("Requester Email", payload.requestor_email),
    row("Team Name", payload.team_name),
    row("EAC Name", payload.eac_name),
  ].join("");

  const project = [
    row("Company Name", payload.company_name),
    row("Project Name", payload.project_name),
    row("Developed By", payload.developed_by),
    row("PCODE", payload.pcode),
    row("Category", payload.category),
    row("Sector", payload.sector),
    row("Baseline Season", payload.baseline_season),
  ].join("");

  const address = [
    row("Address Line 1", payload.address_line1),
    row("Address Line 2", payload.address_line2),
    row("City", payload.city),
    row("State", payload.state),
    row("Postal Code", payload.postal_code),
    row("Country", payload.country),
  ].join("");

  const link = [
    row("AQ Dispersion Model Sheet", payload.aq_dispersion_model_link),
  ].join("");

  return `
    <div style="font-family:Arial;">
      <p>Dear Team,</p>
      <p>AQ Dispersion Model Questionnaire for Project- ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Basic Details", basic)}
      ${section("Project Details", project)}
      ${section("Project Address", address)}
      ${section("Model Link", link)}

      ${payload.remarks ? section("Remarks", row("Remarks", payload.remarks)) : ""}

      <p style="margin-top:20px;">Regards,<br/>FQ02</p>
    </div>
  `;
}

function sendFQ03Email(payload, submissionId) {
  const to = "spring.rh@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `RH Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ03EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ03",
    cc: cc,
  });
}

function buildFQ03EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:35%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Type of Project", payload.type_of_project || ""),
    row("Type of Industry", payload.type_of_industry || ""),
  ].join("");

  const addressRows = [
    row("Address Line 1", payload.address_line1 || ""),
    row("Address Line 2", payload.address_line2 || ""),
    row("City", payload.city || ""),
    row("State", payload.state || ""),
    row("Postal Code", payload.postal_code || ""),
    row("Country", payload.country || ""),
  ].join("");

  const landRows = [
    row("Total land Area (m²)", payload.total_land_area_m2 || ""),
    row("Green Belt Area (m²)", payload.green_belt_area_m2 || ""),
    row("Existing Storage Area (m²)", payload.existing_storage_area_m2 || ""),
    row("Proposed Storage Area (m²)", payload.proposed_storage_area_m2 || ""),
    row("Manpower Details", payload.manpower_details || ""),
  ].join("");

  const docsRows = [
    row("EMP Report", payload.emp_report_url || ""),
    row("PFR Report/EIA report", payload.pfr_or_eia_report_url || ""),
    row("KML file", payload.kml_file_url || ""),
    row(
      "MSDS/safety datasheet of Hazardous chemical",
      payload.msds_safety_datasheet_url || "",
    ),
    row("Applicable TOR Details", payload.applicable_tor_details_url || ""),
    row(
      "Mnaufacturing/Process details",
      payload.manufacturing_process_details_url || "",
    ),
    row(
      "Process Flow charts/ P&IDs",
      payload.process_flow_charts_pid_url || "",
    ),
    row("EC", payload.ec_url || ""),
    row("CTE", payload.cte_url || ""),
    row("CTO", payload.cto_url || ""),
    row("Layout of the Plant", payload.layout_of_plant_url || ""),
    row("Layout of Storage Area", payload.layout_of_storage_area_url || ""),
    row(
      "List of Hazardous Chemical handled",
      payload.list_of_hazardous_chemical_handled_url || "",
    ),
    row("List of Solvents handled", payload.list_of_solvents_handled_url || ""),
    row("Project Sheet", payload.project_sheet_url || ""),
    row(
      "Accidents Reported in the past Year",
      payload.accidents_reported_past_year || "",
    ),
    row("HAZOP Report Existing", payload.hazop_report_existing || ""),
    row(
      "Existing Fire Fighting System Details",
      payload.existing_fire_fighting_system_details || "",
    ),
    row("Safety Audit Report", payload.safety_audit_report_url || ""),
    row("List of PPEs Used", payload.list_of_ppes_used || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>RH Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Project Address", addressRows)}
      ${section("Area / Site Details", landRows)}
      ${section("Documents / Supporting Links", docsRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ03</p>
    </div>
  `;
}

function sendFQ04Email(payload, submissionId) {
  const to = "spring.qra@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
    "glacier@perfactgroup.in",
    "kushalbhargava@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `QRA Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ04EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ04",
    cc: cc,
  });
}

function buildFQ04EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:35%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Type of Project", payload.type_of_project || ""),
    row("Type of Industry", payload.type_of_industry || ""),
  ].join("");

  const addressRows = [
    row("Address Line 1", payload.address_line1 || ""),
    row("Address Line 2", payload.address_line2 || ""),
    row("City", payload.city || ""),
    row("State", payload.state || ""),
    row("Postal Code", payload.postal_code || ""),
    row("Country", payload.country || ""),
  ].join("");

  const areaRows = [
    row("Total Land Area", payload.total_land_area_m2 || ""),
    row("Green Belt Area", payload.green_belt_area_m2 || ""),
    row("Existing Storage Area", payload.existing_storage_area_m2 || ""),
    row("Proposed Storage Area", payload.proposed_storage_area_m2 || ""),
    row("Manpower Details", payload.manpower_details || ""),
  ].join("");

  const docsRows = [
    row("PFR Report/EIA report", payload.pfr_or_eia_report_url || ""),
    row("KML file", payload.kml_file_url || ""),
    row(
      "MSDS/safety datasheet of Hazardous chemical",
      payload.msds_safety_datasheet_url || "",
    ),
    row("Applicable TOR Details", payload.applicable_tor_details_url || ""),
    row(
      "Mnaufacturing/Process details",
      payload.manufacturing_process_details_url || "",
    ),
    row(
      "Process Flow charts/ P&IDs",
      payload.process_flow_charts_pid_url || "",
    ),
    row("Layout of the Plant", payload.layout_of_plant_url || ""),
    row("Layout of Storage Area", payload.layout_of_storage_area_url || ""),
    row(
      "List of Hazardous Chemical handled",
      payload.list_of_hazardous_chemical_handled || "",
    ),
    row("List of Solvents handled", payload.list_of_solvents_handled || ""),
    row("Project Sheet", payload.project_sheet_url || ""),
    row("Existing HAZOP Report", payload.existing_hazop_report || ""),
    row("Existing QRA Report", payload.existing_qra_report || ""),
    row(
      "Existing Fire Fighting System Details",
      payload.existing_fire_fighting_system_details || "",
    ),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>QRA Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Project Address", addressRows)}
      ${section("Area / Site Details", areaRows)}
      ${section("Documents / Supporting Links", docsRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ04</p>
    </div>
  `;
}

function sendFQ06Email(payload, submissionId) {
  const to = "spring.hg_geo@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `HG & Geo Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ06EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ06",
    cc: cc,
  });
}

function buildFQ06EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:35%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const linksRows = [
    row("Link to KML", payload.kml_link || ""),
    row("Link to Topo Map", payload.topo_map_link || ""),
    row("Link to other Maps", payload.other_maps_link || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>HG & Geo Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Map Links", linksRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ06</p>
    </div>
  `;
}

function sendFQ07Email(payload, submissionId) {
  const to = "spring.lu@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `LU Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ07EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ07",
    cc: cc,
  });
}

function buildFQ07EmailHtml(payload, submissionId) {
  const esc = (v) =>
    HtmlService.createHtmlOutput(String(v == null ? "" : v)).getContent();

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Type of Project", payload.type_of_project || ""),
    row("Physical Features", payload.physical_features || ""),
    row("Core Zone (radio)", payload.core_zone_type || ""),
    row("Buffer Zone (radio)", payload.buffer_zone_type || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row("FAE report link", payload.fae_report_link || ""),
  ].join("");

  const landRows = [
    row("Project area", payload.project_area || ""),
    row("Build-up area", payload.build_up_area || ""),
    row("Mine area", payload.mine_area || ""),
    row("Dump area", payload.dump_area || ""),
    row("Plantation area", payload.plantation_area || ""),
    row("Road area", payload.road_area || ""),
    row("Open area", payload.open_area || ""),
    row("Other", payload.other_details || ""),
    row(
      "Environmentally Sensitive Area",
      payload.environmentally_sensitive_area || "",
    ),
    row("CORE ZONE", payload.core_zone_distance || ""),
    row("BUFFER ZONE", payload.buffer_zone_distance || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const archRows =
    payload.archaeological_details && payload.archaeological_details.length
      ? payload.archaeological_details
          .map(function (r, i) {
            return `
          <tr>
            <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.name || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.distance_from_project_site || "")}</td>
          </tr>
        `;
          })
          .join("")
      : `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`;

  const archTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Name</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Distance from project site</th>
        </tr>
      </thead>
      <tbody>${archRows}</tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>LU Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Archeological or important buildings</div>
        ${archTable}
      </div>
      ${section("Land Details / Notes", landRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ07</p>
    </div>
  `;
}

function sendFQ08Email(payload, submissionId) {
  const to = "spring.se@perfactgroup.in";

  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `SE Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;

  const htmlBody = buildFQ08EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody,
    name: "FQ08",
    cc,
  });
}

function buildFQ08EmailHtml(payload, submissionId) {
  const esc = (v) => HtmlService.createHtmlOutput(String(v || "")).getContent();

  const row = (label, value) => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:35%;">
        ${esc(label)}
      </td>
      <td style="border:1px solid #ccc;padding:6px;">
        ${esc(value)}
      </td>
    </tr>
  `;

  const section = (title, rowsHtml) => `
    <div style="margin-top:20px;">
      <div style="font-weight:700;margin-bottom:8px;font-size:14px;">
        ${esc(title)}
      </div>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  // 🔹 BASIC DETAILS
  const basicDetails = [
    row("Submission ID", submissionId),
    row("Date", payload.date),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`,
    ),
    row("Requester Email", payload.requestor_email),
    row("Team Name", payload.team_name),
    row("Company Name", payload.company_name),
    row("Project Name", payload.project_name),
    row("PCODE", payload.pcode),
    row("Category", payload.category),
    row("Sector", payload.sector),
    row("EAC Name", payload.eac_name),
    row("Type of Project", payload.type_of_project),
  ].join("");

  // 🔹 DOCUMENT LINKS
  const documents = [
    row("TOR Letter", payload.tor_letter_link),
    row("KML/KMZ of Project Area", payload.kml_kmz_link),
    row("Topographical / Village SE Map", payload.topo_map_link),
    row("Chapter 2", payload.chapter_2_link),
  ].join("");

  // 🔹 CONTENT / DATA
  const content = [
    row("Industries in Study Area", payload.industries_in_study_area),
    row("Primary SE Data", payload.primary_se_data),
    row("Other Information", payload.other_info),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
      
      <p>Dear Team,</p>
      <p>SE Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Basic Details", basicDetails)}
      ${section("Documents / Links", documents)}
      ${section("SE Data & Inputs", content)}

      <p style="margin-top:20px;">
        Regards,<br/>
        <strong>FQ08</strong>
      </p>

    </div>
  `;
}

function sendFQ09Email(payload, submissionId) {
  const to = "spring.lu@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `Environmental Sensitivity and TOPO Maps Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ09EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ09",
    cc: cc,
  });
}

function buildFQ09EmailHtml(payload, submissionId) {
  const esc = (v) =>
    HtmlService.createHtmlOutput(String(v == null ? "" : v)).getContent();

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const addressRows = [
    row("Address Line 1", payload.address_line1 || ""),
    row("Address Line 2", payload.address_line2 || ""),
    row("City", payload.city || ""),
    row("State", payload.state || ""),
    row("Postal Code", payload.postal_code || ""),
    row("Country", payload.country || ""),
  ].join("");

  const reqRows = [
    row("Basic Requirement", payload.basic_requirements || ""),
    row("Layout Upload", payload.layout_upload_link || ""),
    row("Coordinates Upload", payload.coordinates_upload_link || ""),
    row("KML Upload", payload.kml_upload_link || ""),
    row(
      "Topo Map and Sensitivity",
      payload.topo_map_and_sensitivity_required || "",
    ),
    row("other maps required", payload.other_maps_required || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>Environmental Sensitivity and TOPO Maps Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Project Address", addressRows)}
      ${section("Requirements / Attachments", reqRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ09</p>
    </div>
  `;
}

function sendFQ10Email(payload, submissionId) {
  const to = "spring.lu@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `LU and other Maps Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ10EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ10",
    cc: cc,
  });
}

function buildFQ10EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Type of Work", payload.type_of_work || ""),
  ].join("");

  const addressRows = [
    row("Address Line 1", payload.address_line1 || ""),
    row("Address Line 2", payload.address_line2 || ""),
    row("City", payload.city || ""),
    row("State", payload.state || ""),
    row("Postal Code", payload.postal_code || ""),
    row("Country", payload.country || ""),
  ].join("");

  const reqRows = [
    row("Basic Requirement", payload.basic_requirements || ""),
    row("Layout Upload", payload.layout_upload_link || ""),
    row("Coordinates Upload", payload.coordinates_upload_link || ""),
    row("KML Upload", payload.kml_upload_link || ""),
    row("LU Map", payload.lu_map_required || ""),
    row("Other Maps", payload.other_maps_required || ""),
    row("Sampling Maps", payload.sampling_maps_required || ""),
    row("IDW Maps", payload.idw_maps_required || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>LU and other Maps Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Project Address", addressRows)}
      ${section("Requirements / Maps", reqRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ10</p>
    </div>
  `;
}

function sendFQ11Email(payload, submissionId) {
  const to = "traffic@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `Traffic Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ11EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ11",
    cc: cc,
  });
}

function buildFQ11EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const roadRows = [
    row(
      "Road Network & Residential Localities Within 2 km of Project",
      payload.road_network_residential_localities || "",
    ),
    row("Road Width (m)", payload.road_width_m || ""),
    row("Road Lane", payload.road_lane || ""),
    row("Type of Road", payload.type_of_road || ""),
    row("Road Linkage From", payload.road_linkage_from || ""),
    row("Road Linkage To", payload.road_linkage_to || ""),
    row(
      "Parking requirement of the Project",
      payload.parking_requirement || "",
    ),
    row("Parking Provision at Site", payload.parking_provision_at_site || ""),
    row("Traffic Circulation Plan", payload.traffic_circulation_plan || ""),
    row(
      "Details of Entry and Exit Gates",
      payload.details_of_entry_exit_gates || "",
    ),
    row(
      "Photographs of the Parking provision at Site and nearby area",
      payload.parking_photos_url || "",
    ),
    row(
      "Traffic Volume Survey of Roads",
      payload.traffic_volume_survey_of_roads || "",
    ),
    row(
      "Incremental traffic from Project Site",
      payload.incremental_traffic_from_project_site || "",
    ),
    row("KML file of Project", payload.kml_file_url || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>Traffic Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Traffic Details", roadRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ11</p>
    </div>
  `;
}

function sendFQ13Email(payload, submissionId) {
  const to = "spring.additionalstudies@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    "glacier@perfactgroup.in",
    "kushalbhargava@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `${payload.additional_report_type} information sheet for Project- ${truncate(payload.project_name || "", 42)} with PCODE-${payload.pcode || ""}`;
  const htmlBody = buildFQ13EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ13",
    cc: cc,
  });
}

function buildFQ13EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const detailRows = [
    row("Additional Report Type", payload.additional_report_type || ""),
    row("Expected Target Date", payload.expected_target_date || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>${payload.additional_report_type} information sheet for Project- ${payload.project_name || ""} with PCODE-${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Additional Details", detailRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ13</p>
    </div>
  `;
}

function sendFQ15Email(payload, submissionId) {
  const to = "spring.additionalstudies@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    "glacier@perfactgroup.in",
    "kushalbhargava@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `CBA information sheet for Project- ${truncate(payload.project_name || "", 42)} with PCODE-${payload.pcode || ""}`;
  const htmlBody = buildFQ15EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody,
    name: "FQ15",
    cc,
  });
}

function buildFQ15EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const detailRows = [
    row("CBA sheet link", payload.cba_sheet_link || ""),
    row("Expected Target Date", payload.expected_target_date || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>CBA information sheet for Project- ${payload.project_name || ""} with PCODE-${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Additional Details", detailRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ15</p>
    </div>
  `;
}

function sendTF12Email(payload, submissionId) {
  const to = "qc.council@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    getEmailByName(payload.csuite_officer),
    getEmailByName(payload.eia_coordinator),
  ]
    .filter(Boolean)
    .join(",");

  const subject = `QC request for Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.pcode || ""}`;
  const htmlBody = buildTF12EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF12",
    cc: cc,
  });
}

function buildTF12EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Team Name", payload.team_name || ""),
    row("EIA Coordinator", payload.eia_coordinator || ""),
    row("C-Suite Officer", payload.csuite_officer || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Location of the project", payload.location_of_project || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Status/ Stage of the Case", payload.stage_of_case || ""),
    row("Link to Project Sheet", payload.project_sheet_link || ""),
    row("Link to KML", payload.kml_link || ""),
    row("Link to Annexure Folder", payload.annexure_folder_link || ""),
    row("Link to Initial Pages", payload.initial_pages_link || ""),
    row("Target Date for review", payload.target_date_for_review || ""),
    row("Remarks / Critical points by Team", payload.remarks || ""),
  ].join("");

  const filesRows = (payload.files_to_be_reviewed || [])
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.type_of_document || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.document_link || "")}</td>
      </tr>
    `;
    })
    .join("");

  const filesTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Type of document</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Document link</th>
        </tr>
      </thead>
      <tbody>
        ${filesRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}
      </tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>QC request for Project- ${payload.project_name || ""} with PCODE- ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Files to be reviewed</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Docs linked for review must be PDFs only.</div>
        ${filesTable}
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF12</p>
    </div>
  `;
}

function sendTF17Email(payload, submissionId) {
  const inviteeEmails = (payload.person_expert_invited || [])
    .map(function (r) {
      return String(r.email_id_of_invitee || "").trim();
    })
    .filter(Boolean);

  const to = [payload.employee_email, ...inviteeEmails]
    .filter(Boolean)
    .join(",");

  const cc = [buildTeamCc(payload.team_name), "teameia@perfactgroup.in"]
    .filter(Boolean)
    .join(",");

  const subject = `MoM published on ${payload.mom_publish_date || ""} for Appraisal Meeting for project ${truncate(payload.project_name || "", 42)} and Agenda no. ${payload.agenda_number || ""}`;
  const htmlBody = buildTF17EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF17",
    cc: cc,
  });
}

function buildTF17EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("EAC/SEAC", payload.eac_seac || ""),
    row("Agenda Number", payload.agenda_number || ""),
    row("MoM publish date", payload.mom_publish_date || ""),
    row("MoM link", payload.mom_link || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const inviteeRows = (payload.person_expert_invited || [])
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.name_of_invitee || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.email_id_of_invitee || "")}</td>
      </tr>
    `;
    })
    .join("");

  const actionRows = (payload.action_points || [])
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.actionable_point || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.responsible_person_name || "")}</td>
      </tr>
    `;
    })
    .join("");

  const inviteeTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Name of Invitee</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Email ID of Invitee</th>
        </tr>
      </thead>
      <tbody>${inviteeRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}</tbody>
    </table>
  `;

  const actionTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">actionable point</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">responsible person name</th>
        </tr>
      </thead>
      <tbody>${actionRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}</tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>MoM published on ${payload.mom_publish_date || ""} for Appraisal Meeting for project ${payload.project_name || ""} and Agenda no. ${payload.agenda_number || ""} has been submitted successfully.</p>

      ${section("Submission Summary", mainRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Person/Expert Invited</div>
        ${inviteeTable}
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Action Points and responsibility</div>
        ${actionTable}
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF17</p>
    </div>
  `;
}

function sendTF13Email(payload, submissionId) {
  const to = `${buildTeamCc(payload.recipient_team_name)}`;
  const ccList = `qc.council@perfactgroup.in, ${getEmailByName(payload.eia_coordinator_name)}, ${getEmailByName(payload.csuite_officer_name)}`;
  const subject = `QCC Response for Project- ${truncate(payload.project_name || "", 42)}  with PCODE- ${payload.pcode || ""}`;
  const htmlBody = buildTF13EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF13",
    cc: ccList,
  });
}

function buildTF13EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row("Recipient Team Name", payload.recipient_team_name || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
    row("C-Suite officer Involved", payload.csuite_officer_name || ""),
    row("Name of the project", payload.project_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Location of the project", payload.location_of_project || ""),
    row("PCODE", payload.pcode || ""),
    row("Status/ Stage of the Case", payload.status_stage_of_case || ""),
    row("Review Level", payload.review_levels || ""),
    row("Level 1 Reviewer Name", payload.level1_reviewer_names || ""),
    row("Level 1 Reviewer Remarks", payload.level1_reviewer_remarks || ""),
    row("Level 2 Reviewer Name", payload.level2_reviewer_names || ""),
    row("Level 2 Reviewer Remarks", payload.level2_reviewer_remarks || ""),
    row("Level 3 Reviewer Name", payload.level3_reviewer_names || ""),
    row("Level 3 Reviewer Remarks", payload.level3_reviewer_remarks || ""),
    row("Review Date", payload.review_date || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const obsHtml = function (rows, level) {
    const safeRows = (rows || [])
      .map(function (r, i) {
        return `
        <tr>
          <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
          <td style="border:1px solid #ccc;padding:6px;">${esc(r.observation_link || "")}</td>
        </tr>
      `;
      })
      .join("");

    return `
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr>
            <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
            <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Observation link</th>
          </tr>
        </thead>
        <tbody>${safeRows || `<tr><td colspan="2" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}</tbody>
      </table>
    `;
  };

  const filesReviewedRows = (payload.files_reviewed || []).filter(function (r) {
    return (
      String(r.type_of_document || "").trim() ||
      String(r.document_link || "").trim()
    );
  });

  const filesReviewedHtml = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Type of Documents submitted</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Document link</th>
        </tr>
      </thead>
      <tbody>
        ${
          filesReviewedRows.length
            ? filesReviewedRows
                .map(function (r, i) {
                  return `
                  <tr>
                    <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
                    <td style="border:1px solid #ccc;padding:6px;">${esc(r.type_of_document || "")}</td>
                    <td style="border:1px solid #ccc;padding:6px;">${esc(r.document_link || "")}</td>
                  </tr>
                `;
                })
                .join("")
            : `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`
        }
      </tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.recipient_team_name} Team,</p>
      <p>QCC Response for Project- ${payload.project_name || ""}  with PCODE- ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", mainRows)}

      ${
        String(payload.review_levels || "").includes("Level 1")
          ? section(
              "Level 1",
              [
                row(
                  "Level-1 Reviewer Name",
                  payload.level1_reviewer_names || "",
                ),
                row(
                  "Level-1 Reviewer Remarks",
                  payload.level1_reviewer_remarks || "",
                ),
              ].join(""),
            )
          : ""
      }

      ${
        String(payload.review_levels || "").includes("Level 1")
          ? `
        <div style="margin-top:14px;">
          <div style="font-weight:700;margin-bottom:8px;">Level-1 Reviewer Observations</div>
          ${obsHtml(payload.level1_observations || [], "Level 1")}
        </div>
      `
          : ""
      }

      ${
        String(payload.review_levels || "").includes("Level 2")
          ? section(
              "Level 2",
              [
                row(
                  "Level-2 Reviewer Name",
                  payload.level2_reviewer_names || "",
                ),
                row(
                  "Level-2 Reviewer Remarks",
                  payload.level2_reviewer_remarks || "",
                ),
              ].join(""),
            )
          : ""
      }

      ${
        String(payload.review_levels || "").includes("Level 2")
          ? `
        <div style="margin-top:14px;">
          <div style="font-weight:700;margin-bottom:8px;">Level-2 Reviewer Observations</div>
          ${obsHtml(payload.level2_observations || [], "Level 2")}
        </div>
      `
          : ""
      }

      ${
        String(payload.review_levels || "").includes("Level 3")
          ? section(
              "Level 3",
              [
                row(
                  "Level-3 Reviewer Name",
                  payload.level3_reviewer_names || "",
                ),
                row(
                  "Level-3 Reviewer Remarks",
                  payload.level3_reviewer_remarks || "",
                ),
              ].join(""),
            )
          : ""
      }

      ${
        String(payload.review_levels || "").includes("Level 3")
          ? `
        <div style="margin-top:14px;">
          <div style="font-weight:700;margin-bottom:8px;">Level-3 Reviewer Observations</div>
          ${obsHtml(payload.level3_observations || [], "Level 3")}
        </div>
      `
          : ""
      }

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Files Reviewed</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Docs linked for review must be PDFs only.</div>
        ${filesReviewedHtml}
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF13</p>
    </div>
  `;
}

function sendTF04Email(payload, submissionId) {
  const to = payload.employee_email || "";
  const cc = `info@perfactgroup.in, ${payload.team_head_email || ""}, topmanagement@perfactgroup.in, ${buildTeamCc(payload.team_name)}`;

  const subject = `Long Leave or Relieving Work handover from- ${payload.employee_first_name || ""} ${payload.employee_last_name || ""} due to- ${truncate(payload.reason_for_handover || "", 42)}`;
  const htmlBody = buildTF04EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF04",
    cc: cc,
  });
}

function buildTF04EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row("Employee Email ID", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Designation", payload.designation || ""),
    row("Joining Date", payload.joining_date || ""),
    row("Leaving/Relieving Date", payload.leaving_or_relieving_date || ""),
    row("Reason for Handover", payload.reason_for_handover || ""),
    row(
      "Team Head Name",
      `${payload.team_head_first_name || ""} ${payload.team_head_last_name || ""}`.trim(),
    ),
    row("Team Head Email ID", payload.team_head_email || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

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

  const projectsRows = usedProjects.length
    ? usedProjects
        .map(function (r, i) {
          return `
          <tr>
            <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.project_name || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.pcode || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.details_of_project || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.important_docs_docx_link || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.important_docs_pdf_link || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.critical_points || "")}</td>
            <td style="border:1px solid #ccc;padding:6px;">${esc(r.new_contact_person_name || "")}</td>
          </tr>
        `;
        })
        .join("")
    : `<tr><td colspan="8" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`;

  const projectsTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Project Name</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">PCode</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Details of project</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Docx link</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">PDF link</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Critical points</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">New contact person</th>
        </tr>
      </thead>
      <tbody>${projectsRows}</tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.employee_first_name || ""} ${payload.employee_last_name || ""},</p>
      <p>Your Long Leave or Relieving Work handover response has been submitted successfully.</p>

      ${section("Submission Summary", mainRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Details of Projects being handeled</div>
        ${projectsTable}
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF04</p>
    </div>
  `;
}

function sendADM05Email(payload, submissionId) {
  const to = `logistics.wg@perfactgroup.in, budget.wg@perfactgroup.in, accreditation.wg@perfactgroup.in`;
  const cc = `topmanagement@perfactgroup.in, arctic@perfactgroup.in, glacier@perfactgroup.in, ${payload.requestor_email || ""}, ${buildTeamCc(payload.team_name)}`;
  const subject = `Ticket booking request for Project- ${truncate(payload.project_name || "", 42)} with PCode ${payload.pcode || ""}`;
  const htmlBody = buildADM05EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody,
    name: "ADM05",
    cc,
  });
}

function buildADM05EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  function legRows(legLabel, d) {
    const mode = String(d.mode_of_travel || "").toLowerCase();
    const rows = [
      row("Date of travel", d.date_of_travel || ""),
      row("Name of person travelling", d.name_of_person_travelling || ""),
      row("Source city name", d.source_city_name || ""),
      row("Destination city name", d.destination_city_name || ""),
      row("Mode of travel", d.mode_of_travel || ""),
    ];

    if (mode === "air") {
      rows.push(
        row("Airline name", d.airline_name || ""),
        row("Flight number", d.flight_number || ""),
        row("Departure terminal", d.departure_terminal || ""),
        row("Departure time", d.departure_time || ""),
        row("Arrival time", d.arrival_time || ""),
        row("Whether excess baggage required", d.excess_baggage_required || ""),
        row("Ticket price per person", d.ticket_price_per_person || ""),
      );
    }

    if (mode === "train") {
      rows.push(
        row("Train name and number", d.train_name_and_number || ""),
        row(
          "Departure railway station name and code",
          d.departure_railway_station_name_and_code || "",
        ),
        row(
          "Arrival railway station and code",
          d.arrival_railway_station_name_and_code || "",
        ),
        row("Departure time", d.train_departure_time || ""),
        row("Arrival time", d.train_arrival_time || ""),
        row("Ticket price per person", d.ticket_price_per_person || ""),
      );
    }

    if (mode === "bus") {
      rows.push(
        row("Bus service provider name", d.bus_service_provider_name || ""),
        row("Departure point", d.bus_departure_point || ""),
        row("Departure time", d.bus_departure_time || ""),
        row("Arrival time", d.bus_arrival_time || ""),
        row("Per person ticket price", d.bus_ticket_price_per_person || ""),
      );
    }

    if (legLabel.includes("Onward")) {
      rows.push(row("Hotel booking required", d.hotel_booking_required || ""));
      if (String(d.hotel_booking_required || "").toLowerCase() === "yes") {
        rows.push(
          row("Check-in date", d.check_in_date || ""),
          row("Check-out date", d.check_out_date || ""),
          row("Occupancy", d.occupancy || ""),
          row("Preferred hotel name", d.preferred_hotel_name || ""),
          row("Tariff per night", d.tariff_per_night || ""),
        );
      }
    }

    return section(legLabel, rows.join(""));
  }

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""},</p>
      <p>Your request for Ticket booking for Project- ${payload.project_name || ""} with PCode ${payload.pcode || ""} has been submitted successfully.</p>

      ${section(
        "Submission Summary",
        [
          row("Submission ID", submissionId),
          row("Date", payload.date || ""),
          row(
            "Requestor Name",
            `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
          ),
          row("Requestor Email", payload.requestor_email || ""),
          row("Team Name", payload.team_name || ""),
          row("Project Name", payload.project_name || ""),
          row("Project Code", payload.pcode || ""),
          row("Purpose of travel", payload.purpose_of_travel || ""),
          row("If Others (Pls specify)", payload.purpose_of_travel_other || ""),
          row("Trip Type", payload.trip_type || ""),
          row("Visit Start Date", payload.visit_start_date || ""),
          row("Visit End Date", payload.visit_end_date || ""),
          row("Travel in scope of", payload.travel_in_scope_of || ""),
          row(
            String(payload.trip_type || "") === "One way"
              ? "Total Amount for ticket booking (One way)"
              : "Total Amount for ticket booking (To & Fro)",
            payload.total_ticket_amount || "",
          ),
          row(
            "Lodging/ Food in scope of",
            payload.lodging_food_in_scope_of || "",
          ),
          row(
            "Total amount for Hotel booking",
            payload.total_hotel_amount || "",
          ),
          row("Remarks", payload.remarks || ""),
        ].join(""),
      )}

      ${legRows("Travel booking details - Onward", payload.onward || {})}
      ${
        String(payload.trip_type || "") === "One way"
          ? ""
          : legRows("Travel booking details - Return", payload.return || {})
      }

      <p style="margin-top:18px;">Regards,<br/>ADM05</p>
    </div>
  `;
}

function sendTF18Email(payload, submissionId) {
  const to = "rachna.dogra@perfactgroup.in, fountain@perfactgroup.in";
  const cc = [buildTeamCc(payload.team_name), payload.requestor_email || ""]
    .filter(Boolean)
    .join(",");

  const subject = `TRF for Project- ${truncate(payload.project_name || "", 42)} with PCode ${payload.pcode || ""}`;
  const htmlBody = buildTF18EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF18",
    cc: cc,
  });
}

function buildTF18EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
  ].join("");

  const addressRows = [
    row("Site Address Line 1", payload.site_address_line1 || ""),
    row("Site Address Line 2", payload.site_address_line2 || ""),
    row("City", payload.site_city || ""),
    row("State", payload.site_state || ""),
    row("Zip Code", payload.site_zipcode || ""),
    row("Country", payload.site_country || ""),
  ].join("");

  const contactRows = [
    row(
      "Contact Person",
      `${payload.contact_person_first_name || ""} ${payload.contact_person_last_name || ""}`.trim(),
    ),
    row("Contact Detail", payload.contact_detail_of_contact_person || ""),
    row(
      "Project Incharge",
      `${payload.project_incharge_first_name || ""} ${payload.project_incharge_last_name || ""}`.trim(),
    ),
  ].join("");

  const detailsRows = [
    row(
      "Brief Description of Project",
      payload.brief_description_of_project || "",
    ),
    row("Baseline Season", payload.baseline_season || ""),
    row("Baseline Season Specify", payload.baseline_season_other_specify || ""),
    row("Baseline Season Start Date", payload.baseline_season_start_date || ""),
    row("Baseline Season End Date", payload.baseline_season_end_date || ""),
    row("Date of Monitoring", payload.date_of_monitoring || ""),
    row("TOR Specific Requirements", payload.tor_specific_requirements || ""),
    row("Socio Economy Requirements", payload.socio_economy_requirements || ""),
    row("EB Requirements", payload.eb_requirements || ""),
    row(
      "EB Requirement Specifications",
      payload.eb_requirement_specifications || "",
    ),
    row("EB Requirement Remark", payload.eb_requirement_remark || ""),
    row(
      "Any other Details required from Site",
      payload.any_other_details_required_from_site || "",
    ),
    row(
      "Scope of Travelling, Boarding, Lodging, etc",
      payload.scope_of_travelling_boarding_lodging || "",
    ),
    row("Completion Target Date", payload.completion_target_date || ""),
    row("Critical Parameters if any", payload.critical_parameters_if_any || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const docsRows = [
    row("Upload Topo sheet", payload.upload_topo_sheet_link || ""),
    row("Upload KML file", payload.upload_kml_file_link || ""),
    row(
      "Upload Environmental Sensitivity file",
      payload.upload_environmental_sensitivity_file_link || "",
    ),
    row("Sampling Plan Details", payload.sampling_plan_details_link || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>TRF for Project- ${truncate(payload.project_name || "", 42)} with PCode ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Address", addressRows)}
      ${section("Contact / Incharge", contactRows)}
      ${section("Project Details / Requirements", detailsRows)}
      ${section("File Links", docsRows)}

      <p style="margin-top:18px;">Regards,<br/>TF18</p>
    </div>
  `;
}

function sendADM09Email(payload, submissionId) {
  const to = payload.employee_email || "";

  const cc = [
    "bsns.assoc.wg@perfactgroup.in",
    "ext.affairs.council@perfactgroup.in",
    "priority.wg@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `ADM09 | Follow up responsibility | ${payload.visit_type || ""} | ${payload.place_visited || ""}`;
  const htmlBody = buildADM09EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ADM09",
    cc: cc,
  });
}

function buildADM09EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Employee ID", payload.employee_id || ""),
    row("Visit Type", payload.visit_type || ""),
    row("Place Visited", payload.place_visited || ""),
    row("Last visit date", payload.last_visit_date || ""),
    row("Next visit planned date", payload.next_visit_planned_date || ""),
    row(
      "Key personnel with whom communicated in ministry",
      payload.key_personnel_with_whom_communicated || "",
    ),
    row("Details of visit", payload.details_of_visit || ""),
    row(
      "Action required / expected update",
      payload.action_required_expected_update || "",
    ),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const peopleRows = (payload.people || [])
    .filter(function (r) {
      return (
        String(r.name_of_person || "").trim() ||
        String(r.email_id_of_person || "").trim()
      );
    })
    .map(function (r, i) {
      return `
        <tr>
          <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
          <td style="border:1px solid #ccc;padding:6px;">${esc(r.name_of_person || "")}</td>
          <td style="border:1px solid #ccc;padding:6px;">${esc(r.email_id_of_person || "")}</td>
        </tr>
      `;
    })
    .join("");

  const projectRows = (payload.projects || [])
    .filter(function (r) {
      return (
        String(r.project_name || "").trim() ||
        String(r.pcode || "").trim() ||
        String(r.outcome_of_visit || "").trim()
      );
    })
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.project_name || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.pcode || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.outcome_of_visit || "")}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>ADM09 has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Name email of person</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Name of person</th>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Email ID of person</th>
            </tr>
          </thead>
          <tbody>
            ${peopleRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}
          </tbody>
        </table>
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Relevant Project Details</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Project Name</th>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">PCODE</th>
              <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Outcome of the Visit</th>
            </tr>
          </thead>
          <tbody>
            ${projectRows || `<tr><td colspan="4" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}
          </tbody>
        </table>
      </div>

      <p style="margin-top:18px;">Regards,<br/>ADM09</p>
    </div>
  `;
}

function sendTF19Email(payload, submissionId) {
  const to = payload.official_email || "";

  // Resolve emails for every row in a sub-form by mapping the
  // selected name through the config name -> email map.
  function rowEmails(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((r) => getEmailByName(r && r.name))
      .filter(Boolean)
      .join(",");
  }

  // Assistant emails are entered manually by the user in the EIA
  // section (assistants are not in the config dropdowns).
  function assistantEmails(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((r) => String((r && r.assistant_email) || "").trim())
      .filter(Boolean)
      .join(",");
  }

  const cc = [
    rowEmails(payload.eia_rows),
    assistantEmails(payload.eia_rows),
    rowEmails(payload.faeA_rows),
    rowEmails(payload.faeB_rows),
    rowEmails(payload.faa_rows),
    rowEmails(payload.team_rows),
    buildTeamCc(payload.team_name),
    "logistics.wg@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `Initial Pages for Project- ${truncate(payload.project_name || "", 42)} with Project Code- ${payload.pcode || ""}`;
  const htmlBody = buildTF19EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody,
    name: "TF19",
    cc,
  });
}

function buildTF19EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  function buildPeopleSection(title, rows, isEia) {
    rows = Array.isArray(rows) ? rows : [];
    const content = rows
      .map(function (r, i) {
        const derivedEmail = getEmailByName(r && r.name);
        let html = row(
          `${i + 1}. Name`,
          `${r.name || ""}${derivedEmail ? " (" + derivedEmail + ")" : ""}`,
        );
        if (isEia) {
          if (r.assistant_name)
            html += row(`${i + 1}. Assistant Name`, r.assistant_name);
          if (r.assistant_email)
            html += row(`${i + 1}. Assistant Email`, r.assistant_email);
        } else {
          html += row(`${i + 1}. Functional Area`, r.functional_area || "");
        }
        return html;
      })
      .join("");
    return section(title, content || row("Info", "No entries"));
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requestor",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Official Email", payload.official_email || ""),
    row("Client Name", payload.client_name || ""),
    row("Project Name", payload.project_name || ""),
    row(
      "Site Address",
      [
        payload.site_address_line1,
        payload.site_address_line2,
        payload.site_city,
        payload.site_state,
        payload.site_zipcode,
        payload.site_country,
      ]
        .filter(Boolean)
        .join(", "),
    ),
    row("PCODE", payload.pcode || ""),
    row("Team Name", payload.team_name || ""),
    row("Sector", payload.sector || ""),
    row("Category", payload.category || ""),
    row("Type of Work", payload.type_of_work || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Status/ Stage of the Case", payload.stage_of_case || ""),
    row("Link to Project Sheet", payload.project_sheet_link || ""),
    row("Link to KML", payload.kml_link || ""),
    row("Target Date for review", payload.target_date_for_review || ""),
    row(
      "Link to the initial pages in Word format",
      payload.initial_pages_word_link || "",
    ),
    row(
      "Link to the initial pages in PDF format",
      payload.initial_pages_pdf_link || "",
    ),
    row(
      "Signed copy of Initial Pages",
      payload.signed_copy_initial_pages_url || "",
    ),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>Initial Pages for Project- ${payload.project_name || ""} with Project Code- ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", mainRows)}
      ${buildPeopleSection("1. Details of EIA Coordinators & Assistants to EIA Coordinators", payload.eia_rows, true)}
      ${buildPeopleSection("2. Details for Category A FAEs", payload.faeA_rows, false)}
      ${buildPeopleSection("3. Details for Category B FAEs", payload.faeB_rows, false)}
      ${buildPeopleSection("4. Details of FAA", payload.faa_rows, false)}
      ${buildPeopleSection("5. Details of Team members", payload.team_rows, false)}

      <p style="margin-top:18px;">Regards,<br/>TF19</p>
    </div>
  `;
}

function sendTF08Email(payload, submissionId) {
  const to = `${payload.employee_email || ""}, ${buildTeamCc(payload.team_name)}`;
  const cc = [
    "info@perfactgroup.in",
    "accounts@perfactgroup.in",
    "topmanagement@perfactgroup.in",
    "teameia@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(", ");

  const milestoneLabel =
    String(payload.milestone_achieved || "").toLowerCase() === "other"
      ? `Other | ${payload.milestone_achieved_other || ""}`
      : payload.milestone_achieved || "";

  const subject = `Closing of Project- ${truncate(payload.project_name || "", 42)} with PCode- ${payload.project_code || ""} and Milestone achieved- ${truncate(milestoneLabel, 42)}`;

  const htmlBody = buildTF08EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF08",
    cc: cc,
  });
}

function buildTF08EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const typeOfWorkLabel =
    String(payload.type_of_work || "").toLowerCase() === "others"
      ? `${payload.type_of_work} | ${payload.type_of_work_other || ""}`
      : payload.type_of_work || "";

  const milestoneLabel =
    String(payload.milestone_achieved || "").toLowerCase() === "other"
      ? `${payload.milestone_achieved} | ${payload.milestone_achieved_other || ""}`
      : payload.milestone_achieved || "";

  const basicRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
  ].join("");

  const projectRows = [
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.project_code || ""),
    row(
      "Project Proponent",
      `${payload.project_proponent_first_name || ""} ${payload.project_proponent_last_name || ""}`.trim(),
    ),
    row(
      "Proposed Project Cost (in lacs)",
      payload.proposed_project_cost_lacs || "",
    ),
    row(
      "Existing Project Cost (in lacs)",
      payload.existing_project_cost_lacs || "",
    ),
    row(
      "Project Cost after getting proposed EC (in lacs)",
      payload.project_cost_after_proposed_ec_lacs || "",
    ),
    row("Plot Area (sq m)", payload.plot_area_sq_m || ""),
    row("Built Up Area (sq m)", payload.built_up_area_sq_m || ""),
    row("Capacity", payload.capacity || ""),
    row("EMP Cost (in lacs) — Capital", payload.emp_cost_capital_lacs || ""),
    row("Type of Work", typeOfWorkLabel),
    row("Link of Project Folder", payload.project_folder_link || ""),
  ].join("");

  const milestoneRows = [
    row("Milestone Achieved", milestoneLabel),
    row("Parivesh Login ID", payload.parivesh_login_id || ""),
    row("Parivesh Password", payload.parivesh_password || ""),
    row("Proposal Number", payload.proposal_number || ""),
    row("Appraising Committee", payload.appraising_committee || ""),
    row("Number of EDS/ ADS generated", payload.eds_ads_count || ""),
    row(
      "No. of appraisal along with dates",
      payload.appraisals_with_dates || "",
    ),
    row("Link of Project Sheet", payload.project_sheet_link || ""),
  ].join("");

  const torRows = [
    row("TOR Application — PDF", payload.tor_application_pdf_link || ""),
    row("TOR Agenda — PDF", payload.tor_agenda_pdf_link || ""),
    row(
      "Link to TOR Presentation — PPT",
      payload.tor_presentation_ppt_link || "",
    ),
    row("TOR Presentation — PDF", payload.tor_presentation_pdf_link || ""),
    row("TOR MOM — PDF", payload.tor_mom_pdf_link || ""),
    row("TOR Letter — PDF", payload.tor_letter_pdf_link || ""),
  ].join("");

  const form1Rows = [
    row("Link to Uploaded Form1(a) — DOCX", payload.form1a_docx_link || ""),
    row("Uploaded Form1(a) — PDF", payload.form1a_pdf_link || ""),
    row("Link to Uploaded Form1(b) — DOCX", payload.form1b_docx_link || ""),
    row("Uploaded Form1(b) — PDF", payload.form1b_pdf_link || ""),
    row("Link to Uploaded Form1(c) — DOCX", payload.form1c_docx_link || ""),
    row("Uploaded Form1(c) — PDF", payload.form1c_pdf_link || ""),
  ].join("");

  const phRows = [
    row("Public Hearing Document — PDF", payload.ph_document_pdf_link || ""),
    row("Link to Public Hearing PPT — PPTX", payload.ph_ppt_link || ""),
    row("Public Hearing PPT — PDF", payload.ph_ppt_pdf_link || ""),
    row(
      "Public Hearing Advertisement — PDF",
      payload.ph_advertisement_pdf_link || "",
    ),
    row("Public Hearing MOM — PDF", payload.ph_mom_pdf_link || ""),
  ].join("");

  const eacRows = [
    row(
      "Link to Final EIA/EMP Submitted to EAC — DOCX",
      payload.final_eia_emp_docx_link || "",
    ),
    row(
      "Final EIA/EMP Submitted to EAC — PDF",
      payload.final_eia_emp_pdf_link || "",
    ),
    row("Agenda — PDF", payload.agenda_pdf_link || ""),
    row(
      "Link to Circulation Documents — DOCX",
      payload.circulation_docs_docx_link || "",
    ),
    row("Circulation Docs — PDF", payload.circulation_docs_pdf_link || ""),
    row(
      "Link to Final Master Presentation — PPT",
      payload.final_master_presentation_ppt_link || "",
    ),
    row(
      "Final Master Presentation — PDF",
      payload.final_master_presentation_pdf_link || "",
    ),
    row(
      "Final Summarised Presentation — PDF",
      payload.final_summarised_presentation_pdf_link || "",
    ),
    row(
      "Post EAC Appraisal Submittals — PDF",
      payload.post_eac_submittals_pdf_link || "",
    ),
    row(
      "MOM (EAC/SEIAA/SEAC) — PDF",
      payload.eac_seiaa_seac_mom_pdf_link || "",
    ),
  ].join("");

  const closingRows = [
    row(
      "Project Completion Certificate — PDF",
      payload.project_completion_certificate_pdf_link || "",
    ),
    row("Project Feedback — PDF", payload.project_feedback_pdf_link || ""),
    row("Final EC Letter — PDF", payload.final_ec_letter_pdf_link || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${esc(payload.employee_first_name || "")} ${esc(payload.employee_last_name || "")},</p>
      <p>Closing of Project- ${payload.project_name || ""} with PCode- ${payload.project_code || ""} and Milestone achieved- ${milestoneLabel} has been submitted successfully and sent for further processing.</p>

      ${section("Submission Summary", basicRows)}
      ${section("Project Details", projectRows)}
      ${section("Milestone &amp; Parivesh", milestoneRows)}
      ${section("ToR Documents", torRows)}
      ${section("Form 1(a), 1(b), 1(c)", form1Rows)}
      ${section("Public Hearing", phRows)}
      ${section("EAC / SEAC Appraisal", eacRows)}
      ${section("Closing Documents", closingRows)}

      <p style="margin-top:18px;">Regards,<br/>TF08</p>
    </div>
  `;
}

function sendTF26Email(payload, submissionId) {
  const to = "upstream@perfactgroup.in, editorial.wg@perfactgroup.in";
  const cc = `${payload.requestor_email}, ${buildTeamCc(payload.team_name)}, kushalbhargava@perfactgroup.in`;

  const subject = `Plagiarism check requested for Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.project_code || ""}`;
  const htmlBody = buildTF26EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF26",
    cc: cc,
  });
}

function buildTF26EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basicRows = [
    row("Submission ID", submissionId),
    row(
      "Requestor Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requestor Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.project_code || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const linkRows = [
    row("Link to EIA MS Word file", payload.eia_word_link || ""),
    row("Link to EIA Google Doc file", payload.eia_gdoc_link || ""),
    row("Link to EIA PDF file", payload.eia_pdf_link || ""),
    row(
      "Link to EIA Single File with Annexure",
      payload.eia_single_file_with_annexure_link || "",
    ),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>Plagiarism check requested for Project- ${esc(payload.project_name || "")} with PCODE- ${esc(payload.project_code || "")}.</p>

      ${section("Submission Summary", basicRows)}
      ${section("EIA Document Links", linkRows)}

      <p style="margin-top:18px;">Regards,<br/>TF26</p>
    </div>
  `;
}

function sendTF15Email(payload, submissionId) {
  const inviteeEmails = (payload.person_expert_invited || [])
    .map(function (r) {
      return String(r.email_id_of_invitee || "").trim();
    })
    .filter(Boolean);

  const eiaCoordinatorEmail = getEmailByName(payload.eia_coordinator_name);

  const to = [payload.employee_email, ...inviteeEmails]
    .filter(Boolean)
    .join(",");

  const cc = [
    buildTeamCc(payload.team_name),
    eiaCoordinatorEmail,
    "spring@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `MoM published for Coordination Meeting on ${payload.meeting_date || ""} for project ${truncate(payload.project_name || "", 42)} (PCODE ${payload.pcode || ""})`;
  const htmlBody = buildTF15EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF15",
    cc: cc,
  });
}

function buildTF15EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row("Date of Meeting", payload.meeting_date || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("EAC/SEAC", payload.eac_seac || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
    row("MoM link", payload.mom_link || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const inviteeRows = (payload.person_expert_invited || [])
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.name_of_invitee || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.email_id_of_invitee || "")}</td>
      </tr>
    `;
    })
    .join("");

  const actionRows = (payload.action_points || [])
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.actionable_point || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.responsible_person_name || "")}</td>
      </tr>
    `;
    })
    .join("");

  const inviteeTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Name of Invitee</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Email ID of Invitee</th>
        </tr>
      </thead>
      <tbody>${inviteeRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}</tbody>
    </table>
  `;

  const actionTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">actionable point</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">responsible person name</th>
        </tr>
      </thead>
      <tbody>${actionRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}</tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>MoM for the Coordination Meeting held on ${payload.meeting_date || ""} for project ${payload.project_name || ""} (PCODE ${payload.pcode || ""}) has been submitted successfully.</p>

      ${section("Submission Summary", mainRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Person/Expert Invited</div>
        ${inviteeTable}
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Action Points and responsibility</div>
        ${actionTable}
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF15</p>
    </div>
  `;
}

function sendTF14Email(payload, submissionId) {
  const inviteeEmails = (payload.person_expert_invited || [])
    .map(function (r) {
      return String(r.email_id_of_invitee || "").trim();
    })
    .filter(Boolean);

  const eiaCoordinatorEmail = getEmailByName(payload.eia_coordinator_name);

  const to = [payload.employee_email, ...inviteeEmails]
    .filter(Boolean)
    .join(",");

  const cc = [buildTeamCc(payload.team_name), eiaCoordinatorEmail]
    .filter(Boolean)
    .join(",");

  const subject = `Coordination Meeting Agenda- ${payload.agenda_of_coordination_meeting || ""} for project ${truncate(payload.project_name || "", 42)} (PCODE ${payload.pcode || ""})`;
  const htmlBody = buildTF14EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF14",
    cc: cc,
  });
}

function buildTF14EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const mainRows = [
    row("Submission ID", submissionId),
    row("Date of Meeting", payload.meeting_date || ""),
    row(
      "Employee Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email", payload.employee_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("EAC/SEAC", payload.eac_seac || ""),
    row("EIA Coordinator", payload.eia_coordinator_name || ""),
    row(
      "Level of Coordination Meeting",
      payload.level_of_coordination_meeting || "",
    ),
    row(
      "Agenda of Coordination Meeting",
      payload.agenda_of_coordination_meeting || "",
    ),
    row("Meeting Link", payload.meeting_link || ""),
  ].join("");

  const inviteeRows = (payload.person_expert_invited || [])
    .map(function (r, i) {
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.name_of_invitee || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.email_id_of_invitee || "")}</td>
      </tr>
    `;
    })
    .join("");

  const inviteeTable = `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Name of Invitee</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">Email ID of Invitee</th>
        </tr>
      </thead>
      <tbody>${inviteeRows || `<tr><td colspan="3" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}</tbody>
    </table>
  `;

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>TheCoordination Meeting Agenda- ${payload.agenda_of_coordination_meeting || ""} for project ${truncate(payload.project_name || "", 42)} (PCODE ${payload.pcode || ""}) has been circulated. Please find the details below.</p>

      ${section("Submission Summary", mainRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Person/Expert Invited</div>
        ${inviteeTable}
      </div>

      <p style="margin-top:18px;">Regards,<br/>TF14</p>
    </div>
  `;
}

function sendHR03Email(payload, submissionId) {
  const to = payload.requestor_email || "";
  const cc = "priority.wg@perfactgroup.in, hr.wg@perfactgroup.in";

  const subject = `Employee Requisition for ${payload.team_name || ""} team at ${payload.job_title || ""} level`;

  const htmlBody = buildHR03EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "HR03",
    cc: cc,
  });
}

function buildHR03EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:38%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const basics = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requestor Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requestor Email", payload.requestor_email || ""),
    row("Team / Department", payload.team_name || ""),
  ].join("");

  const positionRows = [
    row("Job Title", payload.job_title || ""),
    row("No. of Posts", payload.no_of_post || ""),
    row(
      "Existing Staff in this Category",
      payload.existing_staff_in_category || "",
    ),
    row("Location", payload.location || ""),
    row("Type of Appointment", payload.type_of_appointment || ""),
    row(
      "Date by which Resource is Required",
      payload.date_resource_required || "",
    ),
  ].join("");

  const candidateRows = [
    row(
      "Educational / Professional Qualifications Required",
      payload.educational_qualifications_required || "",
    ),
    row("Skills Required", payload.skills_required || ""),
    row("Experience Required", payload.experience_required || ""),
    row("Job Description", payload.job_description || ""),
  ].join("");

  const approvalRows = [
    row("Vacancy caused due to", payload.vacancy_caused_due_to || ""),
    row(
      "Can vacancy be filled through internal transfers / promotion?",
      payload.internal_transfer_possible || "",
    ),
    row("Is Position Approved?", payload.position_approval_status || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${esc(payload.requestor_first_name || "")} ${esc(payload.requestor_last_name || "")},</p>
      <p>Your Employee Requisition for <b>${payload.team_name || ""}</b> team at <b>${payload.job_title || ""}</b> level has been submitted successfully and forwarded to the HR Working Group for review.</p>

      ${section("Requestor Details", basics)}
      ${section("Position Details", positionRows)}
      ${section("Candidate Requirements", candidateRows)}
      ${section("Justification & Approval", approvalRows)}

      <p style="margin-top:18px;">Regards,<br/>HR03</p>
    </div>
  `;
}

function sendFQ05Email(payload, submissionId) {
  const to = "spring.eb@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `EB Questionnaire for Project: ${truncate(payload.project_name || "", 42)} with PCODE: ${payload.pcode || ""}`;
  const htmlBody = buildFQ05EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "FQ05",
    cc: cc,
  });
}

function buildFQ05EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:35%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const typeOfDevDisplay =
    String(payload.type_of_development || "").trim() === "Other"
      ? `Other - ${payload.type_of_development_other || ""}`
      : payload.type_of_development || "";

  const requirementDisplay =
    String(payload.requirement || "").trim() === "other"
      ? `other - ${payload.requirement_other || ""}`
      : payload.requirement || "";

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
    row("Type of Development", typeOfDevDisplay),
  ].join("");

  const areaRows = [
    row("Area of Project (m²)", payload.area_of_project_m2 || ""),
    row("% area to be developed as green", payload.green_area_percentage || ""),
    row(
      "Area already green / to be developed",
      payload.green_area_status || "",
    ),
    row(
      "Existing Trees / Shrub / Grass list",
      payload.existing_trees_shrub_grass_list || "",
    ),
  ].join("");

  const docsRows = [
    row(
      "Primary Site visit data / report",
      payload.primary_site_visit_report_url || "",
    ),
    row("KML file", payload.kml_file_url || ""),
    row(
      "Authenticated list of Flora and Fauna",
      payload.flora_fauna_list_url || "",
    ),
    row("LULC map", payload.lulc_map_url || ""),
    row("DEM", payload.dem_url || ""),
    row("TOPO map", payload.topo_map_url || ""),
    row("Drainage map", payload.drainage_map_url || ""),
    row("Forest Cover map", payload.forest_cover_map_url || ""),
    row(
      "Moisture Conservation map",
      payload.moisture_conservation_map_url || "",
    ),
    row("Fire Prone Area map", payload.fire_prone_area_map_url || ""),
    row("Project Sheet link", payload.project_sheet_url || ""),
    row(
      "Other project area related maps",
      payload.other_project_area_maps_url || "",
    ),
  ].join("");

  const ebRows = [
    row(
      "Coordinate details / elevations / Chapter 2",
      payload.coordinate_details_chapter2 || "",
    ),
    row(
      "EB related TOR Point no. and details",
      payload.eb_tor_point_details || "",
    ),
    row("Requirement", requirementDisplay),
    row(
      "Environment Sensitivity sheet link",
      payload.environment_sensitivity_sheet_url || "",
    ),
    row("EB sheet link", payload.eb_sheet_url || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>EB Questionnaire for Project: ${payload.project_name || ""} with PCODE: ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Area / Site Details", areaRows)}
      ${section("Documents / Supporting Links", docsRows)}
      ${section("EB Details", ebRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ05</p>
    </div>
  `;
}

function sendADM01Email(payload, submissionId) {
  const to = "logistics.wg@perfactgroup.in, office.wg@perfactgroup.in";
  const cc = [
    "topmanagement@perfactgroup.in, glacier@perfactgroup.in",
    buildTeamCc(payload.team_name),
    payload.requestor_email || "",
  ]
    .filter(Boolean)
    .join(",");

  const subject = `Request for arrangements for Client visit for Project- ${truncate(payload.project_name || "", 42)} with PCode ${payload.pcode || ""}`;
  const htmlBody = buildADM01EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ADM01",
    cc: cc,
  });
}

function buildADM01EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Project Name", payload.project_name || ""),
    row("P Code", payload.pcode || ""),
  ].join("");

  const clientRows = [
    row(
      "Client Name",
      `${payload.client_first_name || ""} ${payload.client_last_name || ""}`.trim(),
    ),
    row(
      "Client Mobile Number",
      `${payload.client_mobile_code || ""} ${payload.client_mobile_number || ""}`.trim(),
    ),
    row("Date of Arrival", payload.date_of_arrival || ""),
    row("Date of Departure", payload.date_of_departure || ""),
    row("No. of Persons Visiting", payload.no_of_persons_visiting || ""),
    row("Purpose of Visit", payload.purpose_of_visit || ""),
    row("Conference Room Required", payload.conference_room_required || ""),
    row("Conference Room Dates", payload.conference_room_dates || ""),
  ].join("");

  const requirementsRows = row("Requirements", payload.requirements || "");

  let hotelSection = "";
  if (payload.hotel_booking) {
    const h = payload.hotel_booking;
    hotelSection = section(
      "Hotel Booking",
      [
        row("Guest Name", h.guest_name || ""),
        row("Check-in Date", h.check_in_date || ""),
        row("Check-out Date", h.check_out_date || ""),
        row("Payment Due By", h.payment_due_by || ""),
      ].join(""),
    );
  }

  let foodSection = "";
  if (payload.food_arrangements) {
    const f = payload.food_arrangements;
    foodSection = section(
      "Food Arrangements",
      [
        row("Meal Type", f.meal_type || ""),
        row("Date for Food Arrangements", f.date || ""),
        row("Number of Clients Needing Food", f.no_of_clients || ""),
      ].join(""),
    );
  }

  let vehicleSection = "";
  if (payload.vehicle) {
    const v = payload.vehicle;
    vehicleSection = section(
      "Vehicle",
      [
        row("Date of Pickup", v.pickup_date || ""),
        row("Vehicle Requirement End Date", v.end_date || ""),
        row("Number of Visitors", v.no_of_visitors || ""),
        row("Pickup Time", v.pickup_time || ""),
        row("Pickup Point", v.pickup_point || ""),
        row("Place to Visit", v.place_to_visit || ""),
        row("Other Details", v.other_details || ""),
      ].join(""),
    );
  }

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${esc(payload.requestor_first_name || "")} ${esc(payload.requestor_last_name || "")},</p>
      <p>Your Request for arrangements for Client visit for Project- ${payload.project_name || ""} with PCode ${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Client Details", clientRows)}
      ${section("Requirements", requirementsRows)}
      ${hotelSection}
      ${foodSection}
      ${vehicleSection}

      ${section("Remarks", row("Remarks", payload.remarks || ""))}

      <p style="margin-top:18px;">Regards,<br/>ADM01</p>
    </div>
  `;
}

function sendACC03Email(payload, submissionId) {
  const route = resolveACC03Route(payload);

  const cc = [route.cc, buildTeamCc(payload.team_name), payload.requestor_email]
    .filter(Boolean)
    .join(",");

  const urgency = String(payload.urgency || "").trim();
  const urgencyTag = urgency === "Urgent" ? "[URGENT] " : "";
  const approvalTag = route.tag ? `[${route.tag}] ` : "";
  const subject =
    urgencyTag +
    approvalTag +
    `Purchase Request: ${truncate(payload.item_name || "Item", 42)} - ₹${payload.estimated_amount || "0"}`;

  const htmlBody = buildACC03EmailHtml(payload, submissionId, route);

  GmailApp.sendEmail(route.to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ACC03",
    cc: cc,
  });
}

function resolveACC03Route(payload) {
  const accounts = "accounts@perfactgroup.in";
  const budgetWG = "budget.wg@perfactgroup.in";
  const govCouncil = "gov.council@perfactgroup.in";

  const amount = parseFloat(payload.estimated_amount);
  const numericOk = !isNaN(amount) && amount >= 0;

  if (numericOk && amount <= 2000) {
    return {
      to: accounts,
      cc: "",
      tier: "Accounts only",
      tag: "",
      approver: "Accounts Team",
      addressee: "Accounts Team",
    };
  }

  if (numericOk && amount <= 30000) {
    return {
      to: budgetWG,
      cc: accounts,
      tier: "Budget Working Group approval required",
      tag: "Budget WG Approval",
      approver: "Budget Working Group",
      addressee: "Budget Working Group",
    };
  }

  // > 30,000 OR amount missing/invalid → Governance Council
  return {
    to: govCouncil,
    cc: [budgetWG, accounts].join(","),
    tier: "Governance Council approval required",
    tag: "Gov Council Approval",
    approver: "Governance Council",
    addressee: "Governance Council",
  };
}

function buildACC03EmailHtml(payload, submissionId, route) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ddd;padding:8px;background:#f5f7fa;font-weight:600;width:35%;">
          ${esc(label)}
        </td>
        <td style="border:1px solid #ddd;padding:8px;">
          ${esc(String(value || ""))}
        </td>
      </tr>
    `;
  }

  function section(title, body) {
    return `
      <div style="margin-top:20px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#2c3e50;">
          ${esc(title)}
        </div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
    `;
  }

  const isProject = String(payload.expense_type || "") === "Project expense";

  // Format amount in Indian numbering (lakh / crore style with commas)
  function formatINR(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return value || "";
    return (
      "₹ " +
      num.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  const requesterRows = [
    row("Submission ID", submissionId),
    row("Date of Request", payload.date || ""),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Employee Code", payload.employee_code || ""),
    row("Requester Email", payload.requestor_email || ""),
    row("Team", payload.team_name || ""),
    row("Concerned PG Company", payload.pg_company || ""),
  ].join("");

  const expenseRows = [
    row("Expense Type", payload.expense_type || ""),
    isProject ? row("Project Name", payload.project_name || "") : "",
    isProject ? row("PCODE", payload.pcode || "") : "",
  ].join("");

  const itemRows = [
    row("Item(s) Requested", payload.item_name || ""),
    row("Category", payload.category || ""),
    row("Total Estimated Amount", formatINR(payload.estimated_amount)),
    row("Approval Route", route.tier || ""),
    row("Required By", payload.required_by_date || "Not specified"),
    row("Urgency", payload.urgency || ""),
  ].join("");

  const deliveryOther =
    payload.delivery_location === "Other" ||
    payload.delivery_location === "Project site"
      ? payload.delivery_location_other || ""
      : "";

  const logisticsRowsSafe = [
    row("Preferred Vendor", payload.preferred_vendor || "Accounts to source"),
    row(
      "Delivery Location",
      deliveryOther
        ? `${payload.delivery_location} — ${deliveryOther}`
        : payload.delivery_location || "",
    ),
    row("GST / TDS Applicable", payload.gst_tds_applicable || "Not specified"),
    row("Mode of Payment", payload.mode_of_payment || "Not specified"),
    payload.quote_or_document_link
      ? `<tr>
          <td style="border:1px solid #ddd;padding:8px;background:#f5f7fa;font-weight:600;width:35%;">Quote / Document Link</td>
          <td style="border:1px solid #ddd;padding:8px;"><a href="${esc(payload.quote_or_document_link)}">${esc(payload.quote_or_document_link)}</a></td>
        </tr>`
      : row("Quote / Document Link", "Not attached"),
  ].join("");

  const reasonRow = row(
    "Reason for Purchase",
    payload.reason_for_purchase || "",
  );
  const remarksSection = payload.remarks
    ? section("Remarks", row("Remarks", payload.remarks))
    : "";

  // Approval call-to-action banner — only when approval actually needed
  const approvalBanner =
    route.approver !== "Accounts Team"
      ? `<div style="margin-top:14px;padding:12px;border-left:4px solid #c0392b;background:#fdecea;font-size:13px;">
         <b>Approval required:</b> This request needs ${esc(route.approver)} sign-off
         before Accounts can proceed. Please reply with approval / rejection.
       </div>`
      : "";

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${esc(route.addressee)},</p>
      <p>A new <b>Purchase Request</b> has been submitted${
        String(payload.urgency || "") === "Urgent"
          ? ' <span style="color:#c0392b;font-weight:700;">[URGENT]</span>'
          : ""
      }.</p>

      ${approvalBanner}

      ${section("Requester Details", requesterRows)}
      ${section("Expense Classification", expenseRows)}
      ${section("Item & Cost", itemRows)}
      ${section("Justification", reasonRow)}
      ${section("Vendor, Delivery & Payment", logisticsRowsSafe)}
      ${remarksSection}

      <p style="margin-top:18px;">
        Regards,<br/>
        <b>ACC03 — Purchase Request</b>
      </p>
    </div>
  `;
}

function sendACC02Email(payload, submissionId) {
  const to = "accounts@perfactgroup.in, budget.wg@perfactgroup.in";

  const cc = [buildTeamCc(payload.team_name), payload.requestor_email || ""]
    .filter(Boolean)
    .join(",");

  const subject = `Vendor: ${truncate(payload.vendor_name || "", 42)} — Bill ${payload.bill_number || ""} dated ${payload.bill_date || ""}`;

  const htmlBody = buildACC02EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "ACC02",
    cc: cc,
  });
}

function buildACC02EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  // Indian-format currency helper (₹ + lakh/crore grouping)
  function inr(value) {
    const n = parseFloat(value);
    if (isNaN(n)) return "";
    return (
      "₹ " +
      n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

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

  const gstRegistered = String(payload.gst_registered || "");

  const summaryRows = [
    row("Submission ID", submissionId),
    row(
      "Requestor Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requestor Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
  ].join("");

  const vendorRows = [
    row("Vendor Name", payload.vendor_name || ""),
    row("Address", fullAddress),
    row("GST Registered", gstRegistered),
    row(
      "GST Number",
      gstRegistered === "Yes" ? payload.gst_number || "" : "N/A",
    ),
  ].join("");

  const txnRows = [
    row("Branch", payload.branch || ""),
    row("Reference (Email / PO)", payload.reference || ""),
    row("Bill Number", payload.bill_number || ""),
    row("Bill Date", payload.bill_date || ""),
    row("Mode of Payment", payload.mode_of_payment || ""),
    row("Target Date of Payment / Terms", payload.target_date || ""),
    row("Invoice Copy", payload.invoice_url || ""),
  ].join("");

  // ---- Item Table ----
  const items = Array.isArray(payload.items) ? payload.items : [];

  const itemRowsHtml = items
    .map(function (r, i) {
      const gst = String(r.gst_percent || "");
      return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(r.item_description || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">${esc(r.rate || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">${esc(r.quantity || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">${esc(r.amount || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">${esc(gst)}${gst === "" ? "" : "%"}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">${esc(r.total_amount || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">${esc(r.discount || "")}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;font-weight:600;">${esc(r.net_amount || "")}</td>
      </tr>
    `;
    })
    .join("");

  const itemTable = `
    <table style="border-collapse:collapse;width:100%;font-size:12px;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">#</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:left;">Description / Items</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">Rate (₹)</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">Qty</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">Amount (₹)</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">GST</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">Total (₹)</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">Disc. (₹)</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;text-align:right;">Net (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml || `<tr><td colspan="9" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`}
      </tbody>
    </table>
  `;

  // Grand totals — recomputed server-side via the same helper
  const totals = computeACC02Totals(items);
  const totalsRows = [
    row("Grand Amount (pre-GST)", inr(totals.grand_amount)),
    row("Grand Total (incl. GST)", inr(totals.grand_total)),
    row("Total Discount", inr(totals.grand_discount)),
    row("Grand Net Amount Payable", inr(totals.grand_net)),
  ].join("");

  // Advance Payment section — show only if anything is filled
  let advanceSection = "";
  const hasAdvance =
    String(payload.advance_amount || "").trim() ||
    String(payload.advance_date || "").trim() ||
    String(payload.advance_paid_via || "").trim();

  if (hasAdvance) {
    advanceSection = section(
      "Advance Payment",
      [
        row(
          "Amount Paid in Advance",
          payload.advance_amount ? inr(payload.advance_amount) : "",
        ),
        row("Date of Advance Payment", payload.advance_date || ""),
        row("Paid via", payload.advance_paid_via || ""),
      ].join(""),
    );
  }

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Accounts Team,</p>
      <p>
        A new vendor bill has been submitted by
        ${esc((payload.requestor_first_name || "") + " " + (payload.requestor_last_name || ""))}
        for Vendor: <strong>${esc(payload.vendor_name || "")}</strong>
        (Bill ${esc(payload.bill_number || "")} dated ${esc(payload.bill_date || "")}).
      </p>

      ${section("Submission Summary", summaryRows)}
      ${section("Vendor Details", vendorRows)}
      ${section("Transaction Details", txnRows)}

      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">Item Table</div>
        ${itemTable}
      </div>

      ${section("Totals", totalsRows)}
      ${advanceSection}
      ${section("Remarks", row("Remarks", payload.remarks || ""))}

      <p style="margin-top:18px;">
        This is a draft submission — requires verification and approval by
        the Accounts Team before processing of payment.
      </p>

      <p style="margin-top:18px;">Regards,<br/>ACC02</p>
    </div>
  `;
}

function sendTF09Email(payload, submissionId) {
  const to = `${payload.employee_email}`;

  const cc = `${buildTeamCc(payload.from_team_name)}, ${buildTeamCc(payload.recipient_team_name)}, topmanagement@perfactgroup.in`;

  const subject = `Documents shared from ${payload.from_team_name || ""} to ${payload.recipient_team_name || ""} for Project- ${truncate(payload.project_name || "", 42)} with PCODE- ${payload.project_code || ""}`;

  const htmlBody = buildTF09EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "TF09",
    cc: cc,
  });
}

function buildTF09EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  // Combines a checkbox group's value with its "Others" specification
  function withOther(values, otherText) {
    const list = String(values || "").trim();
    const extra = String(otherText || "").trim();
    if (list && extra) return list + " (" + extra + ")";
    if (extra) return extra;
    return list;
  }

  const basicRows = [
    row("Submission ID", submissionId),
    row("Date", payload.date || ""),
    row(
      "Name",
      `${payload.employee_first_name || ""} ${payload.employee_last_name || ""}`.trim(),
    ),
    row("Employee Email ID", payload.employee_email || ""),
    row("From Team Name", payload.from_team_name || ""),
    row("Recipient Team Name", payload.recipient_team_name || ""),
    row("Project Name", payload.project_name || ""),
    row("Project Code", payload.project_code || ""),
    row("Baseline season", payload.baseline_season || ""),
  ].join("");

  const labRows = [
    row(
      "Type of Document Received from Lab",
      withOther(payload.lab_document_types, payload.lab_document_types_other),
    ),
    row(
      "Link to Documents Received from Lab",
      payload.lab_documents_link || "",
    ),
  ].join("");

  const faeRows = [
    row(
      "Type of document as FAE Report or Expert Report",
      withOther(
        payload.fae_expert_document_types,
        payload.fae_expert_document_types_other,
      ),
    ),
    row("Link to FAE & Expert Reports", payload.fae_expert_reports_link || ""),
  ].join("");

  const nocRows = [
    row(
      "Type of document from NOC Team",
      withOther(payload.noc_document_types, payload.noc_document_types_other),
    ),
    row(
      "Link to Document from Reservoir Team",
      payload.reservoir_document_link || "",
    ),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear ${esc(payload.employee_first_name || "")} ${esc(payload.employee_last_name || "")},</p>
      <p>
        Documents sharing record from <b>${esc(payload.from_team_name || "")}</b>
        to <b>${esc(payload.recipient_team_name || "")}</b> dated
        ${esc(payload.date || "")} has been submitted successfully.
      </p>

      ${section("Basic Details", basicRows)}
      ${section("Documents Received from Lab", labRows)}
      ${section("FAE / Expert Reports", faeRows)}
      ${section("NOC Team Documents", nocRows)}

      <p style="margin-top:18px;">Regards,<br/>TF09</p>
    </div>
  `;
}

function sendFQ14Email(payload, submissionId) {
  const to = "spring.additionalstudies@perfactgroup.in";
  const cc = [
    buildTeamCc(payload.team_name),
    "spring@perfactgroup.in",
    "glacier@perfactgroup.in",
    "kushalbhargava@perfactgroup.in",
    payload.requestor_email,
  ]
    .filter(Boolean)
    .join(",");

  const subject = `WFP information sheet for Project- ${truncate(payload.project_name || "", 42)} with PCODE-${payload.pcode || ""}`;
  const htmlBody = buildFQ14EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody,
    name: "FQ14",
    cc,
  });
}

function buildFQ14EmailHtml(payload, submissionId) {
  const esc = escapeHtml;

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row(
      "Requester Name",
      `${payload.requestor_first_name || ""} ${payload.requestor_last_name || ""}`.trim(),
    ),
    row("Requester Email", payload.requestor_email || ""),
    row("Team Name", payload.team_name || ""),
    row("Company Name", payload.company_name || ""),
    row("Project Name", payload.project_name || ""),
    row("PCODE", payload.pcode || ""),
    row("Category", payload.category || ""),
    row("Sector", payload.sector || ""),
    row("EAC Name", payload.eac_name || ""),
  ].join("");

  const detailRows = [
    row("WFP sheet link", payload.wfp_sheet_link || ""),
    row("Expected Target Date", payload.expected_target_date || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>WFP information sheet for Project- ${payload.project_name || ""} with PCODE-${payload.pcode || ""} has been submitted successfully.</p>

      ${section("Submission Summary", summaryRows)}
      ${section("Additional Details", detailRows)}

      <p style="margin-top:18px;">Regards,<br/>FQ14</p>
    </div>
  `;
}

function sendMPF02Email(payload, submissionId) {
  const to = payload.rm_email || "";
  const cc = [
    payload.email,
    "hr@perfactgroup.in",
    "accounts@perfactgroup.in",
    "accreditation.wg@perfactgroup.in",
    "topmanagement@perfactgroup.in",
  ]
    .filter(Boolean)
    .join(",");

  const expertName =
    `${payload.name_first || ""} ${payload.name_last || ""}`.trim();
  const subject = `Monthly Performance of Empanelled Expert ${payload.name_first || ""} ${payload.name_last || ""} for the month of ${payload.month || ""}`;
  const htmlBody = buildMPF02EmailHtml(payload, submissionId);

  GmailApp.sendEmail(to, subject, "HTML email required", {
    htmlBody: htmlBody,
    name: "MPF02",
    cc: cc,
  });
}

function buildMPF02EmailHtml(payload, submissionId) {
  const esc = (v) =>
    HtmlService.createHtmlOutput(String(v == null ? "" : v)).getContent();

  function row(label, value) {
    return `
      <tr>
        <td style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:600;width:34%;">${esc(label)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>
      </tr>
    `;
  }

  function section(title, rowsHtml) {
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  function th(label) {
    return `<th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;">${esc(label)}</th>`;
  }

  function td(value) {
    return `<td style="border:1px solid #ccc;padding:6px;">${esc(String(value || ""))}</td>`;
  }

  function subTable(title, headers, rows, cellsFn) {
    const body =
      rows && rows.length
        ? rows.map((r, i) => `<tr>${td(i + 1)}${cellsFn(r)}</tr>`).join("")
        : `<tr><td colspan="${headers.length + 1}" style="border:1px solid #ccc;padding:6px;">No entries</td></tr>`;
    return `
      <div style="margin-top:18px;">
        <div style="font-weight:700;margin-bottom:8px;">${esc(title)}</div>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead><tr>${th("#")}${headers.map(th).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  const summaryRows = [
    row("Submission ID", submissionId),
    row("Month", payload.month || ""),
    row(
      "Name",
      `${payload.name_first || ""} ${payload.name_last || ""}`.trim(),
    ),
    row("Employee Code", payload.employee_code || ""),
    row("Email ID", payload.email || ""),
    row("Area of Expertise", payload.area_of_expertise || ""),
    row(
      "Reporting Manager",
      `${payload.rm_name_first || ""} ${payload.rm_name_last || ""}`.trim(),
    ),
    row("Reporting Manager Email", payload.rm_email || ""),
    row("Visits Done", payload.visits_done || ""),
    row("Meetings Attended", payload.meetings_attended || ""),
    row("Reports Submitted", payload.reports_submitted || ""),
  ].join("");

  const narrativeRows = [
    row("Targets planned this month", payload.targets_planned || ""),
    row("Targets achieved this month", payload.targets_achieved || ""),
    row("Highlights", payload.highlights || ""),
    row("Low Points", payload.low_points || ""),
    row("Challenges faced", payload.challenges_faced || ""),
    row("Projected targets for next month", payload.projected_targets || ""),
  ].join("");

  const invoiceRows = [
    row("Retention bill", payload.retention_bill_link || ""),
    row("Travel reimbursement", payload.travel_reimbursement_link || ""),
    row("Remarks", payload.remarks || ""),
  ].join("");

  const visitsTable = subTable(
    "Visit details",
    ["Start date", "End date", "Project name", "PCODE", "Location"],
    payload.visits || [],
    (r) =>
      td(r.start_date) +
      td(r.end_date) +
      td(r.project_name) +
      td(r.pcode) +
      td(r.location),
  );

  const meetingsTable = subTable(
    "Meeting details",
    [
      "Date",
      "Project name",
      "PCODE",
      "Type of meeting",
      "Guests / participants",
      "Agenda",
    ],
    payload.meetings || [],
    (r) =>
      td(r.date) +
      td(r.project_name) +
      td(r.pcode) +
      td(r.type_of_meeting) +
      td(r.guests_participants) +
      td(r.agenda),
  );

  const reportsTable = subTable(
    "Report details",
    ["Date", "Project name", "PCODE", "Remarks of client", "Feedback of EAC"],
    payload.reports || [],
    (r) =>
      td(r.date) +
      td(r.project_name) +
      td(r.pcode) +
      td(r.remarks_of_client) +
      td(r.feedback_of_eac),
  );

  const billsTable = subTable(
    "Project-wise bills",
    ["Project name", "PCODE", "Link to bill"],
    payload.bills || [],
    (r) => td(r.project_name) + td(r.pcode) + td(r.link_to_bill),
  );

  return `
    <div style="font-family:Arial,sans-serif;color:#222;line-height:1.4;">
      <p>Dear Team,</p>
      <p>A Monthly Performance Form (MPF02) has been submitted for
      ${payload.month || ""} by
      ${payload.name_first || ""} ${payload.name_last || ""}
      (${payload.employee_code || ""}).</p>

      ${section("Submission Summary", summaryRows)}
      ${visitsTable}
      ${meetingsTable}
      ${reportsTable}
      ${section("Monthly Summary", narrativeRows)}
      ${billsTable}
      ${section("Monthly Invoices", invoiceRows)}

      <p style="margin-top:18px;">Regards,<br/>MPF02</p>
    </div>
  `;
}
