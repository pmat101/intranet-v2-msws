/**
 * BD02 MIS dashboard — server side.
 *
 * getBD02MISData() is called by bd02mis.html via google.script.run.
 * It reads the live "BD02" tab plus the one-time "BD02_Legacy" tab from
 * intranet_db_prod, maps both to one clean shape (dropping columns the
 * dashboard does not need), tags each row with its source, and returns
 * a plain array the page can render.
 *
 * No write path is touched — this is read-only, so form submission is
 * unaffected. New submissions appear automatically because they land in
 * the live BD02 tab.
 */

function getBD02MISData() {
  var db = getDB(); // defined in Code.js — opens intranet_db_prod
  var out = [];

  // tab name  ->  label shown in the dashboard's "Source" column
  var sources = {
    BD02: "Intranet DB",
    BD02_Legacy: "Zoho (legacy)",
  };

  Object.keys(sources).forEach(function (tabName) {
    var sheet = db.getSheetByName(tabName);
    if (!sheet) return; // legacy tab is optional; skip quietly if absent
    if (sheet.getLastRow() < 2) return; // header only, no data

    var values = sheet.getDataRange().getValues();
    var headers = values[0];

    // build a lookup: column name -> its position, so we never rely on
    // hard-coded column numbers (safe if columns are added later)
    var idx = {};
    headers.forEach(function (h, i) {
      idx[String(h).trim()] = i;
    });

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      // skip blank rows with no identifying content
      if (
        !row[idx["proposal_id"]] &&
        !row[idx["customer_company"]] &&
        !row[idx["project_name"]]
      ) {
        continue;
      }
      out.push(buildBD02MISRecord_(row, idx, sources[tabName]));
    }
  });

  return out;
}

/** Convert a cell (Date or text) to a plain "yyyy-MM-dd" string. */
function bd02MISDate_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, "Asia/Kolkata", "yyyy-MM-dd");
  }
  return v ? String(v) : "";
}

/** Map one raw sheet row to the lean object the dashboard expects. */
function buildBD02MISRecord_(row, idx, source) {
  function g(key) {
    return idx[key] != null ? row[idx[key]] : "";
  }
  var fn = g("customer_first_name");
  var ln = g("customer_last_name");

  return {
    source: source,
    lead_date: bd02MISDate_(g("lead_date")),
    customer_company: g("customer_company") || "",
    customer_name: (String(fn || "") + " " + String(ln || "")).trim(),
    project_name: g("project_name") || "",
    project_location: g("project_location") || "",
    proposal_id: g("proposal_id") || "",
    pcode: g("pcode") || "",
    date_proposal_sent: bd02MISDate_(g("date_proposal_sent")),
    gst_treatment: g("gst_treatment") || "",
    date_proposal_won: bd02MISDate_(g("date_proposal_won")),
    work_order_link: g("work_order_link") || "",
    final_proposal_link: g("final_proposal_link") || "",
    sales_order_link: g("sales_order_link") || "",
    cost_computer_link: g("cost_computer_link") || "",
    travelling_expenses_in_scope: g("travelling_expenses_in_scope") || "",
    final_quote_value: Number(g("final_quote_value")) || 0,
    pr_mode: g("pr_mode") || "",
    remarks: g("remarks") || "",
  };
}
