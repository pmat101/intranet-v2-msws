# PRD.md, Perfact BD Pipeline App (IMS Module 1, Tier 3 execution vehicle)

| Control  | Value                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Document | PG/BD/IT-PRD-001 (numbering to be confirmed under PG/IMS/BP-002 §2.4)                                                                                        |
| Revision | v0.2, 19 July 2026. Supersedes v0.1 (16 July 2026)                                                                                                           |
| Owner    | Pranav Mathur (IT)                                                                                                                                           |
| Approver | Kushal Bhargava (CSO). Strategy items: Dr. Nipun Bhargava (COO)                                                                                              |
| Basis    | PG/IMS/BP-002 Rev C (IMS Blueprint v2) · PG/IMS/BD/T3-NOTE-001 (Tier 3 BD Forms Design) · Perfact Design Language v3.0 · migration work breakdown (Jul 2026) |

**Change log v0.1 → v0.2:** scope reframed from "replace four BD forms" to "build the Tier 3 forms-led estate for IMS Module 1" per Kushal's blueprint and Tier 3 note. Six-stage pipeline with clocks adopted as canonical (stages held as master data pending CSO ratification of the 8-stage variant). Decision-grade capture, twin commercial gates, financial decomposition, Group/Customer/Contact identity registers, expense ledger, document control and the AI-assist roadmap added. Corporate design language v3.0 adopted for the UI.

## 1. Context

Perfact is building its Integrated Management System one module at a time; Business Development is Module 1. Tier 1 carries strategy and governance, Tier 2 the Handbook with all procedures, and Tier 3 the forms, trackers, registers, reference masters, dashboards, templates and archives that people actually use at the point of work. Tier 3 is built first, forms first. This app is the execution vehicle for Tier 3: the screens, data layer, workflow automation and MIS that make the designed estate real on the Microsoft 365 stack the company already licenses.

The governing principle from the blueprint is binding: **the system is not to be rebuilt; it is to be finished.** The four-form intake, the single admin@perfactgroup.in intake behaviour, the auto-generated P-Code, the confirmation mail flow and the fortnightly MIS to the Chairman and External Affairs Council all continue. What changes is that the forms enforce decision-grade capture instead of permitting blind submission.

## 2. Problem statement

The live evidence (PG/BD/SYS/GAP-001, FY27 exports) shows a 100 per cent adopted intake feeding an 8 per cent complete cost engine: 1,557 leads, 526 proposals, 1,508 allocation rows, every proposal P-Coded, yet margin filled on 5 per cent of records, base cost on 13 per cent, manpower cost on 8 per cent, and no pipeline stage, duration or velocity anywhere. Mid-funnel is invisible (status is binary Won/Query/Sent/Lost), stale proposals die silently, approvals run on a hand-built email-token system, and nothing is editable after submission. Management knows what was quoted, not what it cost, where it is stuck, or whether it was worth doing.

## 3. Goals

