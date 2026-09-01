// Stage 5 lists: acceptance, billing, handover and its two child tables.
// Merged into the main schema by schema.js.

const AUDIT = [
  { name: "CreatedByEmail", type: "text" },
  { name: "CreatedAtIso", type: "text" },
  { name: "ModifiedByEmail", type: "text" },
  { name: "ModifiedAtIso", type: "text" },
];

const stage5 = [
  {
    name: "AcceptanceRegister",
    description: "How and when the client accepted. One row per project.",
    columns: [
      { name: "PCode", type: "text", indexed: true },
      {
        name: "Mode",
        type: "choice",
        choices: ["WorkOrder", "Email", "Verbal"],
      },
      { name: "ReferenceNo", type: "text" },
      { name: "WONumber", type: "text", indexed: true },
      { name: "SONumber", type: "text", indexed: true },
      { name: "AcceptanceDateIso", type: "text" },
      { name: "WorkOrderValue", type: "money" },
      { name: "WorkOrderValidity", type: "text" },
      { name: "WorkOrderLink", type: "text" },
      { name: "SalesOrderLink", type: "text" },
      // Tax identity, carried from the live BD02 form.
      { name: "GSTAvailable", type: "boolean" },
      { name: "GSTNumber", type: "text" },
      { name: "PANAvailable", type: "boolean" },
      { name: "PANNumber", type: "text" },
      { name: "TANAvailable", type: "boolean" },
      { name: "TANNumber", type: "text" },
      { name: "GSTTreatment", type: "text" },
      { name: "PaymentTerms", type: "note" },
      { name: "Remarks", type: "note" },
    ],
  },
  {
    name: "ExpenseLedger",
    description:
      "Invoice rows per project. Replaces the legacy counters, which recorded how many invoices existed but never which.",
    columns: [
      { name: "EntryID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      {
        name: "Source",
        type: "choice",
        indexed: true,
        choices: ["BD02-open", "TF07", "TF22", "Manual"],
      },
      { name: "EntryType", type: "text" },
      { name: "InvoiceNo", type: "text", indexed: true },
      { name: "InvoiceDateIso", type: "text" },
      { name: "Amount", type: "money" },
      { name: "MilestoneRef", type: "text" },
      { name: "SentAtIso", type: "text" },
      { name: "PaidAtIso", type: "text" },
      { name: "Notes", type: "note" },
    ],
  },
  {
    name: "HandoverRegister",
    description: "Technical handover to delivery. One row per project.",
    columns: [
      { name: "HandoverID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      {
        name: "DeliveryPool",
        type: "choice",
        indexed: true,
        choices: [
          "Fountain",
          "Ocean",
          "Pond",
          "Pool",
          "Reservoir",
          "Spring",
          "Tributary",
        ],
      },
      { name: "TeamHeadName", type: "text" },
      { name: "TeamHeadEmail", type: "text", indexed: true },
      { name: "CSuiteOfficerName", type: "text" },
      { name: "CSuiteOfficerEmail", type: "text" },
      { name: "EIACoordinatorName", type: "text" },
      { name: "EIACoordinatorEmail", type: "text" },
      { name: "ScopeOfWork", type: "note" },
      { name: "Category", type: "text" },
      { name: "CategoryOtherSpecify", type: "text" },
      { name: "NABETSector", type: "text" },
      { name: "BaselineSeason", type: "text" },
      { name: "BaselineSeasonOtherSpecify", type: "text" },
      { name: "EACName", type: "text" },
      { name: "EACNameOtherSpecify", type: "text" },
      { name: "PreviousECAndConsents", type: "note" },
      { name: "GeneralConditionsApplicability", type: "note" },
      { name: "ProjectStartDate", type: "dateTime" },
      { name: "GanttChartLink", type: "text" },
      { name: "TimelineBaselineUrl", type: "text" },
      { name: "TagSet", type: "text" },
      { name: "RelevantDocumentsUrl", type: "text" },
      { name: "TermsAndConditions", type: "note" },
      { name: "TravellingBorneBy", type: "text" },
      { name: "TravellingBorneByOtherSpecify", type: "text" },
      { name: "OverheadExpensesBorneBy", type: "text" },
      { name: "CurrentStatus", type: "text" },
      { name: "DateOfUpdatingIso", type: "text" },
      { name: "HandoverAtIso", type: "text" },
      { name: "Remarks", type: "note" },
    ],
  },
  {
    name: "HandoverPersons",
    description:
      "Other people attached to a handover. Child of HandoverRegister.",
    columns: [
      { name: "PCode", type: "text", indexed: true },
      { name: "HandoverID", type: "text", indexed: true },
      { name: "PersonName", type: "text" },
      { name: "PersonEmail", type: "text" },
      { name: "Purpose", type: "text" },
    ],
  },
  {
    name: "BillingMilestones",
    description: "Billing schedule per project. Child of the handover.",
    columns: [
      { name: "TermID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      { name: "MilestoneName", type: "text" },
      { name: "MilestoneDetails", type: "note" },
      { name: "Sequence", type: "number" },
      { name: "Percent", type: "number" },
      { name: "Timeline", type: "text" },
      { name: "PlannedDateIso", type: "text" },
      { name: "AchievedDateIso", type: "text" },
      { name: "InvoiceNo", type: "text" },
      { name: "InvoiceDateIso", type: "text" },
      { name: "InvoiceAmount", type: "money" },
      { name: "PaymentDueIso", type: "text" },
      { name: "PaymentReceivedIso", type: "text" },
      {
        name: "Status",
        type: "choice",
        choices: ["Planned", "Achieved", "Invoiced", "Paid"],
      },
      { name: "Notes", type: "note" },
    ],
  },
];

for (const list of stage5) {
  if (list.audit !== false) list.columns = list.columns.concat(AUDIT);
}

module.exports = { stage5 };
