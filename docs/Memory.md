# Memory.md, BD Pipeline Project Logbook

Append-only. Newest entries at the top. Every working session adds: date, what was done, decisions, gotchas, open items. This file feeds the handover handbook at project close.

---

## 2026-08-25, B4 endpoint complete and working in production

**Built.** `lib/validate.js` (server-side rules ported from `validateBD01AServer`, with sector made mandatory since it feeds the ProposalID, and the typed form-filler fields dropped in favour of the verified identity). `functions/leads.js`, the createLead endpoint: verify, resolve role, check permission, validate, mint. `functions/groups.js`, a loose substring search over GroupMaster for dedupe suggestions. `app/lib/vocab.js`, seven controlled vocabularies extracted verbatim from the legacy `config.js` and `BD01A.html`: 4 entities, 37 states, 64 work types, 49 sectors, 18 specifications, plus lead source and customer class. `app/leads/new.html`, the form itself.

**Verified by real calls.** 401 without a token. 400 with fourteen named field errors. 201 with a P-Code on a valid lead. **200 with `duplicate: true` and the same P-Code on an identical resubmission**, so the double-click guard holds and no serial is burned. Search returns nothing below three characters and finds substring matches above it.

**The significant finding, which corrects a hosting decision.** Azure Static Web Apps **overwrites the Authorization header** on requests to managed functions, substituting its own platform token for the internal hop. Our Entra token never arrived: the function saw `iss: {id}.scm.azurewebsites.net`, `aud: {id}.azurewebsites.net/azurefunctions`. This is documented in Azure/static-web-apps issues 34, 275 and 335, open since 2020. It works locally because there is no such layer.

Fix: the token now travels in **`X-Perfact-Auth`**, which SWA leaves untouched. `Authorization` is still accepted as a fallback so direct curl testing works. Security is unchanged; the same JWT is verified with the same signature, issuer, audience and expiry checks. Only the envelope differs.

This matters for the SWA Free versus Standard decision recorded on 20 August. That choice assumed we could validate bearer tokens inside managed functions. We can, but only via a custom header. Anyone revisiting the hosting question will otherwise hit this wall and wrongly conclude the design was unsound.

**Two secondary lessons.**
- A missing environment variable surfaced as "Token failed verification", which sent us hunting in the wrong place. The health endpoint now reports which required settings are absent, without revealing values. Configuration must be set separately in the SWA Environment variables because `local.settings.json` is gitignored and never deploys.
- A truncated token, copied from a browser that had elided the middle with an ellipsis, produced an empty 500 rather than a clean rejection. `verifyRequest` now checks the three-part structure before parsing, and `createLead` has an outer guard so no path can return an empty response without the error envelope.

**Security incident.** The client secret was exposed in a screenshot of the SWA Environment variables page with "Hide values" toggled off. Rotated the same day; the old secret was deleted in the portal, which invalidates it immediately. Standing rule: leave "Hide values" on and reveal single rows only.

**Open.** Production currently reads and writes the **dev** SharePoint site, because the Sites.Selected grant is scoped to the app registration rather than to an environment. Acceptable while nothing real exists; must be separated before B12.

**Next.** The admin@ confirmation mail on lead creation, which is the last piece of B4, then B5 qualification approvals.

---

## 2026-08-24, B1 closed, B2 begun, B3 complete: identity spine working

**B1 closed.** Role resolution added (`lib/roles.js`) reading the `UsersRoles` list with a five minute cache. `whoami` now returns 401 for a failed token and 403 for a verified account with no role or a deactivated one. Verified by setting Active to No in SharePoint and receiving the 403, which demonstrates that authorisation is data rather than code: access is granted and revoked by editing a list row, with no deployment.

**B2 begun.** `provisioning/provision.js` now reconciles at two levels: a list that exists is not recreated, and a column missing from an existing list is added. It never alters or deletes an existing column, because internal names are fixed at creation and type changes lose data. Seven lists exist on the dev site: UsersRoles, Settings, Sequences, GroupMaster, CustomerRegister, ContactRegister, ProjectRegister. The remaining registers and masters are deferred; the runner is proven so adding them is schema entry.