1. **Decision-grade capture.** Computed cost, margin, project duration and pipeline stage are mandatory and computed at the point of proposal finalisation; a form cannot be submitted in a state that blinds the MIS. Target: margin visibility moves from 5 per cent toward 100 per cent on all new proposals.
2. **The six-stage pipeline with clocks.** Lead Identified (same day), Qualification (7 days), Proposal Sent (7 days), Negotiation (15-day stall flag), Won & Onboarded (5 days), Delivered & Closed (per milestone), with terminal Lost (mandatory reason) reachable from stages 2 to 4. Stages live in a management-controlled master so the CSO's final ratification (6 vs 8 stages, PS/PR variants) is a data change, not a rebuild.
3. **The SIPOC chain.** Every step is document in → action under a named task code → form out. No orphan steps; every form's output is the next form's trigger; the whole chain auditable as NABET requires.
4. **One identity spine.** The P-Code (Entity + FY + State + Serial + Scope + Sector + Specification) is generated once at lead capture and never re-minted; Group, Customer and Contact IDs are minted alongside it; the Client/Group master gives one canonical record per corporate group so group numbers compute instead of being keyed twice.
5. **Native approvals and the standing escalation rules.** Outlook approvals replace token mails. The four Tier 1 escalation rules are enforced in the workflow: every fee quote or concession is approved by the CSO; any proposal pending beyond fifteen days is flagged; any project below the margin floor (15 to 30 per cent gross) or below ₹1.5 lakh/month velocity is escalated before acceptance; government tenders prior to public notice are escalated and never circulated in shared working material.
6. **Registers, masters and document control.** Authoritative registers as the system of record; management-controlled reference masters (Decoder, Rate Card, Sector Benchmark, Tag taxonomy, Pipeline Stages); PG/BD/CLASS-serial numbering with revision headers; a Master List of Forms and of Record Formats; archives retained, never deleted (NABET B2, ISO 7.5).
7. **Dashboards and the MIS.** Live trackers per stage with days-in-stage flags; the fortnightly MIS upgraded to read Net Perfact Revenue, margin and revenue velocity, reporting up to the Tier 1 scorecard.
8. **AI-ready by design, AI-assisted by phase.** Clean triggers, structured fields and defined outputs now; the assist nodes from the Tier 3 note (lead parsing, proposal package assembly, price recommendation between rate-card floor and benchmark ceiling, negotiation memory, pipeline hygiene, AAR synthesis) built as a gated later phase under the fixed guardrails.
9. **Zero additional recurring cost.** Free and consumption tiers plus existing licences only; ₹500/month Azure cost alert stays armed.

## 4. Non-goals

The Tier 2 Handbook and its SOPs, the Tier 1 scorecard and four-axis portfolio, and the future Tier 0 IMS Manual are separate deliverables this app feeds but does not build. The quote engine is a separate document designed later; this app only computes over the cost stack BD02 already carries. EHS aspect/HIRA capture is deliberately out of Tier 3. Other IMS modules, a client-facing portal, payment collection, and Tally or GreytHR integration remain out of scope. The wider TF/ADM/ACC/FQ form migration continues as its own workstream on the shared platform.

## 5. Users and roles

| Role               | Who                                                                           | In the app                                                                                   |
| ------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Account owner (BD) | BD team                                                                       | Creates leads, owns the relationship, files proposals and negotiation rounds, marks Won/Lost |
| LU team            | Land-use reviewers                                                            | Qualification: environmental-sensitivity review                                              |
| Technical Lead     | Per sector                                                                    | Qualification: strategy review; owns technical scope                                         |
| CSO                | Kushal                                                                        | Approves every quote and concession; ratifies masters                                        |
| COO                | Dr. Nipun                                                                     | Strategy decisions; management review                                                        |
| MIS consumers      | Chairman, External Affairs Council                                            | Fortnightly MIS, read-only                                                                   |
| Governing Council  | Apex                                                                          | Owns the Tier 3 schema and masters                                                           |
| Operations Council | Delivery leadership                                                           | Owns project learning (AAR outputs)                                                          |
| Accounts           | Accounts team                                                                 | Commercials support, billing start on WO/SO, expense ledger, closure FNF                     |
| Delivery pools     | Glacier, Reservoir, Fountain, Ocean, Pool, Pond, Tributary + EIA coordinators | Receive handover; delivery-side triggers (TF07/TF22/TF08)                                    |
| Admin (IT)         | Pranav + second maintainer                                                    | Platform, users, document control, audit                                                     |

## 6. The form set and the pipeline

Canonical set per the Tier 3 note, with legacy cross-reference (numbering reconciliation between T3-NOTE-001 and BP-002 §3.3, BD03a/BD03b vs BD04/BD05, is a flagged decision; codes are held in the FormMapping master):

