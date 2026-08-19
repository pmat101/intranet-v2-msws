# ImplementationPlan.md, Step-by-Step Build Sequence

| Control | PG/BD/IT-IMP-001 · v1.0 · 19 July 2026 · Owner: Pranav Mathur · Approver: Kushal Bhargava |
| ------- | ----------------------------------------------------------------------------------------- |

The engineering sequence for Phases B0 to B13. This supersedes Walkthrough.md Part B as the build order; the teaching protocol (concept → execute → verify → Memory.md note, with quizzes) continues per phase, and Walkthrough.md Part A remains the study syllabus. Steps are S-numbered inside each phase; every step ends with its verification. [K] marks a step blocked on a Kushal/Nipun decision from PRD §12.

## Current status ledger (19 July 2026)

Done: Git + private repo with legacy snapshot; Entra app registration (single-tenant) with Sites.Selected and Mail.Send consented; client secret stored with rotation reminder; SWA CLI, Functions Core Tools, VS Code extensions installed; app scaffold (`index.html`, `staticwebapp.config.json`); **Azure subscription `Perfact-Intranet` created 1 August 2026 under the existing Microsoft Customer Agreement billing account, with resource group `rg-bd-pipeline` in Central India and a ₹500 monthly budget at 50, 90 and 100 per cent**. Pending, blocking B0: service mailbox decision [K]. Open from S0.1: billing runs on an interim personal payment instrument, to be corrected before live BD data enters the system, backstop 30 September 2026 [K]; Kushal to be added as subscription Owner and as budget alert recipient. Pending content: Decoder/ID formats, RateCard, SectorBenchmark, TagTaxonomy, stage-list ratification, numbering reconciliation, historical-migration scope [K].

## B0, Foundations close-out

