// Closure and the after action review.
//
// Two lists rather than one. The closure record belongs to the project; the
// lessons belong to the firm. A lesson outlives the project that produced it
// and the Operations Council should be able to read the lessons without
// opening thirty closed projects, so they live separately and are keyed back
// by P-Code.

const AUDIT = [
  { name: "CreatedByEmail", type: "text" },
  { name: "CreatedAtIso", type: "text" },
  { name: "ModifiedByEmail", type: "text" },
  { name: "ModifiedAtIso", type: "text" },
];

const closure = [
  {
    name: "ClosureRegister",
    description: "One row per closed project. Triggered by TF08 in due course.",
    columns: [
      { name: "ClosureID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      { name: "TF08Reference", type: "text" },
      { name: "CompletionCertificateLink", type: "text" },
      { name: "FeedbackFormLink", type: "text" },
      { name: "FNFLink", type: "text" },
      { name: "FinalInvoiceNo", type: "text" },
      { name: "FNFAmount", type: "money" },
      { name: "FNFDateIso", type: "text" },

      // The four questions. Held as separate columns rather than one text
      // field, because a single box gets one paragraph answering whichever
      // question the person remembered.
      { name: "AARWhatWentWell", type: "note" },
      { name: "AARWhatDidNot", type: "note" },
      { name: "AARWhatWeLearned", type: "note" },
      { name: "AARWhatWeWouldChange", type: "note" },

      { name: "RemarksByBDTeam", type: "note" },
      { name: "RemarksByAccounts", type: "note" },
      { name: "ClosedByEmail", type: "text" },
      { name: "ClosedAtIso", type: "text" },
    ],
  },
  {
    name: "LearningRegister",
    description:
      "Lessons from closed projects, for the Operations Council. Read across projects, not within one.",
    columns: [
      { name: "LessonID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      { name: "Lesson", type: "note" },
      {
        name: "Category",
        type: "choice",
        indexed: true,
        choices: [
          "Pricing",
          "Scope",
          "Delivery",
          "Client",
          "Regulatory",
          "Resourcing",
          "Other",
        ],
      },
      { name: "OwnerCouncil", type: "text" },
      {
        name: "Status",
        type: "choice",
        indexed: true,
        choices: ["Open", "Acknowledged", "Actioned", "Closed"],
      },
      { name: "RaisedByEmail", type: "text" },
      { name: "RaisedAtIso", type: "text" },
    ],
  },
];

for (const list of closure) {
  if (list.audit !== false) list.columns = list.columns.concat(AUDIT);
}

module.exports = { closure };