| Form                              | Trigger                                                                        | Fills (output)                                                                          | Hands off to                 | Legacy                        |
| --------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------- |
| BD01a Lead Captured               | New enquiry, EAC minute, referral                                              | Lead details; mints Group/Customer/Contact IDs and the P-Code                           | Fires qualification reviews  | BD01 (27 fields, 1,557 rec)   |
| BD01b Proposal Sent               | Reviews cleared                                                                | First proposal; each negotiation round versioned with delta value, scope change, reason | The cost form                | new (design intent in BP-002) |
| BD02a/b Final Project Commercials | Scope agreed (a: BD review and WO chasing; b: Accounts billing start on WO/SO) | Cost stack → base cost → quote → margin → velocity; opens the P-Code expense ledger     | Scope baseline on win        | BD02 (47 fields, 526 rec)     |
| BD02c Project Billing             | TF07 / TF22 bill raised                                                        | Updates the P-Code expense ledger                                                       | Accounts                     | new                           |
| BD03a Technical Handover          | Win                                                                            | Tagged scope document; fixed delivery-timeline baseline; routes to delivery pool        | Delivery team                | BD04 (52 fields, 1,508 rec)   |
| BD03b Closure                     | TF08 project completion received                                               | Completion filed; account owner runs the after-action review, lessons logged            | Tier 1 review, re-engagement | new (BD05 in BP-002)          |

Stages and clocks are as in Goal 2. Note that the live BD03 is the technical handover form, not the binary tracker the Tier 3 note describes; the tracker exists only as a status column and is replaced by pipeline views over the registers. The full live-to-target field mapping is in BDWorkflow.md and the accompanying field map deck.

## 7. Functional requirements by stage

**Stage 1, Lead Identified.** BD01a captures the lead with contact name, phone and email as separate searchable fields; the app mints the P-Code (index-seeded serial, permanent continuity, FY identifier stays) plus Group, Customer and Contact IDs, deduplicating against the Group master (one canonical record per corporate group; the live data shows the same group under several spellings). Identity fields lock after creation. Output fires the qualification reviews the same day.

**Stage 2, Qualification.** The LU sensitivity review and the Technical Lead strategy review run as Outlook approvals with remarks; conflicts are flagged. Exit only when all reviews clear or flags resolve, seven-day clock. Lost is reachable with a mandatory reason.

**Stage 3, Proposal Sent.** BD01b assembles the defined-sequence proposal package (regulatory roadmap PPT, commercial proposal, cover note, scope-timeline chart, sector credential deck) from templates. BD02a records the decomposed financials: gross fee, PR lab, PS compliance, liaison, sub-contractor, resolving to Net Perfact Revenue; base cost and manpower cost mandatory; PBL and PBL10 quote fields carried as in the live form (definitions per the Decoder and Handbook, [VERIFY BEFORE SUBMISSION]); margin and Revenue/Month velocity computed and mandatory; project duration mandatory. The twin gates evaluate before the CSO approval: gross margin inside 15 to 30 per cent and velocity at or above ₹1.5 lakh/month, with below-floor cases escalated before acceptance. CSO approval releases the package to the client. Seven-day clock.

**Stage 4, Negotiation.** Each round is a versioned record with client offer, our requote, delta value, scope change and reason; every concession returns to the CSO gate; a fifteen-day stall flag surfaces silent proposals. Client acceptance (WO, email or verbal, recorded) exits the stage.

**Stage 5, Won & Onboarded.** BD02b starts billing on WO/SO; the expense ledger opens against the P-Code; BD03a hands the tagged scope and the fixed timeline baseline to the assigned delivery pool and EIA coordinator; billing milestones seed from templates. Five-day clock to handover.

**Stage 6, Delivered & Closed.** BD02c updates the expense ledger on each TF07/TF22 bill-raised event; TF08 completion triggers BD03b; the account owner files the four-question after-action review; lessons write to the learning register for the Operations Council; Win/Loss register updated; FNF and certificate close the record.

## 8. Cross-cutting requirements

Days-in-stage clocks run against the Pipeline Stages master; every submission, approval, edit and stage transition writes to the activity log with verified identity; every controlled document (form definitions, masters, templates) carries number, revision, date, owner and approver, is listed in the Master Lists, and retires to Archives rather than deletion. Search spans P-Code, Group, Customer, Contact, proposal and project name. The fortnightly MIS reads Net Perfact Revenue, margin, velocity and stage ageing from the registers. Government tenders prior to public notice are RESTRICTED: escalation path only, never in shared working material, never in this app's shared lists.

## 9. Data migration

