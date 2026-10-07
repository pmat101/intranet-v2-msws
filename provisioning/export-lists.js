// Exports every list on a site to CSV and JSON. Read only.
//
// One CSV per list, for opening in Excel, and one JSON per list as a faithful
// backup. Every list is included, not only those in schema.js, so a list made
// by hand, such as PipelineStages, is not missed.
//
// Money is stored as integer paise. Each money column is exported as stored,
// with a lakh column beside it so the CSV reads correctly in Excel.
//
// Usage:
//   node provisioning/export-lists.js
//   node provisioning/export-lists.js --site="{host},{guid},{guid}"
//
// The export holds client names, contacts, tax numbers and contract values.
// It is written under exports/, which must never be committed.

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

const { graph, SITE_ID } = require("../api/src/lib/graph");
const { lists: schema } = require("./schema");

// SharePoint's own bookkeeping fields, which say nothing about the data.
const SYSTEM = new Set([
  "ContentType",
  "Edit",
  "LinkTitle",
  "LinkTitleNoMenu",
  "Attachments",
  "ItemChildCount",
  "FolderChildCount",
  "DocIcon",
  "AppAuthorLookupId",
  "AppEditorLookupId",
  "AuthorLookupId",
  "EditorLookupId",
]);
const isSystem = (k) => k.startsWith("@") || k.startsWith("_") || SYSTEM.has(k);

const lakh = (v) =>
  v === "" || v === null || v === undefined
    ? ""
    : (Number(v) / 10000000).toFixed(2);

function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function allItems(listId) {
  let url = `/sites/${SITE_ID}/lists/${listId}/items?expand=fields&$top=999`;
  const rows = [];
  for (let page = 0; page < 200 && url; page++) {
    const r = await graph("GET", url);
    for (const i of r.value || []) rows.push(i.fields || {});
    const next = r["@odata.nextLink"];
    url = next ? next.replace("https://graph.microsoft.com/v1.0", "") : null;
  }
  return rows;
}

async function main() {
  console.log(`Site: ${SITE_ID}`);
  if (siteArg)
    console.log("Site taken from --site, overriding local.settings.json.");

  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-:]/g, "")
    .replace("T", "-");
  const tag = SITE_ID.split(",").pop().slice(-6);
  const dir = path.join(process.cwd(), "exports", `${stamp}-site-${tag}`);
  fs.mkdirSync(dir, { recursive: true });

  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists?$select=id,displayName,list`,
  );
  const lists = (r.value || [])
    .filter(
      (l) => l.list && l.list.template === "genericList" && !l.list.hidden,
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  console.log(`${lists.length} lists to export\n`);
  let total = 0;

  for (const l of lists) {
    const rows = await allItems(l.id);
    total += rows.length;

    // Columns in schema order where the list is known, so the CSV reads the
    // way the registers are designed. Anything else found is added after.
    const spec = schema.find((s) => s.name === l.displayName);
    const money = new Set(
      spec
        ? spec.columns.filter((c) => c.type === "money").map((c) => c.name)
        : [],
    );
    const ordered = [
      "id",
      "Title",
      ...(spec ? spec.columns.map((c) => c.name) : []),
    ];
    const seen = new Set(ordered);
    for (const row of rows)
      for (const k of Object.keys(row)) {
        if (!seen.has(k) && !isSystem(k)) {
          ordered.push(k);
          seen.add(k);
        }
      }
    const cols = ordered
      .filter((c) => c !== "Created" && c !== "Modified")
      .concat(["Created", "Modified"]);

    const header = [];
    for (const c of cols) {
      header.push(c);
      if (money.has(c)) header.push(`${c} (lakh)`);
    }
    const lines = [header.map(csvCell).join(",")];
    for (const row of rows) {
      const cells = [];
      for (const c of cols) {
        cells.push(csvCell(row[c]));
        if (money.has(c)) cells.push(lakh(row[c]));
      }
      lines.push(cells.join(","));
    }

    // The byte-order mark makes Excel read the file as UTF-8, so names
    // in other scripts and the rupee sign open correctly.
    fs.writeFileSync(
      path.join(dir, `${l.displayName}.csv`),
      "\uFEFF" + lines.join("\r\n") + "\r\n",
    );
    fs.writeFileSync(
      path.join(dir, `${l.displayName}.json`),
      JSON.stringify(rows, null, 2),
    );
    console.log(
      `  ${l.displayName.padEnd(24)} ${String(rows.length).padStart(5)} rows${spec ? "" : "   (not in schema.js)"}`,
    );
  }

  console.log(`\n${total} rows across ${lists.length} lists.`);
  console.log(`Written to ${dir}`);
}

main().catch((err) => {
  console.error("\nExport failed:", err.message);
  process.exit(1);
});
