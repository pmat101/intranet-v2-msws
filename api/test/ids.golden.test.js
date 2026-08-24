// Golden tests: 50 real rows exported from the live BD01A sheet, 24 August 2026.
//
// These are not invented. Each case is an actual historical payload with the
// ProposalID and P-Code the legacy Apps Script actually produced. If any of
// these fail, the port in src/lib/ids.js has drifted and MUST be fixed before
// any new lead is minted, because every historical join depends on this format.
//
// Run: node api/test/ids.golden.test.js

const { buildIdentifiers } = require("../src/lib/ids");

const cases = [
  {
    serial: "4027",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "JH",
      workType: "EAM",
      sector: "1A",
      specs: "GEA",
    },
    pcode: "PE274027",
    proposalID: "PE27JH4027EAM1AGEA",
  },
  {
    serial: "4028",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274028",
    proposalID: "PS27DL4028ENC71NA0",
  },
  {
    serial: "4029",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274029",
    proposalID: "PS27DL4029ENC71NA0",
  },
  {
    serial: "4030",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274030",
    proposalID: "PS27DL4030ENC71NA0",
  },
  {
    serial: "4031",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "CH",
      workType: "EIA",
      sector: "1A",
      specs: "GPL",
    },
    pcode: "PE274031",
    proposalID: "PE27CH4031EIA1AGPL",
  },
  {
    serial: "4032",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "HR",
      workType: "EMP",
      sector: "8A",
      specs: "BB2",
    },
    pcode: "PE274032",
    proposalID: "PE27HR4032EMP8ABB2",
  },
  {
    serial: "4033",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "GJ",
      workType: "CCR",
      sector: "5B",
      specs: "BPL",
    },
    pcode: "PE274033",
    proposalID: "PE27GJ4033CCR5BBPL",
  },
  {
    serial: "4034",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "HR",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274034",
    proposalID: "PR27HR4034ENA71NA0",
  },
  {
    serial: "4035",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274035",
    proposalID: "PR27DL4035ENA71NA0",
  },
  {
    serial: "4036",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "HR",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274036",
    proposalID: "PR27HR4036ENA71NA0",
  },
  {
    serial: "4037",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "HR",
      workType: "ADR",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274037",
    proposalID: "PS27HR4037ADR71NA0",
  },
  {
    serial: "4038",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274038",
    proposalID: "PR27DL4038ENA71NA0",
  },
  {
    serial: "4039",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "RJ",
      workType: "MON",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274039",
    proposalID: "PR27RJ4039MON71NA0",
  },
  {
    serial: "4040",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "JH",
      workType: "ECR",
      sector: "3A",
      specs: "GA0",
    },
    pcode: "PE274040",
    proposalID: "PE27JH4040ECR3AGA0",
  },
  {
    serial: "4041",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "GJ",
      workType: "EPR",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274041",
    proposalID: "PS27GJ4041EPR71NA0",
  },
  {
    serial: "4042",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "ML",
      workType: "EIA",
      sector: "1A",
      specs: "GA0",
    },
    pcode: "PE274042",
    proposalID: "PE27ML4042EIA1AGA0",
  },
  {
    serial: "4043",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "HR",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274043",
    proposalID: "PR27HR4043ENA71NA0",
  },
  {
    serial: "4044",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "UP",
      workType: "ECE",
      sector: "8B",
      specs: "BB1",
    },
    pcode: "PE274044",
    proposalID: "PE27UP4044ECE8BBB1",
  },
  {
    serial: "4045",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "UP",
      workType: "ECE",
      sector: "8B",
      specs: "BB1",
    },
    pcode: "PE274045",
    proposalID: "PE27UP4045ECE8BBB1",
  },
  {
    serial: "4046",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "AP",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274046",
    proposalID: "PS27AP4046ENC71NA0",
  },
  {
    serial: "4047",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274047",
    proposalID: "PS27DL4047ENC71NA0",
  },
  {
    serial: "4048",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "EMP",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274048",
    proposalID: "PR27DL4048EMP71NA0",
  },
  {
    serial: "4049",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "JH",
      workType: "ECE",
      sector: "3A",
      specs: "GA0",
    },
    pcode: "PE274049",
    proposalID: "PE27JH4049ECE3AGA0",
  },
  {
    serial: "4050",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274050",
    proposalID: "PS27DL4050ENC71NA0",
  },
  {
    serial: "4051",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "CTE",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274051",
    proposalID: "PS27DL4051CTE71NA0",
  },
  {
    serial: "4052",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "DL",
      workType: "EMP",
      sector: "8A",
      specs: "BB2",
    },
    pcode: "PE274052",
    proposalID: "PE27DL4052EMP8ABB2",
  },
  {
    serial: "4053",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "HR",
      workType: "WLC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PE274053",
    proposalID: "PE27HR4053WLC71NA0",
  },
  {
    serial: "4054",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "HP",
      workType: "EPH",
      sector: "5G",
      specs: "BB1",
    },
    pcode: "PE274054",
    proposalID: "PE27HP4054EPH5GBB1",
  },
  {
    serial: "4055",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "WB",
      workType: "EPH",
      sector: "3B",
      specs: "BB2",
    },
    pcode: "PE274055",
    proposalID: "PE27WB4055EPH3BBB2",
  },
  {
    serial: "4056",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "HR",
      workType: "CEO",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274056",
    proposalID: "PS27HR4056CEO71NA0",
  },
  {
    serial: "4057",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "UP",
      workType: "CEO",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274057",
    proposalID: "PS27UP4057CEO71NA0",
  },
  {
    serial: "4058",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "AS",
      workType: "EIA",
      sector: "8B",
      specs: "BB1",
    },
    pcode: "PE274058",
    proposalID: "PE27AS4058EIA8BBB1",
  },
  {
    serial: "4059",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274059",
    proposalID: "PR27DL4059ENA71NA0",
  },
  {
    serial: "4060",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "HR",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274060",
    proposalID: "PR27HR4060ENA71NA0",
  },
  {
    serial: "4061",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "HR",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274061",
    proposalID: "PR27HR4061ENA71NA0",
  },
  {
    serial: "4062",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "ENA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274062",
    proposalID: "PR27DL4062ENA71NA0",
  },
  {
    serial: "4063",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "CEO",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274063",
    proposalID: "PS27DL4063CEO71NA0",
  },
  {
    serial: "4064",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "GJ",
      workType: "ECR",
      sector: "5E",
      specs: "GA0",
    },
    pcode: "PE274064",
    proposalID: "PE27GJ4064ECR5EGA0",
  },
  {
    serial: "4065",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "HR",
      workType: "EMP",
      sector: "8A",
      specs: "BB2",
    },
    pcode: "PE274065",
    proposalID: "PE27HR4065EMP8ABB2",
  },
  {
    serial: "4066",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "MON",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274066",
    proposalID: "PR27DL4066MON71NA0",
  },
  {
    serial: "4067",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "AS",
      workType: "EAM",
      sector: "5F",
      specs: "BB1",
    },
    pcode: "PE274067",
    proposalID: "PE27AS4067EAM5FBB1",
  },
  {
    serial: "4068",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "AP",
      workType: "ECE",
      sector: "4B",
      specs: "GEA",
    },
    pcode: "PE274068",
    proposalID: "PE27AP4068ECE4BGEA",
  },
  {
    serial: "4069",
    payload: {
      pgCompany: "PR",
      finYear: "2027",
      stUt: "DL",
      workType: "DUA",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PR274069",
    proposalID: "PR27DL4069DUA71NA0",
  },
  {
    serial: "4070",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "TN",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274070",
    proposalID: "PS27TN4070ENC71NA0",
  },
  {
    serial: "4071",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "AS",
      workType: "EMP",
      sector: "8A",
      specs: "BB2",
    },
    pcode: "PE274071",
    proposalID: "PE27AS4071EMP8ABB2",
  },
  {
    serial: "4072",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "HR",
      workType: "EPH",
      sector: "3B",
      specs: "BB2",
    },
    pcode: "PE274072",
    proposalID: "PE27HR4072EPH3BBB2",
  },
  {
    serial: "4073",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "UP",
      workType: "CTO",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274073",
    proposalID: "PS27UP4073CTO71NA0",
  },
  {
    serial: "4074",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "CH",
      workType: "CTE",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274074",
    proposalID: "PS27CH4074CTE71NA0",
  },
  {
    serial: "4075",
    payload: {
      pgCompany: "PS",
      finYear: "2027",
      stUt: "DL",
      workType: "ENC",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PS274075",
    proposalID: "PS27DL4075ENC71NA0",
  },
  {
    serial: "4076",
    payload: {
      pgCompany: "PE",
      finYear: "2027",
      stUt: "GJ",
      workType: "EAS",
      sector: "71",
      specs: "NA0",
    },
    pcode: "PE274076",
    proposalID: "PE27GJ4076EAS71NA0",
  },
];

let pass = 0;
const failures = [];

for (const c of cases) {
  const r = buildIdentifiers(c.payload, c.serial);
  if (r.pcode === c.pcode && r.proposalID === c.proposalID) {
    pass++;
  } else {
    failures.push({ expected: c, actual: r });
  }
}

console.log(
  `\nGolden replay of ${cases.length} live rows: ${pass} passed, ${failures.length} failed\n`,
);
for (const f of failures) {
  console.log("  MISMATCH");
  console.log("    payload           ", JSON.stringify(f.expected.payload));
  console.log("    serial            ", f.expected.serial);
  console.log("    proposalID expected", f.expected.proposalID);
  console.log("    proposalID actual  ", f.actual.proposalID);
  console.log("    pcode expected     ", f.expected.pcode);
  console.log("    pcode actual       ", f.actual.pcode);
}

process.exit(failures.length === 0 ? 0 : 1);
