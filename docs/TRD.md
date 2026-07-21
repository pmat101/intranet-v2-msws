# TRD.md, Technical Requirements Document

| Control | PG/BD/IT-TRD-001 · v1.0 · 19 July 2026 · Owner: Pranav Mathur · Approver: Kushal Bhargava |
| ------- | ----------------------------------------------------------------------------------------- |

Scope: every technology, API, tool and quota the BD Pipeline App depends on, with the licence or cost basis of each. Companion to Architecture.md (why) and BackendSchema.md (data). Anything uncertain carries [VERIFY BEFORE SUBMISSION].

## 1. Platform matrix

| Layer                | Technology                                     | Plan / licence                            | Recurring cost      |
| -------------------- | ---------------------------------------------- | ----------------------------------------- | ------------------- |
| Frontend hosting     | Azure Static Web Apps                          | Free tier                                 | ₹0 (quotas §7)      |
| Backend compute      | Azure Functions, Node.js 20, consumption plan  | Free grant                                | ₹0 within grant     |
| Database / estate    | SharePoint Lists + document libraries          | In Business Basic/Standard                | ₹0                  |
| Workflow / approvals | Power Automate, standard connectors only       | Seeded "Power Automate for Microsoft 365" | ₹0                  |
| Identity             | Entra ID single-tenant app registration + MSAL | Included in tenant                        | ₹0                  |
| Mail and files       | Microsoft Graph                                | Included                                  | ₹0                  |
| Source control / CI  | GitHub private repo + Actions (SWA workflow)   | Free tier                                 | ₹0                  |
| Cost guard           | Azure budget alert                             | n/a                                       | ₹500/month tripwire |

## 2. Frontend requirements

Plain HTML/CSS/JS, ES2020+, no framework and no build step. Dependencies, vendored (committed to the repo, version-pinned, no CDN reliance at runtime): `@azure/msal-browser` (auth-code + PKCE). House modules: `auth.js` (MSAL config, token acquisition and silent refresh), `api.js` (single fetch wrapper: bearer token, envelope unwrap, error surface), `format.js` (en-IN money with lakh/crore, DD MMM YYYY dates, P-Code rendering), `components/` (ribbon, chips, tables, form scaffolding per Design.md). Browser floor: current Edge/Chrome/Safari, iPad Safari included; no IE. Storage: MSAL cache configured deliberately; no other browser storage for security-relevant state.

## 3. Backend requirements

Azure Functions v4 programming model on Node 20. npm dependencies (exact set finalised at B1/B2, pinned in package-lock): `jose` for JWKS fetch + JWT validation; Graph access via plain `fetch` with a thin `lib/graph.js` (token client-credentials flow, list helpers, retry honouring Retry-After); a docx templating library for the proposal package, shortlist `docxtemplater` vs `docx-templates`, chosen at B7 after a spike against the real template [decision logged in Memory.md]; no ORM, no Express (native Functions HTTP). House libraries: `lib/auth.js` (validate signature/issuer/audience/expiry, extract identity), `lib/roles.js` (UsersRoles resolution + response shaping), `lib/ids.js` (P-Code port + Group/Customer/Contact minting + clash guards), `lib/gates.js` (twin gates, stall computation from PipelineStages), `lib/audit.js` (ActivityLog append).

## 4. Microsoft Graph surface (application permissions: Sites.Selected, Mail.Send; delegated only for sign-in)

| Purpose                      | Endpoint family                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolve site and lists       | `GET /sites/{hostname}:/sites/{path}`, `GET /sites/{id}/lists`                                                                                                                  |
| Items CRUD                   | `GET/POST/PATCH /sites/{id}/lists/{id}/items` (`expand=fields`, `$filter` on indexed columns)                                                                                   |
| Change notifications         | `POST /subscriptions` on list resources; renewal per lifecycle; validation handshake in the events Function                                                                     |
| Files: templates and outputs | `GET/PUT /sites/{id}/drive/items/...` (package outputs to the project folder)                                                                                                   |
| PDF conversion               | `GET /drive/items/{id}/content?format=pdf` [VERIFY BEFORE SUBMISSION at B7: confirm behaviour and licence fit for docx→pdf on our tenant; fallback options logged before build] |
| System mail                  | `POST /users/{serviceMailbox}/sendMail`                                                                                                                                         |

Throttling: exponential backoff on 429/503, honour Retry-After, batch reads where sensible; subscriptions renewed by a timer Function well inside expiry.

## 5. Power Automate surface (standard connectors only)

SharePoint triggers (item created/modified) on register lists; Approvals connector ("Approve/Reject, everyone must approve" for qualification; single approver for the CSO gate); Office 365 Outlook connector for notification mail from the service mailbox. Explicitly excluded: the generic HTTP action and every premium connector; any flow step that seems to need one is redesigned into a Function consuming a Graph change notification. Flow definitions are exported and committed under `flows/` with a README per flow (trigger, actions, failure behaviour, owner).

## 6. Dev tooling

Git 2.50+, Node 24 local (Functions run 20 in Azure; keep code compatible), npm with `~/.npm-global` prefix, SWA CLI, Azure Functions Core Tools v4, VS Code with Azure Static Web Apps, Azure Functions and GitLens extensions, clasp only for the legacy bridge work. Local loop: `swa start` proxying `func start`; environment secrets in `local.settings.json` (gitignored).

## 7. Quotas and limits that shape the design

SWA Free: 100 GB bandwidth/month, 250 MB app size, custom domain + SSL included, no SLA (acceptable for an internal tool; revisit only if evidence demands). Functions consumption free grant: 1 million executions and 400,000 GB-s per month (our volumes are orders of magnitude below). SharePoint: 5,000-item list-view threshold (indexed columns from day one; register volumes are hundreds per year), 30 million item ceiling per list (irrelevant at our scale). Graph change-notification subscriptions expire and must be renewed (timer Function). Approvals connector: decisions recorded with AAD identity; no token links anywhere.

## 8. Configuration and secrets

Function App settings hold: tenant ID, client ID, client secret (rotation reminder June 2027 exists; verify against the actual secret expiry at B0), site IDs, service mailbox address, subscription clientState secret. The repo holds none of these. `docs/ids.md` may record public identifiers (tenant ID, client ID) only.

## 9. AI-assist requirements (phase B13, gated)

Provider options with cost basis, decision to COO + CSO before any build: Microsoft 365 Copilot (per-user licence), Azure OpenAI (consumption, requires Azure spend approval), Anthropic Claude API (consumption). Functional needs from T3-NOTE-001 §7: text parsing of enquiries and EAC minutes, drafting against templates, price recommendation bounded by RateCard floor and SectorBenchmark ceiling, summarisation for AAR. Hard requirements regardless of provider: no Confidential data leaves the tenant boundary without Kushal's data-handling sign-off; every AI output lands as a draft with the reviewing human recorded; guardrails per Rules.md §4.

## 10. Explicitly out

Premium connectors; paid Azure SKUs; third-party auth, database or PDF SaaS; frameworks requiring a build chain; Loop as a system of record; browser localStorage for security state; any dependency the team cannot read.

Draft, requires approval by Kushal Bhargava before issue.
