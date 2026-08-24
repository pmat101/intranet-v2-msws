// Integration test for identity minting. Talks to the dev SharePoint site
// and CREATES REAL ROWS. Never run against production.
//
// Run: node api/test/mint.test.js

const fs = require("fs");
const path = require("path");
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "local.settings.json"), "utf8"),
);
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const { mintProject, normaliseName } = require("../src/lib/mint");

const caller = { email: "pranav.mathur@perfactgroup.in", name: "Pranav Mathur" };
const stamp = Date.now();

let pass = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${ok ? "" : `\n        expected ${expected}\n        actual   ${actual}`}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  console.log("\n1. normaliseName");
  check("punctuation ignored", normaliseName("Jubilant Ltd."), "JUBILANT LTD");
  check("case ignored", normaliseName("jubilant ltd"), "JUBILANT LTD");
  check("spacing collapsed", normaliseName("Jubilant   Ltd"), "JUBILANT LTD");
  check("different company differs", normaliseName("Jubilant Pharma") === "JUBILANT LTD", false);

  const company = `ZZ Test Industries ${stamp} Pvt Ltd`;

  console.log("\n2. First lead mints everything");
  const first = await mintProject({
    customerCompany: company,
    customerFirstName: "Asha", customerLastName: "Verma",
    customerEmail: `asha.${stamp}@example.com`,
    customerContact: "9876543210",
    pgCompany: "PE", finYear: "2027", stUt: "DL",
    workType: "EIA", sector: "1A", specs: "GPL",
    activityProposed: "Test project one",
    leadSource: "Direct", customerClass: "new",
  }, caller);
  console.log(`   ${first.pcode}  ${first.proposalID}`);
  console.log(`   ${first.groupId}  ${first.customerId}  ${first.contactId}`);
  check("group was created", first.createdGroup, true);
  check("customer was created", first.createdCustomer, true);
  check("contact was created", first.createdContact, true);

  console.log("\n3. Second lead, same company spelled differently");
  const second = await mintProject({
    customerCompany: company.toLowerCase().replace(" pvt ltd", " pvt. ltd."),
    customerFirstName: "Asha", customerLastName: "Verma",
    customerEmail: `asha.${stamp}@example.com`,
    customerContact: "9876543210",
    pgCompany: "PE", finYear: "2027", stUt: "HR",
    workType: "ENA", sector: "8A", specs: "BB1",
    activityProposed: "Test project two",
    leadSource: "Direct", customerClass: "existing",
  }, caller);
  console.log(`   ${second.pcode}  ${second.proposalID}`);
  console.log(`   ${second.groupId}  ${second.customerId}  ${second.contactId}`);

  check("group REUSED, not duplicated", second.createdGroup, false);
  check("same GroupID", second.groupId, first.groupId);
  check("customer REUSED", second.createdCustomer, false);
  check("same CustomerID", second.customerId, first.customerId);
  check("contact REUSED", second.createdContact, false);
  check("same ContactID", second.contactId, first.contactId);

  console.log("\n4. The two projects are distinct");
  check("different P-Codes", second.pcode === first.pcode, false);

  console.log(`\n${pass} checks passed.`);
  console.log(`\nTest rows created under company "${company}". Delete them from`);
  console.log("GroupMaster, CustomerRegister, ContactRegister and ProjectRegister when done.\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message, "\n");
  process.exit(1);
});
