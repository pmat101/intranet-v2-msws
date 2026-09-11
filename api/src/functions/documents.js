const { app } = require("@azure/functions");
const { verifyRequest } = require("../lib/auth");
const { resolveRole } = require("../lib/roles");
const { graph, SITE_ID, getAppToken } = require("../lib/graph");
const { allocate } = require("../lib/sequences");

const MAY_UPLOAD = ["BD", "TeamHead", "Accounts", "Admin", "CSO", "COO"];

// Graph accepts a simple upload up to 4 MB. Above that it needs an upload
// session in chunks, which is more machinery than a proposal PDF warrants, so
// we refuse with a clear message rather than failing obscurely at the limit.
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

const TYPES = [
  "Proposal",
  "ClientConfirmation",
  "PurchaseOrder",
  "WorkOrder",
  "Correspondence",
  "Other",
];

function fail(status, code, message) {
  return { status, jsonBody: { ok: false, error: { code, message } } };
}

async function findOne(list, filter) {
  const r = await graph(
    "GET",
    `/sites/${SITE_ID}/lists/${list}/items?expand=fields&$filter=${encodeURIComponent(filter)}`,
  );
  return (r.value && r.value[0]) || null;
}

/**
 * SharePoint rejects a number of characters in file names and silently mangles
 * others. Strip rather than substitute, so a name is either recognisable or
 * obviously truncated.
 */
function safeName(name) {
  return (
    String(name || "file")
      .replace(/[\\/:*?"<>|#%{}~&]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "file"
  );
}

/**
 * Uploads raw bytes to the project's folder in the site's default library.
 *
 * Graph's PUT to a drive path creates intermediate folders itself, so there is
 * no separate folder creation step and therefore no race between two people
 * uploading to a new project at the same moment.
 */
async function uploadToDrive(pcode, fileName, bytes, contentType) {
  const token = await getAppToken();
  const path = `${encodeURIComponent(pcode)}/${encodeURIComponent(fileName)}`;
  const url =
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}` +
    `/drive/root:/${path}:/content`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: bytes,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload failed: ${res.status} ${detail}`);
  }
  return res.json();
}

