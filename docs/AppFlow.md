# AppFlow.md, Features and Navigation Logic

| Control | PG/BD/IT-FLW-001 · v1.0 · 19 July 2026 |
| ------- | -------------------------------------- |

How a user moves through the BD Pipeline App, screen by screen and what each screen does. The SIPOC chain (trigger → format → output) governs every flow; nothing here creates an orphan step.

## 1. Navigation map

Left rail (role-filtered), top to bottom: **Dashboard · Pipeline · Projects · Approvals · Billing · Registers · Masters · MIS · Archives**. Global header: P-Code/name search, the signed-in identity chip, help. Routes:

| Route               | Screen                                                     | Visible to                                 |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `/`                 | Dashboard                                                  | all app roles (content shaped by role)     |
| `/pipeline`         | Stage board + tracker table                                | BD, management, Admin                      |
| `/projects/{pcode}` | Project page (ribbon + stage panels)                       | role-shaped                                |
| `/leads/new`        | BD01a Lead Captured                                        | BD, Admin                                  |
| `/approvals`        | My pending approvals (deep links to Outlook items)         | reviewers, CSO                             |
| `/billing`          | Milestones, ledger, overdue                                | Accounts, management                       |
| `/registers`        | Register browser (read; export)                            | management, Admin; Accounts for theirs     |
| `/masters`          | Reference masters under document control                   | Admin executes; Governing Council approves |
| `/mis`              | Fortnightly MIS view + export                              | CSO, COO, MIS consumers                    |
| `/archives`         | Retired documents, superseded versions, pre-P-Code history | management, Admin                          |

Role × section matrix is enforced twice: rail rendering (courtesy) and Function-side shaping (law).

## 2. The spine screen: `/projects/{pcode}`

Header: stage ribbon (stops from PipelineStages master; current stop shows "Pending with" + days-in-stage; stall and below-floor add the danger dot). Below, stage panels in order, each panel a SIPOC unit showing its trigger record, its form (or read-only record once filled), and its output actions with timestamps and verified identities. Current stage expanded; earlier stages collapse to summary rows with role-gated Edit; future stages render as locked outlines with their trigger stated ("Opens when all qualification reviews clear"). A right column carries the identity block (P-Code anatomy, Group/Customer/Contact links), the activity log tail, and files (package versions, WO/SO).

## 3. Stage flows (trigger → screen → output)

**Lead (BD01a).** Trigger: enquiry, EAC minute or referral arrives. `/leads/new`: account owner enters lead + separate contact name/phone/email; live dedupe suggests existing Group/Customer/Contact matches before minting; on create the app mints P-Code + IDs, locks identity fields, sends the admin@ confirmation, fires the qualification reviews, and lands on `/projects/{pcode}` with Stage 1 complete the same day.

**Qualification.** Trigger: BD01a output. LU and Technical Lead each receive an Outlook approval (remarks mandatory on Needs-info/Reject); the panel shows each review's state live; conflicts flag to management. All-clear auto-advances to Stage 3 and notifies the account owner. Lost is available here to Stage 4 with a mandatory reason, writing WinLossRegister.

**Proposal (BD01b + BD02a).** Trigger: reviews cleared. Two tabs on the stage panel: _Package_, assemble the five-document sequence from templates, preview, version; _Commercials_, the decomposed cost stack with computed Net Perfact Revenue, margin and velocity shown read-only as they compute, duration mandatory. "Send for CSO approval" runs the twin gates first: pass → CSO Outlook approval with package + figures; below-floor → escalation path screen (reason, recorded acknowledgement) before the CSO sees it. CSO approval releases the client mail with the package; the panel records sent date and starts the seven-day clock.

**Negotiation.** Trigger: client response or the stall sweep. "Record round" captures client offer, our requote, delta value (computed), scope change, reason; each concession re-enters the CSO gate; rounds list as versions with their outcomes. Acceptance capture (WO/email/verbal + reference) exits to Stage 5. The fifteen-day stall flag surfaces on the board, the ribbon and the owner's dashboard.

**Won & Onboarded (BD02b + BD03a).** Trigger: acceptance. Billing-start records WO/SO and opens the ExpenseLedger; handover assigns the delivery pool and EIA coordinator, attaches the tagged scope and fixes the timeline baseline; milestones seed from templates for edit; handover mails go to the pool and Accounts. Five-day clock to completion of both actions.

**Delivered & Closed (BD02c + BD03b).** Triggers arrive from delivery: TF07/TF22 bill-raised events append ledger entries and notify Accounts; TF08 completion opens the closure panel: four-question AAR (mandatory), lessons to the learning register, Win/Loss entry, FNF and certificate recorded, project flips Closed. Re-engagement note routes to Tier 1 review.

## 4. Dashboard logic

KPI row by role: account owner sees _my_ active, awaiting-my-action, stalled; CSO sees awaiting-CSO, below-floor escalations, fortnight's approvals; Accounts sees billing due, overdue payments; COO sees the funnel and ageing. Below: stage board (columns from the stages master, cards showing P-Code, client, value, days-in-stage, owner) and the tracker table (sortable, exportable). Every card and row deep-links to the project page.

## 5. Approvals screen

A convenience mirror of Outlook: pending items with context (figures, gate results, remarks history) and a link to act in Outlook; decisions themselves happen through the Approvals connector so identity and remarks are recorded by the platform, not by us. Nothing in the app can approve on someone's behalf.

## 6. Masters and document control (`/masters`)

Each master (Decoder, RateCard, SectorBenchmark, TagTaxonomy, PipelineStages, FormMapping, DeliveryPools, PGEntities, MilestoneTemplates, UsersRoles, Settings) shows its control header (number, revision, owner, approver), current values, and a change-request action: Admin drafts the change, the Governing Council approver confirms (Outlook approval), the revision increments, the prior state archives. No inline free editing, ever.

## 7. Search

One box: exact P-Code jumps straight to the project; otherwise matches across Group/Customer/Contact names, proposal and project names, WO/SO numbers, returning grouped results (Projects, Groups, Contacts). Recent items per user shown before typing.

## 8. States and behaviour

Loading: skeleton rows, never spinners in tables; buttons show inline progress text. Empty states instruct with the trigger ("No proposals awaiting the CSO. Items appear here when commercials pass the gates."). Errors say what happened and the next step, never blame, never apologise theatrically. Every mutation confirms inline and appends visibly to the activity tail. Offline/failed fetch: retry affordance, unsaved form state preserved in memory. All flows keyboard-completable; iPad layouts verified per phase.

## 9. Notification map (summary)

| Event                              | Channel                                        | To                                       |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Lead created                       | admin@ confirmation mail (preserved behaviour) | admin@, account owner                    |
| Reviews fired / cleared / conflict | Outlook approval + mail                        | LU, Technical Lead; owner on outcome     |
| Gates: below-floor                 | Escalation mail + dashboard flag               | CSO, COO, owner                          |
| CSO decision                       | Approval outcome + mail                        | Owner; client mail on approve            |
| Stall (15 days) / clock breach     | Mail + board flag                              | Owner; CSO on repeat                     |
| Won / handover                     | Handover mails                                 | Delivery pool, EIA coordinator, Accounts |
| Bill raised (TF07/TF22)            | Ledger entry + mail                            | Accounts                                 |
| Completion (TF08)                  | Closure task                                   | Owner, Ops Council on lessons            |
