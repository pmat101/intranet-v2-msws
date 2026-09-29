// Lists every billing start recorded in AcceptanceRegister. Read only.
//
// Written for one purpose: until the refreshStage import was fixed, every
// billing start saved correctly but no mail reached Accounts. This produces the
// list of those projects to hand to them, as a table here and a CSV they can
// open in Excel.
//
// Usage:
//   node provisioning/list-billing-starts.js
//   node provisioning/list-billing-starts.js --site="{host},{guid},{guid}"
//   node provisioning/list-billing-starts.js --site="..." --before=2026-09-30
//
// --before limits the list to rows created before that date, which is how you
// separate the ones Accounts missed from the ones mailed after the fix.

const fs = require("fs");
const path = require("path");

// Same order as provision.js: settings, then the override, then graph.js,
// which captures SITE_ID when it loads.
const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "api", "local.settings.json"),
    "utf8",
  ),
);
for (const [k, v] of Object.entries(settings.Values || {})) process.env[k] = v;

const siteArg = process.argv.find((a) => a.startsWith("--site="));
if (siteArg) {
  process.env.SITE_ID = siteArg
    .slice("--site=".length)
    .replace(/^["']|["']$/g, "");
}
const beforeArg = process.argv.find((a) => a.startsWith("--before="));
const before = beforeArg ? beforeArg.slice("--before=".length) : "";

const { graph, SITE_ID } = require("../api/src/lib/graph");

const lakh = (paise) => (Number(paise || 0) / 10000000).toFixed(2);
const csvCell = (v) => {
  const s = String(v === undefined || v === null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  console.log(`Site: ${SITE_ID}`);
  if (siteArg)
    console.log("Site taken from --site, overriding local.settings.json.");
  if (before) console.log(`Only rows created before ${before}.`);
  console.log();

  let url = `/sites/${SITE_ID}/lists/AcceptanceRegister/items?expand=fields&$top=999`;
  const rows = [];
  for (let page = 0; page < 20 && url; page++) {
    const r = await graph("GET", url);
    for (const i of r.value || []) rows.push(i.fields);
    const next = r["@odata.nextLink"];
    url = next ? next.replace("https://graph.microsoft.com/v1.0", "") : null;
  }

  const list = rows
    .filter((f) => !before || String(f.CreatedAtIso || "") < before)
    .sort((a, b) =>
      String(a.CreatedAtIso || "").localeCompare(String(b.CreatedAtIso || "")),
    );

  if (!list.length) {
    console.log("No billing starts found.");
    return;
  }

  const header = [
    "P-Code",
    "Recorded on",
    "Accepted by",
    "Reference",
    "Value in lakh",
    "Recorded by",
  ];
  const out = list.map((f) => [
    f.PCode,
    String(f.CreatedAtIso || "").slice(0, 10),
    f.Mode || "",
    f.WONumber || f.SONumber || f.ReferenceNo || "",
    lakh(f.WorkOrderValue),
    f.CreatedByEmail || "",
  ]);

  const widths = header.map((h, c) =>
    Math.max(h.length, ...out.map((r) => String(r[c]).length)),
  );
  const line = (r) => r.map((v, c) => String(v).padEnd(widths[c])).join("   ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("   "));
  for (const r of out) console.log(line(r));

  const total = list.reduce((t, f) => t + (Number(f.WorkOrderValue) || 0), 0);
  console.log(
    `\n${list.length} billing start(s), ${lakh(total)} lakh in total.`,
  );

  const csvPath = path.join(process.cwd(), "billing-starts-for-accounts.csv");
  fs.writeFileSync(
    csvPath,
    [header, ...out].map((r) => r.map(csvCell).join(",")).join("\n") + "\n",
  );
  console.log(`Written to ${csvPath}`);
}

main().catch((err) => {
  console.error("\nListing failed:", err.message);
  process.exit(1);
});