async function handle(request, context) {
  let caller;
  try {
    caller = await verifyRequest(request);
  } catch (err) {
    return fail(401, err.code, err.message);
  }

  let entry;
  try {
    entry = await resolveRole(caller.email);
  } catch (err) {
    return fail(403, err.code || "role_failed", err.message);
  }
  if (!MAY_UPLOAD.includes(entry.role)) {
    return fail(
      403,
      "not_permitted",
      `Role ${entry.role} may not upload documents`,
    );
  }

  // Metadata travels in the query string, because the body is the file itself.
  // This endpoint reads bytes rather than JSON, which is why it looks different
  // from every other endpoint here.
  const pcode = String(request.query.get("pcode") || "").trim();
  const docType = String(request.query.get("type") || "Other").trim();
  const label = String(request.query.get("label") || "").trim();
  const notes = String(request.query.get("notes") || "").trim();
  const rawName = String(request.query.get("filename") || "").trim();

  if (!pcode)
    return fail(400, "validation_failed", "A pcode parameter is required");
  if (!rawName)
    return fail(400, "validation_failed", "A filename parameter is required");
  if (!TYPES.includes(docType)) {
    return fail(
      400,
      "validation_failed",
      `Document type must be one of ${TYPES.join(", ")}`,
    );
  }

  const contentType = request.headers.get("content-type") || "";
  const baseType = contentType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED[baseType]) {
    return fail(
      400,
      "unsupported_type",
      `Only PDF, PNG and JPEG are accepted. This was ${baseType || "unknown"}.`,
    );
  }

  const project = await findOne(
    "ProjectRegister",
    `fields/PCode eq '${pcode}'`,
  );
  if (!project)
    return fail(404, "no_such_project", `No project found for ${pcode}`);

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length === 0) return fail(400, "empty_file", "The file was empty");
  if (buffer.length > MAX_BYTES) {
    return fail(
      413,
      "too_large",
      `The file is ${(buffer.length / 1048576).toFixed(1)} MB. The limit is 4 MB.`,
    );
  }

  // The stored name carries the document type and a timestamp, so the folder
  // stays readable and two uploads both called "proposal.pdf" cannot collide.
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
  const fileName = safeName(`${docType} ${stamp} ${rawName}`);

  let uploaded;
  try {
    uploaded = await uploadToDrive(pcode, fileName, buffer, baseType);
  } catch (err) {
    context.log("Drive upload failed:", err.message);
    return fail(
      502,
      "upload_failed",
      "The file could not be stored. Nothing was saved.",
    );
  }

  const nowIso = new Date().toISOString();
  const docId =
    "DOC-" + String(await allocate("document_serial")).padStart(6, "0");

  await graph("POST", `/sites/${SITE_ID}/lists/ProjectDocuments/items`, {
    fields: {
      Title: fileName,
      DocumentID: docId,
      PCode: pcode,
      DocumentType: docType,
      Label: label,
      FileName: fileName,
      FileUrl: uploaded.webUrl || "",
      SizeBytes: buffer.length,
      UploadedByEmail: caller.email,
      UploadedAtIso: nowIso,
      Notes: notes,
      CreatedByEmail: caller.email,
      CreatedAtIso: nowIso,
    },
  });

  context.log(
    `${pcode} document ${docId} uploaded by ${caller.email}: ${docType}, ${buffer.length} bytes`,
  );

  return {
    status: 201,
    jsonBody: {
      ok: true,
      data: {
        documentId: docId,
        pcode,
        documentType: docType,
        label,
        fileName,
        fileUrl: uploaded.webUrl || "",
        sizeBytes: buffer.length,
      },
    },
  };
}

app.http("uploadDocument", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "documents/upload",
  handler: async (request, context) => {
    try {
      return await handle(request, context);
    } catch (err) {
      context.log("UNHANDLED in uploadDocument:", err.stack || String(err));
      return fail(
        500,
        "unexpected",
        "Something went wrong. Nothing was saved.",
      );
    }
  },
});

/** Lists the documents held against a project. */
app.http("listDocuments", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "documents",
  handler: async (request, context) => {
    try {
      let caller;
      try {
        caller = await verifyRequest(request);
        await resolveRole(caller.email);
      } catch (err) {
        return fail(
          err.code === "no_role" ? 403 : 401,
          err.code || "auth_failed",
          err.message,
        );
      }

      const pcode = String(request.query.get("pcode") || "").trim();
      if (!pcode)
        return fail(400, "validation_failed", "A pcode parameter is required");

      const r = await graph(
        "GET",
        `/sites/${SITE_ID}/lists/ProjectDocuments/items?expand=fields&$top=200` +
          `&$filter=${encodeURIComponent(`fields/PCode eq '${pcode}'`)}`,
      );

      const rows = (r.value || [])
        .map((i) => i.fields)
        .map((f) => ({
          documentId: f.DocumentID,
          documentType: f.DocumentType,
          label: f.Label || "",
          fileName: f.FileName,
          fileUrl: f.FileUrl,
          sizeKb: Math.round((Number(f.SizeBytes) || 0) / 1024),
          uploadedBy: f.UploadedByEmail,
          uploadedAt: f.UploadedAtIso,
          notes: f.Notes || "",
        }))
        .sort((a, b) =>
          String(b.uploadedAt).localeCompare(String(a.uploadedAt)),
        );

      return {
        status: 200,
        jsonBody: { ok: true, data: { pcode, count: rows.length, rows } },
      };
    } catch (err) {
      context.log("UNHANDLED in listDocuments:", err.stack || String(err));
      return fail(500, "unexpected", "The documents could not be listed");
    }
  },
});
