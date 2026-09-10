// Technical approval to pursue.
//
// Kushal's design has this as an Outlook approval routed to the land use team
// and the technical lead. That is deferred, so for now the approval happens in
// conversation and this records that it happened, who gave it and on what
// terms. Deliberately a RECORD rather than a workflow: when the routing
// arrives it writes to this same list and nothing downstream changes.

const AUDIT = [
  { name: "CreatedByEmail", type: "text" },
  { name: "CreatedAtIso", type: "text" },
  { name: "ModifiedByEmail", type: "text" },
  { name: "ModifiedAtIso", type: "text" },
];

const approval = [
  {
    name: "QualificationApprovals",
    description:
      "Approval to pursue a lead. Recorded, not routed, until the workflow exists.",
    columns: [
      { name: "ApprovalID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      {
        name: "Decision",
        type: "choice",
        indexed: true,
        choices: ["Approved", "Declined", "OnHold"],
      },
      { name: "ApprovedByName", type: "text" },
      { name: "ApprovedByEmail", type: "text", indexed: true },
      {
        name: "ApprovalRole",
        type: "choice",
        choices: ["TechnicalLead", "LandUse", "CSO", "COO", "Other"],
      },
      {
        name: "ObtainedHow",
        type: "choice",
        choices: ["Verbal", "Email", "Meeting", "InSystem"],
      },
      { name: "DecisionDateIso", type: "text" },
      // Conditions matter: "yes, but only if we can get the baseline data in
      // this season" is a different answer from an unqualified yes, and it is
      // the sort of thing that gets forgotten by the time the quote is written.
      { name: "Conditions", type: "note" },
      { name: "TechnicalNotes", type: "note" },
      { name: "DeclineReason", type: "note" },
      { name: "RecordedByEmail", type: "text" },
      { name: "RecordedAtIso", type: "text" },
    ],
  },
];

for (const list of approval) {
  if (list.audit !== false) list.columns = list.columns.concat(AUDIT);
}

module.exports = { approval };