**B3 complete, and this was the phase with real risk.**
1. `lib/ids.js` ports `genProposalIDnPCODE` from the legacy `Code.js`. Five behaviours must never be "improved": the serial is not zero padded, finYear takes the last two characters, `normalizeCode` truncates to three, an empty input yields an empty segment, and segments are variable width so codes cannot be parsed by position.
2. **Golden test built from 50 real BD01A rows** exported from the live sheet on 24 August. All 50 replay byte-identically: three entities, thirteen state codes, eighteen work types, eleven sectors. Held in `api/test/ids.golden.test.js`. If it ever fails, the port has drifted and must be fixed before any new lead is minted.
3. `lib/sequences.js` replaces Apps Script `LockService` with **optimistic concurrency**: read the row with its ETag, PATCH with If-Match, retry on 412. Ten simultaneous allocations produced ten distinct contiguous values with **26 conflicts caught and retried**, so the guard is demonstrably exercised, not merely present.
4. `lib/mint.js` joins them. Identity resolution runs before serial allocation so a failure does not burn a P-Code, since SharePoint has no transactions. Deduplication is **exact match after normalisation**, never fuzzy: a false merge of two real companies is far costlier than a duplicate. Verified that a company differing by case and punctuation resolves to the existing GroupID, CustomerID and ContactID.

**Decisions taken.**
- Dev serial seeded at 4100 against a live counter of 4077. The gap is recorded in the Sequences row note. Production must be seeded from the live sheet at cutover as a scripted step, not guessed at now.
- Group, Customer and Contact IDs use dummy formats `GRP-00001`, `CUS-00001`, `CON-00001`, deliberately unlike a P-Code so the two can never be confused. Real formats come from the Decoder before production; minting lives in one function so it is a one line change.
- Unmatched company names mint a new group flagged for review rather than silently. Worth revisiting with Kushal.
- Sites.Selected needs the `manage` role, not `write`. `write` covers list items; creating a list is structural. Set by DELETE then POST on /permissions, since PATCH is not supported there.

**Gotchas.**
- Graph Explorer mishandles the commas in the site ID form on DELETE and PATCH. Use the path form `{host}:/sites/{name}:` by hand; the ID form is fine in code.
- A permission change can take a minute to propagate, and the failure that follows is a **cached** response with the original timestamp, which looks identical to a persistent failure. Wait and retry once before changing anything.
- Search and replace patches are not idempotent; applying one twice inserts twice. Whole file replacements only, especially with Prettier reformatting on save.
- Excel exports coerce strings to floats: `sector` 71 became 71.0 and `finYear` 2027 became 2027.0. Had the dot survived, `normalizeCode` would have produced 710 and 31 golden cases would have failed.

**Next.** B4, the BD01A lead form itself, which is the first screen a real person uses. `mintProject` is its engine.

---

## 2026-08-20, B0 closed and B1 nearly complete: live site, authentication working end to end

**Built today, all verified working.** Workshop rebuilt from scratch (Homebrew, Git, Node 24, Functions Core Tools v4, SWA CLI, VS Code). Legacy Apps Script snapshot recloned via clasp into `legacy/apps-script`, 97 files, which also settled an open question: BD00, BD01B, BD04 and BD05 do have page files, but no submit handlers exist for BD01B, BD04 or BD05, so those three were never operational in Apps Script and exist only as Zoho originals. Corrected document set committed. Design tokens written to `app/assets/tokens.css` with both themes. Hello page, `staticwebapp.config.json`, health endpoint on Functions v4. Static Web App created on the **Free** plan with continuous deployment from GitHub; live at `https://delightful-hill-04d74c200.7.azurestaticapps.net`. MSAL sign-in against the single-tenant registration, `api.js` wrapper, and server-side JWT verification with a `whoami` endpoint.

