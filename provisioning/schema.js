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

module.exports = { lists };