S0.1 Create the subscription. Perfact holds an active **Microsoft Customer Agreement** billing account, so the subscription is created inside it (billing account, billing profile, invoice section, plan = Microsoft Azure Plan); there is no pay-as-you-go card signup. Name the subscription for the estate (`Perfact-Intranet`), not the first workload on it. Add a second Owner so the company is not locked out. Then create resource group `rg-bd-pipeline` in Central India (the group's region holds its metadata only; resources inside may sit elsewhere). Verify: subscription visible under Billing and under Subscriptions; resource group listed. Governance note recorded 1 August 2026: the only direct billing profile carried two personal cards and no company instrument, and the licence spend is invoiced through the distributor channel. Proceeding on a personal instrument was accepted as an **interim measure**, notified to the CSO in writing, with correction due before live BD data enters the system.
S0.2 Budget ₹500/month with alerts at 50, 90 and 100 per cent to Pranav and Kushal. **Sequencing improvement found in practice (1 August 2026): the subscription creation wizard carries a Budget tab, so the tripwire can be armed at creation rather than in the window afterwards. Prefer that.** Thresholds mean different things and all three are required: 50 signals that something unexpected has started, 90 means act today, 100 means it happened. Note that a budget alert recipient is only an email address and grants no access, while an IAM role assignment grants access and sends no email; both are needed, for different reasons. Verify: three thresholds present, both recipients listed.
S0.3 Create SWA Free wired to repo `main` (`app/`, `api/`); watch the Action deploy. Verify: hello page live at the generated URL.
S0.4 `/api/health` Function returns `{ ok: true }`. Verify: browser call on the live URL.
S0.5 Create `bd-pipeline-dev` SharePoint site; record site URL in `docs/ids.md`. Grant the app's Sites.Selected to this site. Verify: Graph Explorer read of the site with app context.
S0.6 Commit the nine documents under `docs/`; add the Walkthrough supersession note. Verify: repo tree matches Architecture §6.
S0.7 Service mailbox `bd-app@perfactgroup.in` as a shared mailbox [K]; grant the app Mail.Send scope usage against it per TRD §8. Verify: Graph sendMail test lands from the right address.

## B1, Authentication

S1.1 Vendor `@azure/msal-browser`; `auth.js` with tenant/client IDs and redirect URI; sign-in button renders the verified name. Verify: outside personal account cannot complete sign-in.
S1.2 Acquire the API-scope token; decode at jwt.ms; read aud/iss/tid/exp/name. Verify: claims match expectations.
S1.3 `api.js` single wrapper (bearer, silent refresh, envelope unwrap). Verify: one failing call surfaces the envelope error path.
S1.4 `lib/auth.js` in Functions: JWKS fetch + cache, signature/issuer/audience/expiry checks, 401 otherwise. Verify: expired and tampered tokens rejected in tests.
S1.5 `/api/whoami` resolving role from a stub UsersRoles. Verify: correct role for you; 403 for an unknown account. Quiz 1.

## B2, Estate provisioning

S2.1 `provisioning/provision.js`: create all registers and masters per BackendSchema §3–4, idempotent (second run is a no-op), indexes on PCode/Stage/Status/GroupID/date columns. Verify: run twice, identical state; indexes present.
S2.2 Permission partition per BackendSchema §6 applied by script where the API allows, documented manual steps otherwise. Verify: low-privilege test account cannot open ProposalRegister.
S2.3 Seed masters: PipelineStages (six canonical + clocks) [K ratification is a later data edit], FormMapping (canonical/legacy/blueprint codes) [K], PGEntities, DeliveryPools, UsersRoles, Settings (gate bounds), MilestoneTemplates skeleton. Verify: seed script re-runnable.
S2.4 Load Decoder/RateCard/SectorBenchmark/TagTaxonomy from management content as received [K]; absence blocks only the steps that read them (noted per step below).
S2.5 `lib/graph.js` (client-credentials token, list helpers, 429 retry honouring Retry-After). Verify: unit test with a forced 429 mock. Quiz 2.

## B3, Identity spine

S3.1 Port `genProposalIDnPCODE` into `lib/ids.js` with the clash guard. It mints **two** strings from one shared serial, the P-Code (`Entity+FY+Serial`) and the ProposalID (which adds state, work type, sector and specification), so golden tests must reproduce **both** character for character from known historical inputs, including ProposalIDs with a blank sector segment. Verify: golden suite green on both identifiers.
S3.2 Group/Customer/Contact minting with dedupe against GroupMaster (alias resolution); formats per Decoder [K if Decoder pending]. Verify: two spellings of one group resolve to one GroupID.
S3.3 `lib/audit.js` ActivityLog append used by every write path from here on. Verify: a test write lands one log row. Quiz 3.

## B4, BD01a Lead Captured

S4.1 Lead form screen per Design.md (validate/submit contract; separate contact fields; live dedupe suggestions). S4.2 `POST /api/leads`: role check, payload validation, minting, ProjectRegister + ContactRegister writes, identity lock flags, ActivityLog. Idempotency: same payload twice, one project. S4.3 admin@ confirmation mail via Graph preserving the live wording. S4.4 Qualification reviews fired (creates QualificationReviews rows; flow takes over). S4.5 Tracker stub lists projects with stage chips. Verify: end-to-end test lead; locked-field PATCH rejected server-side.

## B5, Qualification

S5.1 Flow: on QualificationReviews created → Outlook approval (everyone must approve) to LU + Technical Lead; remarks written back. S5.2 Graph change-notification subscription on QualificationReviews → events Function → all-clear advances Stage, notifies owner; conflict flags management. S5.3 Lost path with mandatory reason → WinLossRegister. S5.4 Clock sweep timer Function reads PipelineStages and stamps ageing. Verify: two-reviewer rehearsal end to end; demo to Kushal + Nipun. Quiz 4.

## B6, Commercials and gates

S6.1 BD02a screen: decomposed stack; computed fields rendered read-only. S6.2 `lib/gates.js`: NetPerfactRevenue, MarginPct, VelocityPerMonth computed server-side; bounds read from Settings; results stamped on ProposalRegister. S6.3 Below-floor path: escalation record + mail before any CSO approval [content of escalation wording → Kushal]. S6.4 CSO approval flow on gate-pass; decision written back. Verify: blind submission impossible (missing mandatory fields cannot POST); below-floor cannot reach the CSO without an escalation record. Quiz 5.

## B7, Proposal package

S7.1 Controlled template library (DocumentControl rows for each template). S7.2 Templating spike: docxtemplater vs docx-templates against the real commercial-proposal template; pick and log. S7.3 Package Function assembles the five-document sequence to the project folder; versioned. S7.4 PDF route: test Graph `?format=pdf` conversion on the tenant [VERIFY]; fallback decision logged if it fails licence or fidelity. S7.5 Client mail with package on CSO approval; SentToClient stamped; seven-day clock. Verify: one click, sequenced branded package, correct P-Code in filenames.

## B8, Negotiation

S8.1 Round capture screen and `POST /api/rounds` (delta computed; hard cap of 3 rounds from Settings.MaxNegotiationRounds, a fourth is blocked; the cap is a data value so it can be raised later without code). S8.2 Concession re-entry into the CSO gate. S8.3 Stall flag: sweep marks 15-day pending; board + mail surfacing. S8.4 Acceptance capture exits to Stage 5. Verify: three-round rehearsal with full history. Quiz 6.

## B9, Won and onboarded

S9.1 BD02b billing start (WO/SO) opens ExpenseLedger. S9.2 BD03a handover: pool + coordinator assignment, tagged scope, timeline baseline, handover mails. S9.3 Milestone seeding from templates. Verify: one action produces ledger + handover + milestones; pool routing correct.

## B10, Delivery integration and closure

S10.1 Apps Script bridge: TF07/TF22/TF08 submission handlers push event rows to BridgeEvents via Graph (snippet-style additions to the legacy services; test via /dev deployment; new deployment version published). S10.2 Events Function consumes BridgeEvents: TF07/TF22 → ExpenseLedger + Accounts mail; TF08 → closure task. S10.3 BD03b closure screen: AAR (four questions, mandatory), lessons → LearningRegister, Win/Loss, FNF + certificate, Closed. Verify: full lifecycle on test data with the bridge live. Quiz 7.

## B11, Trackers, dashboards, MIS

S11.1 Pipeline board from PipelineStages (data-driven columns). S11.2 Role-shaped KPI rows. S11.3 Search (P-Code exact-jump + grouped matches). S11.4 MIS roll-up Function (Net Perfact Revenue, margin, velocity, ageing) + `/mis` view + export on the fortnightly cycle. S11.5 iPad + accessibility passes per Design.md §8. Verify: the ten-second Nipun test. Quiz 8.

## B12, UAT, migration, cutover

S12.1 UAT cohort scripts and defect cycle. S12.2 Production site provisioned by the same scripts; masters finalised. S12.3 Historical migration per gated scope [K] (Won-first if partial), into Archives with DocumentControl rows. S12.4 Pilot: new leads in the app, legacy read-available. S12.5 Cutover note [K approval], legacy BD forms read-only, bridge remains for TF events until those families migrate. S12.6 Handbook chapter distilled from Memory.md; second-maintainer walkthrough; final teach-back exam.

## B13, AI-assist pilot (gated)

S13.1 Provider + budget decision [K, COO+CSO]; data-handling sign-off. S13.2 Pilot node 1: lead-intake parsing to a pre-filled BD01a draft (human confirms before minting). S13.3 Pilot node 2: proposal drafting against templates with RateCard floor and Benchmark ceiling as hard bounds. S13.4 Review against guardrails; extend node by node only on evidence.

Draft, requires approval by Kushal Bhargava before issue.
