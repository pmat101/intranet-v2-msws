// Terminal outcomes: Lost, and the win and loss record.
//
// The note identifies this as a gap: 1,557 leads produced 526 proposals and
// nothing says why the other thousand went nowhere. A reason is mandatory,
// because a lost project with no reason answers nothing.

const AUDIT = [
  { name: "CreatedByEmail", type: "text" },
  { name: "CreatedAtIso", type: "text" },
  { name: "ModifiedByEmail", type: "text" },
  { name: "ModifiedAtIso", type: "text" },
];

const terminal = [
  {
    name: "WinLossRegister",
    description: "How each project ended, and why. The analytics feed.",
    columns: [
      { name: "PCode", type: "text", indexed: true },
      {
        name: "Outcome",
        type: "choice",
        indexed: true,
        choices: ["Won", "Lost"],
      },
      { name: "StageAtOutcome", type: "text", indexed: true },
      {
        name: "ReasonCategory",
        type: "choice",
        indexed: true,
        choices: [
          "PriceTooHigh",
          "LostToCompetitor",
          "ClientDeferred",
          "ClientWithdrew",
          "TechnicalDecline",
          "ScopeMismatch",
          "NoResponse",
          "Other",
        ],
      },
      { name: "Reason", type: "note" },
      { name: "CompetitorName", type: "text" },
      // What we had quoted when it was lost, so the analysis can ask whether
      // we lose at a particular price point rather than only how often.
      { name: "QuotedValue", type: "money" },
      { name: "MarginPct", type: "number" },
      { name: "CostIncurred", type: "money" },
      { name: "DecidedAtIso", type: "text" },
      { name: "RecordedByEmail", type: "text" },
    ],
  },
  {
    name: "ChangeLog",
    description:
      "What was edited, by whom, and what it was before. Append only, never edited.",
    audit: false,
    columns: [
      { name: "ChangeID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      { name: "ListName", type: "text", indexed: true },
      { name: "FieldName", type: "text" },
      { name: "OldValue", type: "note" },
      { name: "NewValue", type: "note" },
      { name: "ChangedByEmail", type: "text", indexed: true },
      { name: "ChangedAtIso", type: "text" },
      { name: "Reason", type: "note" },
    ],
  },
  {
    name: "ProjectDocuments",
    description:
      "Supporting documents held against a project. Labelled free text, since negotiation rounds are not modelled.",
    columns: [
      { name: "DocumentID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      {
        name: "DocumentType",
        type: "choice",
        indexed: true,
        choices: [
          "Proposal",
          "ClientConfirmation",
          "PurchaseOrder",
          "WorkOrder",
          "Correspondence",
          "Other",
        ],
      },
      // Free text rather than a version number, so "Round 2, after they asked
      // for the lab scope out" is sayable.
      { name: "Label", type: "text" },
      { name: "FileName", type: "text" },
      { name: "FileUrl", type: "text" },
      { name: "SizeBytes", type: "number" },
      { name: "UploadedByEmail", type: "text" },
      { name: "UploadedAtIso", type: "text" },
      { name: "Notes", type: "note" },
    ],
  },
];

for (const list of terminal) {
  if (list.audit !== false) list.columns = list.columns.concat(AUDIT);
}

module.exports = { terminal };
