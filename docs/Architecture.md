# Architecture.md, Perfact BD Pipeline App

| Control  | Value                                                           |
| -------- | --------------------------------------------------------------- |
| Document | PG/BD/IT-ARC-001 (numbering per PG/IMS/BP-002 §2.4, to confirm) |
| Revision | v0.2, 19 July 2026. Supersedes v0.1                             |

**Change log v0.1 → v0.2:** data layer restructured into the seven Tier 3 document classes; Microsoft Forms deviation stated and routed to the gated tool decision; flow-to-Function call revised to Graph change notifications (the generic HTTP action is a premium connector); TF07/TF22/TF08 delivery-side event bridge added; document control layer added; UI adopts Perfact Design Language v3.0.

## 1. Architecture in one paragraph

A custom HTML/CSS/JS frontend (no build step) on **Azure Static Web Apps**, authenticated with **MSAL.js against a single-tenant Entra ID app registration**, calling **Azure Functions (Node.js, consumption)** for all business logic including ID minting, gate evaluation and document generation. **SharePoint Lists** hold the entire Tier 3 estate: registers, reference masters, trackers (as views) and the activity log, read and written via **Microsoft Graph** under application permissions scoped to the BD sites only. **Power Automate** (standard connectors) owns human workflow: Outlook approvals for qualification reviews and the CSO quote gate, and notification mail from the service mailbox. Functions learn of list changes through **Graph change-notification subscriptions**, never the premium HTTP connector. Everything runs on licences already paid. The recurring-cost target is effectively nil with a ₹500 per month tripwire, with one honest caveat: Azure Functions on the consumption plan requires an associated storage account, which carries a small charge for capacity and transactions, expected to be a few tens of rupees a month. Verify against the first real invoice rather than trusting the estimate.

## 2. Tier 3 document classes → implementation

| Class (per BP-002 §2.2)   | Implementation here                                                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forms (mainstring)        | Custom form screens in the app, one per canonical form (BD01a…BD03b), writing through Functions. See the deviation note below.                                                            |
| Trackers                  | Saved views over the registers (pipeline board by stage, lead tracker, task/mailing trackers) plus the app dashboard; Loop optional for collaborative annotation, not a system of record. |
| Registers                 | SharePoint Lists, append-oriented, the system of record (schema in BackendSchema.md).                                                                                                     |
| Reference Lists (masters) | SharePoint Lists, write access restricted to management/Admin; changed only under document control.                                                                                       |
| Dashboards / MIS          | App dashboard pages reading via Functions; SharePoint views as the zero-build fallback; fortnightly MIS roll-up generated from the registers.                                             |
| Templates                 | DOCX/PPTX in a controlled SharePoint library; the proposal package assembles from them via a Function.                                                                                    |
| Archives                  | A dedicated library plus `Retired` status on masters and form definitions; nothing controlled is ever deleted.                                                                            |

**Deviation stated openly (gated decision 4).** BP-002 and the Tier 3 note name Microsoft Forms as the form tool. We recommend custom form screens instead, and the reasoning is the spec's own principles: decision-grade capture requires computed, mandatory fields (margin, velocity) evaluated at fill time, which Microsoft Forms cannot compute; ID minting with dedupe against the Group master, versioned negotiation rounds, post-submission editability under role control, and the twin-gate check before CSO approval are all beyond Microsoft Forms. The custom screens preserve what the tool choice was protecting: the intake behaviours (admin@ confirmation flow, P-Code generation) continue unchanged. If the COO/IT decision goes to Microsoft Forms regardless, the registers, masters, flows and Functions in this architecture remain valid; only the capture surface changes, and the mandatory-computed requirement must then be enforced post-submission by flow, which weakens the "cannot submit blind" guarantee. This trade-off is put to Kushal and Nipun rather than assumed.

## 3. Identity and security

