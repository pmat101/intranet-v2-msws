// Everything already known about a project's client, gathered from the
// registers, so BD02 shows it rather than asking BD to type it again.
//
// Used by the BD02 forms, which display it read-only, and by both BD02 mails,
// which is where Accounts reviews it.

const { graph, SITE_ID } = require("./graph");

/** OData string literal: a single quote is written twice. */
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;

async function findOne(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value && r.value[0]) || null;
}

async function findAll(list, filter, top) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$top=${top || 50}&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value || []).map((i) => i.fields);
}

/**
 * The tax numbers recorded on this client's most recent other project, so a
 * repeat client's GST, PAN and TAN are offered rather than retyped. Offered,
 * never assumed: the form marks them as carried over for BD to confirm.
 */
async function previousTax(customerId, excludePcode) {
  const projects = await findAll(
    "ProjectRegister",
    `fields/CustomerID eq ${lit(customerId)}`,
    50,
  );
  const pcodes = projects
    .map((p) => p.PCode)
    .filter((c) => c && c !== excludePcode);
  if (!pcodes.length) return null;

  // Chunked, because one long OR chain would exceed the URL limit.
  let rows = [];
  for (let i = 0; i < pcodes.length; i += 15) {
    const filter = pcodes
      .slice(i, i + 15)
      .map((c) => `fields/PCode eq ${lit(c)}`)
      .join(" or ");
    rows = rows.concat(await findAll("AcceptanceRegister", filter, 15));
  }
  const withTax = rows.filter(
    (r) =>
      r.GSTNumber ||
      r.PANNumber ||
      r.TANNumber ||
      r.GSTAvailable === false ||
      r.PANAvailable === false,
  );
  if (!withTax.length) return null;

  withTax.sort((a, b) =>
    String(b.CreatedAtIso || "").localeCompare(String(a.CreatedAtIso || "")),
  );
  const r = withTax[0];
  return {
    fromPcode: r.PCode,
    gstAvailable: r.GSTAvailable === true,
    gstNumber: r.GSTNumber || "",
    panAvailable: r.PANAvailable === true,
    panNumber: r.PANNumber || "",
    tanAvailable: r.TANAvailable === true,
    tanNumber: r.TANNumber || "",
  };
}

async function clientContext(pcode, options) {
  const opts = options || {};
  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq ${lit(pcode)}`,
  );
  if (!project) return null;
  const f = project.fields;

  const [customer, contact, proposal] = await Promise.all([
    f.CustomerID
      ? findOne("CustomerRegister", `fields/CustomerID eq ${lit(f.CustomerID)}`)
      : null,
    f.PrimaryContactID
      ? findOne(
          "ContactRegister",
          `fields/ContactID eq ${lit(f.PrimaryContactID)}`,
        )
      : null,
    findOne("ProposalRegister", `fields/PCode eq ${lit(pcode)}`),
  ]);

  const location = [
    f.AddressLine1,
    f.Village,
    f.Taluka,
    f.District,
    f.StateName,
    f.PostalCode,
    f.Country,
  ]
    .filter(Boolean)
    .join(", ");

  const ctx = {
    pcode,
    proposalId: f.ProposalID || "",
    projectName: f.ProjectName || "",
    pgEntity: f.PGEntity || "",
    location,
    companyName: customer ? customer.fields.LegalName || "" : "",
    contactName: contact ? contact.fields.ContactName || "" : "",
    contactEmail: contact ? contact.fields.Email || "" : "",
    contactPhone: contact ? contact.fields.Phone || "" : "",
    prMode: proposal ? proposal.fields.PRMode || "" : "",
    proposalSentOn:
      proposal && proposal.fields.SentToClientAtIso
        ? String(proposal.fields.SentToClientAtIso).slice(0, 10)
        : "",
  };

  if (opts.withPrefill && f.CustomerID) {
    try {
      ctx.previousTax = await previousTax(f.CustomerID, pcode);
    } catch {
      ctx.previousTax = null; // A lookup that fails only loses the convenience.
    }
  }
  return ctx;
}

module.exports = { clientContext };