**Decisions taken.**
1. **Hosting**: Static Web Apps Free with managed functions for the browser-facing API, plus a separate standalone Function App on Flex Consumption with Node 24 for scheduled work at B5. Reasoning: bring-your-own functions requires the SWA Standard plan at roughly ₹9,600 a year, and buys features our design does not use, since we validate tokens ourselves rather than using SWA's built-in auth. Managed functions are HTTP only, which is why timer work needs the separate app. Flex free grant is 250,000 executions and 100,000 GB-s a month, ample for us. Always Ready must stay at zero, since it carries no free grant.
2. **Money is stored as integer paise**, displayed as lakh and crore, converted once at migration from the lakhs the live forms capture. Taken as an IT call, to be noted to the CSO.
3. **Node 24, not Node 20.** Pranav checked and was right; Node 20 reached end of life in April 2026. Consumption plan caps at Node 22 and retires September 2028, which is the other reason Flex is the forward path.
4. **Azure billing** proceeds on the interim personal instrument as recorded on 1 August; correction still due before live BD data.

**Gotchas worth keeping.**
- Entra issues **v1.0 access tokens by default** for custom APIs, with issuer `sts.windows.net` and audience `api://{clientId}`. Our verifier expects v2.0. Fixed by setting `requestedAccessTokenVersion` to 2 on the app registration. A cached token survives the change, so a full sign-out is required to see the fix.
- The SWA CLI tries to download its own copy of Functions Core Tools and fails on a broken partial download; there is no `--func-binary` flag in 2.0.10. The documented approach is two terminals: `func start` in `api/`, then `swa start` with `apiDevserverUrl` pointing at 7071. Saved in `swa-cli.config.json`.
- Prettier reformats on save, so text-matching patches against source files fail. Whole-file replacements only.
- `cat >` cannot create missing directories, which produced a `Cannot find module` cascade at `api/src/lib/`.
- `AzureWebJobsStorage` warnings are harmless for HTTP triggers but will matter at B5, when timer triggers need storage.
- Ordering bug worth remembering: an API call placed above `await initAuth()` runs before any account exists, so it silently does nothing. No error, no warning.

**Teaching note.** Quiz checkpoints 2 and 3 did not land when asked at the end of long sessions. Changed approach: one question at the point it matters, mid-step. Learning notes are still not being written, which is the main reason recall is thin.

**Next.** B1's last piece is roles, which needs the UsersRoles master, so it merges into B2 provisioning. Before B2: the SharePoint site decision, and the Decoder content including ID formats.

---

## 2026-08-04, BD workflow field map built; document audit and corrections

**Done.** Read all seven live BD forms directly, three from Apps Script (BD01A, BD02, BD03) and six Zoho originals supplied by Pranav (BD01A, BD01B, BD02, BD04, BD05, BD00). Produced BDWorkflow.md and a thirteen-slide field map deck covering the six stage chain with every field per form. Audited all project markdown files and corrected them.

**Findings from the code that changed the design:**
1. The P-Code is `Entity + FY + Serial` (PE273853). The long composite string the blueprint calls the P-Code is the ProposalID. Both are minted together by `genProposalIDnPCODE` from one shared serial. BackendSchema described the P-Code using the ProposalID's anatomy, which would have corrupted every join.
2. The quote ladder is four rungs, not two: PBL base cost, PBL2 minimum quote (the floor), PBL3 first quote, PBL10 agreed quote. PBL2 and PBL3 live on BD01B and were entirely absent from the schema. Kushal's floor-to-ceiling pricing gate is therefore already half built.
3. The live BD02 cost stack is ten fields (overhead, testing, admin, manpower, outsourcing, commissions, outsourced manpower, secondary data, contingency, site visit) and none of them were in the schema, which carried only the blueprint's revenue-side decomposition. Both are needed; they are complementary, not alternatives.
4. `validateBD02Server` requires nine fields and none of them is cost, margin or duration. Kushal's five per cent margin completion is what the code permits, not a training failure.
5. The published forms directory lists seven BD forms. Only BD01A, BD02 and BD03 have Apps Script pages and handlers. BD00, BD01B, BD04 and BD05 exist only as Zoho originals, so those directory links may be dead. To verify on the live site.
6. The live BD03 is the technical handover, not the pipeline tracker the Tier 3 note describes.
7. BD04 records three invoice counters per entity and no invoice number, date or amount, which is exactly why no receivables position exists.
8. BD00 re-types roughly twenty BD01A fields before reaching the four that matter. Under the new design Lost becomes a status transition.

