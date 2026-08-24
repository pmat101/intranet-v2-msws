const { graph, SITE_ID } = require("./graph");
const { allocate } = require("./sequences");
const {
  buildIdentifiers,
  buildGroupID,
  buildCustomerID,
  buildContactID,
} = require("./ids");

/**
 * Normalises a name for MATCHING ONLY. The original spelling is always
 * stored as given; this is used to decide whether two spellings are the
 * same company. Exact match after normalisation, never fuzzy: a false
 * merge of two real companies is far more costly than a duplicate.
 */
function normaliseName(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

async function itemsOf(list, filter) {
  const query = filter ? `&$filter=${encodeURIComponent(filter)}` : "";
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$top=999${query}`,
  );
  return r.value || [];
}

async function addItem(list, fields) {
  return graph("POST", `/sites/${SITE_ID}/lists/${list}/items`, { fields });
}

/** Resolves a company name to a canonical GroupID, minting one if new. */
async function resolveGroup(companyName, caller, nowIso) {
  const wanted = normaliseName(companyName);
  const rows = await itemsOf("GroupMaster");

  for (const row of rows) {
    const f = row.fields || {};
    const names = [
      f.CanonicalName,
      ...String(f.AliasNames || "").split(/[\n;|]/),
    ];
    if (names.some((n) => normaliseName(n) === wanted && wanted !== "")) {
      return { groupId: f.GroupID, created: false };
    }
  }

  const groupId = buildGroupID(await allocate("group_serial"));
  await addItem("GroupMaster", {
    Title: companyName,
    GroupID: groupId,
    CanonicalName: companyName,
    AliasNames: "",
    Status: "Active",
    Notes:
      "Created automatically at lead capture. Confirm this is not a duplicate.",
    CreatedByEmail: caller.email,
    CreatedAtIso: nowIso,
  });
  return { groupId, created: true };
}

/** Resolves a legal entity within a group to a CustomerID. */
async function resolveCustomer(companyName, groupId, payload, caller, nowIso) {
  const wanted = normaliseName(companyName);
  const rows = await itemsOf("CustomerRegister");

  for (const row of rows) {
    const f = row.fields || {};
    if (
      f.GroupID === groupId &&
      normaliseName(f.LegalName) === wanted &&
      wanted !== ""
    ) {
      return { customerId: f.CustomerID, created: false };
    }
  }

  const customerId = buildCustomerID(await allocate("customer_serial"));
  await addItem("CustomerRegister", {
    Title: companyName,
    CustomerID: customerId,
    GroupID: groupId,
    LegalName: companyName,
    PGEntity: payload.pgCompany || "",
    Status: "Active",
    CreatedByEmail: caller.email,
    CreatedAtIso: nowIso,
  });
  return { customerId, created: true };
}

/** Resolves a contact within a customer, matching on email. */
async function resolveContact(payload, customerId, caller, nowIso) {
  const email = String(payload.customerEmail || "")
    .trim()
    .toLowerCase();
  const rows = await itemsOf("ContactRegister");

  for (const row of rows) {
    const f = row.fields || {};
    if (
      f.CustomerID === customerId &&
      String(f.Email || "")
        .trim()
        .toLowerCase() === email &&
      email !== ""
    ) {
      return { contactId: f.ContactID, created: false };
    }
  }

  const name = [payload.customerFirstName, payload.customerLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const contactId = buildContactID(await allocate("contact_serial"));
  await addItem("ContactRegister", {
    Title: name || email || contactId,
    ContactID: contactId,
    CustomerID: customerId,
    ContactName: name,
    Email: payload.customerEmail || "",
    Phone: String(payload.customerContact || ""),
    IsPrimary: true,
    CreatedByEmail: caller.email,
    CreatedAtIso: nowIso,
  });
  return { contactId, created: true };
}

/**
 * Mints a project from a validated BD01A payload.
 *
 * ORDER MATTERS. Identity resolution runs first because it is retryable
 * and cheap to repeat. The project serial is allocated only once identity
 * is settled, so a failure earlier does not burn a P-Code. SharePoint has
 * no transactions, so this ordering is what keeps failures tidy.
 */
async function mintProject(payload, caller) {
  const nowIso = new Date().toISOString();

  const group = await resolveGroup(payload.customerCompany, caller, nowIso);
  const customer = await resolveCustomer(
    payload.customerCompany,
    group.groupId,
    payload,
    caller,
    nowIso,
  );
  const contact = await resolveContact(
    payload,
    customer.customerId,
    caller,
    nowIso,
  );

  const serial = await allocate("project_serial");
  const { proposalID, pcode } = buildIdentifiers(payload, serial);

  await addItem("ProjectRegister", {
    Title: pcode,
    PCode: pcode,
    ProposalID: proposalID,
    ProjectName: payload.projectName || payload.activityProposed || "",
    GroupID: group.groupId,
    CustomerID: customer.customerId,
    PrimaryContactID: contact.contactId,
    PGEntity: payload.pgCompany || "",
    LeadDate: payload.leadDate || nowIso,
    LeadSource: payload.leadSource || "",
    StateCode: payload.stUt || "",
    Sector: String(payload.sector || ""),
    Scope: payload.specs || "",
    Specification: payload.specs || "",
    TypeOfWork: payload.workType || "",
    ActivityProposed: payload.activityProposed || "",
    CustomerClass: payload.customerClass || "",
    OwnerEmail: caller.email,
    Stage: "Lead Identified",
    StageEnteredAtIso: nowIso,
    Status: "Active",
    Village: payload.village || "",
    District: payload.district || "",
    StateName: payload.state || "",
    PostalCode: String(payload.postalCode || ""),
    Country: payload.country || "",
    CreatedByEmail: caller.email,
    CreatedAtIso: nowIso,
  });

  return {
    pcode,
    proposalID,
    groupId: group.groupId,
    customerId: customer.customerId,
    contactId: contact.contactId,
    createdGroup: group.created,
    createdCustomer: customer.created,
    createdContact: contact.created,
  };
}

module.exports = { mintProject, normaliseName };