Unchanged from v0.1 in mechanism: single-tenant app registration, MSAL.js (auth-code + PKCE) in the browser, JWT validation (signature via JWKS, issuer, audience, expiry) in every Function, roles resolved server-side from the UsersRoles master, response shaping so a caller never receives fields their role may not see. List-level permission partition per BackendSchema.md §6: commercial figures (cost stack, margin) visible to BD leadership, CSO, COO, Accounts; qualification detail to reviewers and management; billing and expense ledger to Accounts and management. The Functions' Graph identity uses Sites.Selected granted to the BD sites only; secrets live in Function App settings. Two additions from the IMS frame: masters are management-controlled (the Governing Council owns the Tier 3 schema; Admin executes changes under document control), and pre-public-notice government tender material is RESTRICTED, handled through the escalation path and never stored in this app's shared lists.

## 4. Data model

The full schema, column types, keys, relationships and the auth flow live in **BackendSchema.md** (new in v0.2, the authoritative reference). Summary: identity registers (GroupMaster, CustomerRegister, ContactRegister) and the ProjectRegister keyed by P-Code; ProposalRegister with ProposalVersionRegister for negotiation rounds; QualificationReviews; ExpenseLedger; HandoverRegister; ClosureRegister with AAR fields; WinLossRegister; BillingMilestones and MilestoneAchievements; ActivityLog; DocumentControl (the Master Lists of Forms and Record Formats). Reference masters: Decoder, RateCard, SectorBenchmark, TagTaxonomy, PipelineStages (with per-stage clocks), FormMapping, DeliveryPools, PGEntities, UsersRoles, Settings, MilestoneTemplates. Relationships ride on the P-Code and the minted Group/Customer/Contact IDs as indexed strings; integrity is enforced in the Functions layer.

## 5. Workflow and events

**Human approvals** (Power Automate, standard connectors): qualification reviews as "everyone must approve" Outlook approvals to the LU team and Technical Lead; the CSO quote gate on every BD02a finalisation and every negotiation concession; decisions, remarks and verified identity written back to the register item that triggered the flow.
**System events** (Graph change notifications to Functions): stage advancement when all reviews clear; twin-gate evaluation and escalation routing on commercial finalisation; the fifteen-day stall and per-stage clock sweeps (a timer Function reading PipelineStages thresholds); MIS refresh marks.
**Delivery-side triggers during parallel run:** TF07, TF22 and TF08 remain live on Apps Script until their family migrates, so each of those submissions pushes a compact event row to a bridge List via Graph from Apps Script (the dual-write pattern already designed for BD02); flows and Functions consume the bridge exactly as they will consume native list events after cutover, so nothing downstream changes at migration.
**Mail:** notification mail via the Office 365 Outlook connector from the service mailbox; client-facing package mail composed by Functions via Graph sendMail. The admin@ confirmation behaviour is preserved on every intake.

## 6. Repository structure

As v0.1 §6 with these changes: `docs/` now carries the nine documents (PRD, Architecture, Rules, Phases, Design, TRD, AppFlow, BackendSchema, ImplementationPlan) plus Memory.md and the superseded Walkthrough.md; `app/stage-forms/` is organised by canonical form code (bd01a/, bd01b/, bd02a/…); `api/functions/` gains `ids/` (P-Code + Group/Customer/Contact minting), `gates/` (twin gates + escalation), `package/` (proposal package assembly), `events/` (change-notification receivers), `mis/`; `provisioning/` gains master-seed scripts; `templates/` (controlled DOCX/PPTX sources) is tracked with document-control headers.

## 7. Environments and deployment

Unchanged: GitHub private repo, SWA GitHub Action deploying `app/` + `api/` from `main`, preview environment from `dev`, a `bd-pipeline-dev` SharePoint site mirroring production, provisioning scripts making both rebuildable. Legacy Google stays live until each piece is proven; the bridge list decouples the two worlds during the overlap.

## 8. Known trade-offs and deviations register

SharePoint Lists are not relational (Functions compose joins; PCODE and Stage indexed; volumes give ample headroom under the 5,000-item view threshold). Stages, form codes and SLAs are master data by design so the gated CSO decisions (6 vs 8 stages, numbering) are data edits. Loop is optional garnish, not a store of record. The Microsoft Forms deviation is recorded in §2 and gated. The app UI keeps the Perfact-Intranet design system (amber on pine, both light and dark themes) per Design.md; documents the app emits outward follow the corporate design language. PDF conversion route for the package remains [VERIFY BEFORE SUBMISSION] in the proposal phase.