**Corrections Pranav made to my reading:** one P-Code per project with the entity inside it, not sibling codes per project; seven delivery pools that work with clients (Fountain, Ocean, Pond, Pool, Reservoir, Spring, Tributary); no Business Head role any more.

**Field coverage audit.** First pass covered 113 of 119 Apps Script fields. Six genuine misses, five of them conditional specify fields hidden behind dropdowns on BD03 (category, baseline season, EAC name, travelling borne by, type of work) plus `project_location_address_line1`, and one on Zoho BD00 (`lost_reason_other_specify`). Also restored `rfq_url` alongside the new upload field, since 1,557 historical leads hold links. Now 119 of 119.

**Document corrections applied:** BackendSchema identity keys rewritten, cost stack and full quote ladder added to ProposalRegister, ExpenseLedger expanded so receivables compute, DeliveryPools corrected, UsersRoles given TeamHead, CSuiteOfficer and EIACoordinator with Business Head retired, FormMapping rebuilt around the live codes, units flagged as an open decision before B2. Architecture given the Functions storage account caveat against the nil-cost claim. ImplementationPlan S3.1 now requires golden tests on both identifiers. Walkthrough S0.1 updated to the completed MCA route. PRD decision table refreshed: two resolved, seven new, fifteen total.

**Housekeeping.** ImplementationPlan2.md and Memory2.md were the current versions; the un-numbered duplicates were stale and have been replaced rather than carried. ReadMe.md is a legacy Apps Script build guide with no document control header, and belongs under a legacy folder rather than in the controlled set.

**Open, carried forward:** the fifteen decisions in PRD section 12, the four possibly dead form links to verify, and the unit decision which blocks B2 provisioning.

---

## 2026-08-01, B0 begun: Azure subscription created, billing governance issue found and recorded

**Executed:** S0.1 and S0.2. Subscription `Perfact-Intranet` created, resource group `rg-bd-pipeline` in Central India, budget ₹500/month armed at 50, 90 and 100 per cent during creation.

**What the investigation found before creating anything.** Perfact has an active Microsoft Customer Agreement billing account, so no card signup was needed and no reseller block applied. Inside it are five billing profiles: four named after distributors (Ingram Micro, Savex, Tech Data, Multiverse Solutions) and one named after me. Only mine has invoice history, and both its invoices carry zero transactions and nil amounts, which means the licence spend is invoiced through the distributor channel and not by Microsoft directly. My billing profile had no company payment instrument on it, only my personal MasterCard as default and Dr. Nipun's Visa.

**Decision taken:** proceed on the personal instrument as an interim measure so the build is not delayed, notified to Kushal in writing rather than done silently. Correction due before live BD data enters the system, backstop 30 September 2026: company instrument attached and made default, personal cards detached, billing profile renamed from an individual's name to the company's.

**Corrections to our own documents:** ImplementationPlan S0.1 rewritten (the "pay-as-you-go with the approved card" route never existed for an MCA tenant) and S0.2 updated with the sequencing improvement found in practice, that the budget can be armed inside the subscription creation wizard. The "₹0 recurring" claim across the documents needs a caveat: Azure Functions on consumption requires an associated storage account, which carries a small monthly charge, expected to be a few tens of rupees. Verify against the first real invoice.

**Concepts covered (teaching):** tenant, subscription, resource group, resource, and how they nest; licence as a seat versus Azure as a meter; permission is not authority; public identifiers (tenant ID, client ID, subscription ID) versus the client secret; a resource group's region holds metadata only; budget alert recipients grant no access while IAM roles send no email.

