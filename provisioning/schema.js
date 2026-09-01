// Declarative list definitions, read by provision.js.
// Adding a list means adding an entry here, nothing more.
//
// Types: text, note (multi-line), number, money, dateTime, boolean, choice
// Money is stored as INTEGER PAISE. See BackendSchema.md section 1.
// Audit tail columns are appended automatically to every register.

const AUDIT = [
  { name: "CreatedByEmail", type: "text" },
  { name: "CreatedAtIso", type: "text" },
  { name: "ModifiedByEmail", type: "text" },
  { name: "ModifiedAtIso", type: "text" },
];

const { stage5 } = require("./schema-stage5");

const lists = [
  {
    name: "UsersRoles",
    description: "Who may use the application, and in what capacity.",
    audit: false,
    columns: [
      { name: "Email", type: "text", indexed: true },
      { name: "FullName", type: "text" },
      {
        name: "Role",
        type: "choice",
        choices: [
          "BD",
          "LU",
          "TechLead",
          "CSO",
          "COO",
          "Accounts",
          "Delivery",
          "TeamHead",
          "CSuiteOfficer",
          "EIACoordinator",
          "Admin",
          "MIS",
        ],
      },
      { name: "Team", type: "text" },
      { name: "Active", type: "boolean" },
    ],
  },
  {
    name: "Settings",
    description: "Management-tunable values read by the gates.",
    audit: false,
    columns: [
      { name: "SettingKey", type: "text", indexed: true },
      { name: "SettingValue", type: "text" },
      { name: "Description", type: "note" },
    ],
  },
  {
    name: "Sequences",
    description: "Named counters. One row per sequence. Never delete a row.",
    audit: false,
    columns: [
      { name: "SequenceKey", type: "text", indexed: true },
      { name: "NextValue", type: "number" },
      { name: "Notes", type: "note" },
    ],
  },
  {
    name: "ProposalRegister",
    description:
      "Commercials per project. All money is INTEGER PAISE, never decimals.",
    columns: [
      { name: "ProposalRecID", type: "text", indexed: true },
      { name: "PCode", type: "text", indexed: true },
      { name: "Version", type: "number" },

      // Revenue side, from the blueprint decomposition.
      { name: "GrossFee", type: "money" },
      { name: "PRLab", type: "money" },
      { name: "PSCompliance", type: "money" },
      { name: "Liaison", type: "money" },
      { name: "SubContractor", type: "money" },
      { name: "NetPerfactRevenue", type: "money" },

      // Cost stack, the ten fields carried by the live BD02 form.
      { name: "OverheadCosts", type: "money" },
      { name: "TestingCharges", type: "money" },
      { name: "AdminExpenses", type: "money" },
      { name: "ManpowerCosts", type: "money" },
      { name: "OutsourcingCosts", type: "money" },
      { name: "Commissions", type: "money" },
      { name: "OutsourcedManpower", type: "money" },
      { name: "SecondaryDataCosts", type: "money" },
      { name: "ContingencyCosts", type: "money" },
      { name: "SiteVisitCosts", type: "money" },

      // The quote ladder. PBL is summed, never typed.
      { name: "PBLBaseCost", type: "money" },
      { name: "PBL2Minimum", type: "money" },
      { name: "PBL3First", type: "money" },
      { name: "PBL10Final", type: "money" },

      // Derived. Written only by the server.
      { name: "MarginPaise", type: "money" },
      { name: "MarginPct", type: "number" },
      { name: "DurationMonths", type: "number" },
      { name: "VelocityPerMonth", type: "money" },
      { name: "GateMarginResult", type: "text" },
      { name: "GateVelocityResult", type: "text" },
      { name: "NeedsEscalation", type: "boolean" },
      { name: "EscalationRef", type: "text" },
      { name: "EscalationReason", type: "note" },

      // Approval and despatch.
      {
        name: "CSODecision",
        type: "choice",
        choices: ["NotSubmitted", "Pending", "Approved", "Rejected"],
      },
      { name: "CSORemarks", type: "note" },
      { name: "CSODecidedAtIso", type: "text" },
      { name: "SentToClientAtIso", type: "text" },

      // Documents and commercial mode, carried from the live form.
      { name: "WorkOrderLink", type: "text" },
      { name: "SalesOrderLink", type: "text" },
      { name: "CostComputerLink", type: "text" },
      { name: "FinalProposalLink", type: "text" },
      { name: "GSTTreatment", type: "text" },
      { name: "PRMode", type: "text" },
      { name: "Remarks", type: "note" },
      {
        name: "Status",
        type: "choice",
        indexed: true,
        choices: ["Draft", "AwaitingCSO", "Approved", "Sent", "Superseded"],
      },
    ],
  },
  {
    name: "GroupMaster",
    description: "One canonical record per corporate group.",
    columns: [
      { name: "GroupID", type: "text", indexed: true },
      { name: "CanonicalName", type: "text", indexed: true },
      { name: "AliasNames", type: "note" },
      { name: "Sector", type: "text" },
      { name: "Tier", type: "text" },
      { name: "Notes", type: "note" },
      { name: "Status", type: "choice", choices: ["Active", "Retired"] },
    ],
  },
  {
    name: "CustomerRegister",
    description: "One row per client legal entity, belonging to a group.",
    columns: [
      { name: "CustomerID", type: "text", indexed: true },
      { name: "GroupID", type: "text", indexed: true },
      { name: "LegalName", type: "text", indexed: true },
      { name: "PGEntity", type: "text" },
      { name: "GSTStateCode", type: "text" },
      { name: "Address", type: "note" },
      { name: "Status", type: "choice", choices: ["Active", "Retired"] },
    ],
  },
  {
    name: "ContactRegister",
    description:
      "People at client companies. Name, phone and email are separate and searchable.",
    columns: [
      { name: "ContactID", type: "text", indexed: true },
      { name: "CustomerID", type: "text", indexed: true },
      { name: "ContactName", type: "text", indexed: true },
      { name: "Designation", type: "text" },
      { name: "Email", type: "text", indexed: true },
      { name: "Phone", type: "text" },
      { name: "IsPrimary", type: "boolean" },
      { name: "StartDate", type: "dateTime" },
      { name: "EndDate", type: "dateTime" },
      { name: "Notes", type: "note" },
    ],
  },
  {
    name: "ProjectRegister",
    description:
      "The project spine. One row per P-Code; identity fields lock after creation.",
    columns: [
      { name: "PCode", type: "text", indexed: true },
      { name: "ClientRef", type: "text", indexed: true },
      { name: "ProposalID", type: "text", indexed: true },
      { name: "ProjectName", type: "text", indexed: true },
      { name: "Nickname", type: "text" },
      { name: "GroupID", type: "text", indexed: true },
      { name: "CustomerID", type: "text", indexed: true },
      { name: "PrimaryContactID", type: "text" },
      { name: "PGEntity", type: "text" },
      { name: "LeadDate", type: "dateTime" },
      { name: "LeadSource", type: "text" },
      { name: "LeadSourceName", type: "text" },
      { name: "LeadSourceEmail", type: "text" },
      { name: "StateCode", type: "text" },
      { name: "Sector", type: "text" },
      { name: "Scope", type: "text" },
      { name: "Specification", type: "text" },
      { name: "TypeOfWork", type: "text" },
      { name: "Service", type: "text" },
      { name: "ActivityProposed", type: "note" },
      { name: "CustomerClass", type: "text" },
      { name: "OwnerEmail", type: "text", indexed: true },
      { name: "Stage", type: "text", indexed: true },
      { name: "StageEnteredAtIso", type: "text" },
      {
        name: "Status",
        type: "choice",
        indexed: true,
        choices: ["Active", "OnHold", "Lost", "Closed"],
      },
      { name: "LostReason", type: "note" },
      { name: "LostDate", type: "dateTime" },
      { name: "FilesFolderUrl", type: "text" },
      { name: "AddressLine1", type: "text" },
      { name: "Village", type: "text" },
      { name: "Taluka", type: "text" },
      { name: "District", type: "text" },
      { name: "StateName", type: "text" },
      { name: "PostalCode", type: "text" },
      { name: "Country", type: "text" },
    ],
  },
];

// Append the audit tail unless a list opts out.
for (const list of lists) {
  if (list.audit !== false) list.columns = list.columns.concat(AUDIT);
}

module.exports = { lists: lists.concat(stage5) };