Reference masters seed from the Decoder, rate card, benchmark and taxonomy sources Kushal and Nipun provide. The historical roughly 500-row master carries no P-Code and is handled under Archives per the gated COO decision: fresh start, Won-only, or full back-catalogue. Live legacy BD data continues through Apps Script until cutover; delivery-side TF07/TF22/TF08 events bridge from Apps Script via a Graph push during the parallel run.

## 10. Constraints

Business Basic and Standard licences only: Power Automate standard connectors, no premium; Azure free and consumption tiers with the ₹500/month alert; the team is Pranav plus limited support, and the build doubles as the migration curriculum. The AI-assist phase is gated on a provider and budget decision (Copilot licences, Azure OpenAI, or the Anthropic API all carry cost) and on the fixed guardrails: AI drafts and computes, a named human reviews and approves; NABET core EIA judgement and functional-area-expert work are never outsourced to it; the CSO quote gate and standing escalations stay exactly where they are.

## 11. Success criteria

A lead entered at BD01a is traceable to closure without any legacy BD form; every new proposal carries computed cost, margin, duration and velocity (blind submission impossible); the CSO approves quotes from Outlook with recorded identity and remarks; stalled proposals surface automatically at fifteen days; the fortnightly MIS reads margin and velocity live; a below-floor project cannot be accepted without a recorded escalation; role separation holds under test; the Azure bill stays at ₹0.

## 12. Decisions that gate the build

| # | Decision | Owner | Status |
|---|---|---|---|
| 1 | Cost and margin mandatory on BD02 | COO | Open. Blocks the B6 commercial phase |
| 2 | P-Code standard across PE, PS, PR and Group | COO + CSO | **Resolved 4 Aug 2026.** One P-Code per project, entity encoded as its first segment; cross-entity work for one client is separate projects joined by GroupID and CustomerID |
| 3 | Pipeline stage list ratified, six canonical against the eight-stage funnel | CSO | Open. Held as master data so it is a data edit |
| 4 | Form tool, custom screens against Microsoft Forms | COO + IT | **Resolved 4 Aug 2026.** Custom screens, on the reasoning in Architecture section 2 |
| 5 | Historical migration scope, fresh, Won-only or full | COO | Open |
| 6 | Form numbering reconciliation | CSO | Open, narrowed. The live estate is BD00, BD01A, BD01B, BD02, BD03, BD04, BD05; the Tier 3 note and the blueprint each use a different scheme. FormMapping is the single translation point |
| 7 | AI provider and budget | COO + CSO | Open, B13 only |
| 8 | Service mailbox, identity-field edit rights, PDF route | Kushal | Open. Azure billing resolved as an interim arrangement, see decision 13 |
| 9 | What PBL2, PBL3 and PBL10 denote | CSO | **New.** The labels give the meaning, minimum, first and final quote, but not the numbering rationale the gates need |
| 10 | Storage unit, lakhs against rupees | CSO, IT recommends | **Resolved 20 August 2026.** Stored as integer paise, displayed as lakh and crore, converted once at migration. Taken as an IT call, noted to the CSO |
| 11 | Delivery pool list | COO | **New.** Seven pools confirmed by IT; the Tier 3 note lists Glacier where the live list has Spring |
| 12 | Perfact entities | Accounts + CSO | **New.** Dropdowns carry PE, PS, PR, PW while BD02's GST treatment list implies a fifth, PAWSPL, absent from the P-Code vocabulary |
| 13 | Azure billing instrument | Kushal + Accounts | **New.** Running on a personal instrument as a recorded interim measure; correction due before live BD data, backstop 30 September 2026 |
| 14 | Are BD00, BD01B, BD04 and BD05 live at all | IT to verify | **New.** All four are linked from the intranet directory but have no Apps Script page or handler; only Zoho originals exist |
| 15 | How sibling projects are linked for Accounts | COO + Accounts | **New.** BD04 lets Accounts type PR and PS P-Codes by hand; under decision 2 the link should come from GroupID and CustomerID, or an explicit LinkedPCode field is needed |

Draft, requires approval by Kushal Bhargava before issue.