**Quiz checkpoint 1:** 6/10. Conclusions sound, reasoning thin. Re-taught seat versus meter, permission versus authority, and the tenant as a Microsoft identity boundary rather than an Azure one.

**Open:** Kushal as subscription Owner and as budget alert recipient, both still to do. S0.6 (commit these documents) still outstanding. Then S0.3.

---

## 2026-07-19 (later), Pile 2 audit resolved; documents finalised for commit

Pranav audited every change I made against the earlier plan. I sorted the changes into three piles: forced by Kushal's documents (no vote), my own judgement calls (nine items), and deliberately unchanged. Only the nine judgement calls were open. His decisions:

1. Custom form screens: kept (deviation stands; goes to the gated COO+IT decision).
2. Stages and form codes as master data: kept ("we maintain the data, not Kushal").
3. Design language: **Aptos adopted** (M365-native, ₹0, no self-host licence needed); **the rest of the Perfact-Intranet palette stays ours** (amber/pine/moss/river), Pranav's creative choice for an internal portal. Design.md rewritten accordingly, restoring the v0.1 palette with Aptos swapped in.
4. Dark mode: **kept** ("internal portal, not a corporate presentation"). The v0.1 design already carried both themes, so this is a restore, not new work. The #913831 danger colour I had proposed is dropped; the palette's own danger token (#b3372b light / #e07a6d dark) is used.
5. Cost: reaffirmed ₹0, only what the Business Basic and Standard licences provide plus our own technical work.
6. Negotiation cap: **hard cap of 3**, held as Settings.MaxNegotiationRounds so it can be raised later without code. (Reverted from the soft-cap wording.)
7. Gate bounds in the Settings master: kept.
8. B-prefix numbering and ImplementationPlan as the authoritative build order: kept.
9. Monthly register backup: kept for now.

**Design governance line established:** the app chrome (screens staff work in) uses the Perfact-Intranet design system; documents the app emits outward (the client proposal package, the fortnightly MIS to the Chairman) use the corporate Design Language v3.0. Recorded in Design.md section 0 and Rules.md section 7. This respects both Pranav's ownership of the tool and Kushal's authority over outward-facing brand.

**Document hygiene:** stripped all em dashes from every project document per the no-em-dash rule (they were present in prose and, harmfully, inside the BackendSchema relationship diagram, now rebuilt in clean ASCII cardinality notation). Every document verified em-dash-free.

**Walkthrough.md repurposed:** no longer "superseded"; rewritten as the teaching companion to ImplementationPlan.md, sharing the same S-numbers. Part A (five-tier study syllabus) retained; Part B walks each build step concept-first with quiz checkpoints after every couple of steps; Part C is the quiz map. Full teaching detail for B0 to B3, solid for B4 to B7, stepped outlines for B8 to B13 (they expand on arrival, once gated inputs exist).

**Next:** begin execution. First two unblocked steps are S0.6 (commit these documents) then S0.5 (dev SharePoint site + Sites.Selected grant); S0.1 to S0.4 and S0.7 wait on the Azure card and the mailbox decision. Teaching starts at S0.6.

---

## 2026-07-19, IMS Tier 3 specification adopted; documentation set rebuilt

**Received from Kushal:** PG/IMS/BP-002 Rev C (IMS Master Blueprint v2), PG/IMS/BD/T3-NOTE-001 (Tier 3 BD Forms Design), Perfact Design Language v3.0, and the whole-intranet migration work breakdown. The BD Pipeline App is now formally the execution vehicle for IMS Module 1, Tier 3 (forms-led estate), governed by "finish, don't rebuild".

**Done:** PRD, Architecture, Rules, Phases, Design rewritten to v0.2 around the new specification. Four new documents created: TRD.md (stack, APIs, quotas), AppFlow.md (features and navigation), BackendSchema.md (full list schemas, relationships, auth flow), ImplementationPlan.md (S-step build sequence, B0 to B13, with a current-status ledger). Walkthrough.md Part B marked superseded (Part A syllabus and the teaching protocol stay). Phase numbering switched to B-prefix to avoid colliding with the master migration plan, where this app is Phase 8.

