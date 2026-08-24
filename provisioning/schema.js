// Declarative list definitions. The script reads these; it contains
// no knowledge of any particular list. Adding a list means adding
// an entry here, nothing more.
//
// Column types map to Graph column definitions:
//   text, number, dateTime, boolean, choice
// Money is stored as integer paise, so it is a number with no decimals.

const lists = [
  {
    name: "UsersRoles",
    description: "Who may use the application, and in what capacity.",
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
    name: "GroupMaster",
    description: "One canonical record per corporate group.",
    columns: [
      { name: "GroupID", type: "text", indexed: true },
      { name: "CanonicalName", type: "text", indexed: true },
      { name: "AliasNames", type: "text" },
      { name: "Sector", type: "text" },
      { name: "Notes", type: "text" },
      { name: "Status", type: "choice", choices: ["Active", "Retired"] },
    ],
  },
  {
    name: "Settings",
    description: "Management-tunable values read by the gates.",
    columns: [
      { name: "SettingKey", type: "text", indexed: true },
      { name: "SettingValue", type: "text" },
      { name: "Description", type: "text" },
    ],
  },
];

module.exports = { lists };