**Decisions taken (ours, flagged where they need ratification):**

1. Six-stage pipeline from T3-NOTE-001 adopted as canonical; stages, clocks and form codes held as master data (PipelineStages, FormMapping) so the CSO's 6-vs-8 ratification and the BD03a/b-vs-BD04/BD05 numbering reconciliation are data edits, not rebuilds.
2. Custom form screens recommended over Microsoft Forms, stated openly as a deviation in Architecture §2 with the spec's own reasoning (decision-grade computed mandatory fields, ID minting with dedupe, versioned rounds, post-submit editability): routed to the gated COO + IT tool decision.
3. Corporate Design Language v3.0 adopted for the app UI (Aptos, green-700 headings, ink text, gold as fill-only). Amber/pine palette retired. Flagged gaps: no dark palette exists (app ships light-only), no semantic danger token (#913831 proposed), Aptos self-hosting licence [VERIFY]; adoption for app UI per se to be confirmed by Kushal since the design language enumerates documents, not applications.
4. Twin commercial gates (15 to 30 per cent margin; ₹1.5 lakh/month velocity) and the four standing escalations implemented as server-side gate logic with bounds in the Settings master.
5. TF07/TF22/TF08 delivery-side events bridge from Apps Script via Graph push (BridgeEvents list) during the parallel run; consumers are identical pre- and post-cutover.
6. Auth remains MSAL single-tenant + server-side validation; the work breakdown's Phase 3 Easy Auth + domain-check pattern (and its ₹800/month decision memo) is superseded by this at ₹0, to be confirmed with Kushal.

**Gotchas logged:** BP-002 and T3-NOTE-001 disagree on stage count (8-stage funnel vs 6-stage canonical) and form numbering; resolved as master data plus a gated decision rather than picking silently. PBL/PBL10 semantics not defined in the received documents: carried as live-form fields, definitions [VERIFY] against Decoder/Handbook. Group/Customer/Contact ID formats not specified: [VERIFY] with Kushal before B3.

**Open items (new, joining the standing list below):**

- [ ] PRD §12 gating decisions 1 to 8 put to Kushal/Nipun (tool choice, P-Code standard, stage list, numbering, historical scope, AI provider, mandatory-margin yes/no, plus the standing card/mailbox/edit-rights/PDF items).
- [ ] Decoder content incl. ID formats; RateCard; SectorBenchmark; TagTaxonomy (owners: Kushal/Nipun).
- [ ] Escalation mail wording for below-floor cases (Kushal).
- [ ] Verify client-secret expiry date against the June 2027 rotation reminder at B0.
- [ ] Register CSV backup cadence confirmation (monthly proposed).

**Next session:** documents to Kushal for sign-off; meanwhile Tier 1 study check (three questions), then B0 steps that need no card: S0.5 dev site + Sites.Selected grant, S0.6 docs commit.

---

## 2026-07-16, Project inception

**Done:** Claude Council deliberation concluded; six project documents drafted (PRD, Architecture, Rules, Phases, Design, Memory). AppSheet workbook (`BD_PIPELINE-_app_data.xlsx`, 23 tables) inspected and adopted as schema source of truth. Design tokens extracted from `perfact-intranet-draft-v2.html` and formalised in Design.md. **Walkthrough.md added**, step-level teaching plan (P0.1 → P10.8) with a five-tier pre-study syllabus, nine quiz checkpoints plus a final teach-back exam; teaching protocol agreed: concept → execute → verify → Pranav writes his own note into this file per ✎ step.

**Decisions:**

1. **BD Pipeline App is built first**, before the bulk form migration, highest business visibility, and its approval workflows are the strongest demonstration of the new stack. (Pranav, 16 Jul)
2. **Architecture: hybrid.** Custom HTML/JS frontend on Azure Static Web Apps (Free) + Azure Functions (Node, consumption) + SharePoint Lists as database + Power Automate for approvals/notifications + Graph for mail and files. Standalone Netlify/third-party stack rejected on identity (duplicate joiner/leaver lifecycle), data governance (Confidential BD data leaves tenant), and vendor sprawl, not on capability. Netlify retained as documented fallback host; frontend stays portable.
3. **Auth: Entra ID single-tenant app registration + MSAL.js + server-side JWT validation in Functions.** SWA's built-in tenant-locked auth rejected, it is a Standard-tier feature at roughly ₹800/month/app; the MSAL pattern achieves the same tenant lock at ₹0. Auth ships before any data exists (Phase 1 before Phase 2), the reverse of the old intranet's history.
4. **Old email-token approval system retired** in the new design: `EmailApprovalLog`, `WebhookDebug`, `ApprovalEmailToken` and `Send*Now` columns dropped; Power Automate native Outlook approvals replace them.
5. **PCODE strings over SharePoint Lookup columns** for relationships, portability and simpler Graph queries; integrity enforced in the Functions layer.
6. **TF07 (milestone achievement) is absorbed** into the app's Stage 5 rather than ported as a standalone form.

**Addendum (same day), Power Automate licensing clarified:** The admin-centre Licenses page shows SKUs, not the service plans inside them. "Microsoft Power Automate Free" (34/10,000) is a self-service viral-licence pool, not our entitlement. The real entitlement, "Power Automate for Microsoft 365", is seeded inside Business Basic/Standard/Premium: standard connectors only (SharePoint, Outlook, Approvals, Teams, OneDrive, Excel, Forms), which is exactly the fence our architecture was designed inside. Verified path: user → Licenses and apps → service plans, or test-build a flow at make.powerautomate.com. E5 trial licences (4/25 assigned) will lapse, no dependency on them; E5's seeded PA has the same standard-connector limits anyway.
**Design correction found during this check:** the generic HTTP action in Power Automate is a premium connector, Walkthrough P4.3's "flow calls stage-advance Function" step violated the premium ban. Revised pattern: flow writes the approval outcome to the SharePoint item (standard), and the Function learns of it via a Microsoft Graph change-notification subscription on the list (our code, not a connector). Fallback if webhooks are troublesome: stage as derived state computed on read. Final choice in Phase 4. Architecture.md §5 and Walkthrough P4.3 to be amended accordingly.

**Gotchas logged:**

- AppSheet workbook contains mostly test transaction rows; only reference tables (PGCompanies, Lookups/index, UsersRoles, Settings, FormMapping) migrate as data.
- `Projects` sample rows show identity fields sparsely filled, confirm which Stage-1 fields are truly mandatory before building the create form (do not assume from legacy data).
- Draft v2 HTML defines both themes by re-declaring the same custom properties, formalised as a light/dark token table in Design.md so we don't diverge.

**Open items:**

- [ ] Azure subscription creation, card on file needs Kushal's approval. Blocking Phase 0. If delayed, Phase 0–1 proceed on Netlify per fallback plan.
- [ ] Service mailbox `bd-app@perfactgroup.in`, provisioning decision to Kushal (needs a licence or shared-mailbox approach; shared mailbox preferred, ₹0).
- [ ] PDF conversion route in Phase 5, confirm Graph/OneDrive convert-to-PDF works within licences; Word Online (Business) Power Automate connector believed premium [VERIFY BEFORE SUBMISSION].
- [ ] RoutingMatrix content, sector-wise expert emails needed from Nipun before Phase 4.
- [ ] StageSLAs thresholds per stage, business input from Nipun/Kushal.
- [ ] Who may edit locked Stage-1 identity fields (Admin only vs Management), Kushal.
- [ ] Confirm SPF record update (`include:_spf.google.com`), carried over from earlier work, still pending confirmation.
- [ ] Kushal sign-off on all six documents before Phase 0 begins.

**Next session:** review the six documents together, amend per Pranav/Kushal feedback, then begin Phase 0 (Azure subscription + app registration walkthrough, teaching mode).

---

_(template for future entries)_

## YYYY-MM-DD, <session title>

**Done:** …
**Decisions:** …
**Gotchas:** …
**Open items:** …
**Next session:** …
