# Phases.md, BD Pipeline Build Plan

| Control | PG/BD/IT-PHS-001 · v0.2 · 19 July 2026 |
| ------- | -------------------------------------- |

**Change log v0.1 → v0.2:** restructured around the IMS Tier 3 specification. The Tier A discipline intent (mandatory computed cost, margin, duration; days-in-stage flag) is embedded in phases B5 and B10 rather than patched onto legacy forms, since the legacy BD forms are being replaced by this app. Phases are prefixed B (BD app) to avoid colliding with the whole-intranet migration work-breakdown numbering, where this project is Phase 8. Durations assume learning pace alongside routine IT work; each phase closes on exit criteria, quiz, and same-day Memory.md notes.

**Already in hand (from the migration groundwork):** Git and repo, legacy snapshot, Entra app registration with Sites.Selected and Mail.Send consented, client secret stored with rotation reminder, SWA CLI and Functions Core Tools installed, app scaffold. **Still blocking:** Azure subscription card (Kushal), service mailbox decision.

## B0, Foundations close-out (2 to 3 days)

Azure subscription + ₹500/month alert; SWA (Free) resource wired to the repo, hello page and `/api/health` deploying on push; `bd-pipeline-dev` SharePoint site; the nine project documents committed under `docs/`.
Exit: push deploys; health returns ok; cost alert test received.

## B1, Authentication end to end (4 to 6 days)

MSAL sign-in, `api.js` wrapper, `lib/auth.js` JWT validation, `/api/whoami` with role from a stub UsersRoles. Negative tests: outside account refused at Microsoft, expired and tampered tokens rejected.
Learning: auth-code + PKCE, JWT anatomy, why single-tenant is the ₹0 tenant lock. Quiz 1.

## B2, The Tier 3 estate provisioned (6 to 8 days)

Provisioning scripts create every register, master and the DocumentControl list idempotently per BackendSchema.md; P-Code, Stage and ID columns indexed; permission partition applied and verified with a low-privilege account; masters seeded: PipelineStages (six canonical stages + clocks, pending CSO ratification as a data edit), FormMapping, PGEntities, DeliveryPools, UsersRoles, Settings; Decoder, RateCard, SectorBenchmark, TagTaxonomy seeded from management content as received (owners: Kushal/Nipun).
Learning: Graph list APIs, Sites.Selected, idempotent provisioning, internal vs display names. Quiz 2.

## B3, Identity spine (5 to 7 days)

`lib/ids.js`: P-Code generation ported byte-faithfully from the legacy service (clash guard, serial continuity, FY handling) and validated against known historical outputs; Group/Customer/Contact ID minting with dedupe against GroupMaster (format per Decoder, [VERIFY] with Kushal); ActivityLog wired.
Exit: historical inputs reproduce their exact live P-Codes; duplicate group spellings resolve to one canonical GroupID. Quiz 3.

## B4, Stage 1: BD01a Lead Captured (5 to 6 days)

Lead form screen (contact name/phone/email as separate searchable fields), IDs minted on create, identity lock server-side, admin@ confirmation mail preserved, qualification reviews fired same day, pipeline tracker stub showing stage chips.
Exit: a test lead mints all four IDs, locks identity, fires reviews, and appears on the tracker.

## B5, Stage 2: Qualification approvals (5 to 7 days)

Flow: LU sensitivity + Technical Lead strategy reviews as Outlook approvals (everyone must approve), remarks written back; conflicts flag; all-clear advances the stage via Graph change notification (no premium HTTP); Lost path with mandatory reason; seven-day clock live.
Milestone demo to Kushal and Nipun. Quiz 4.

## B6, Stage 3a: Commercials and the gates (7 to 9 days)

BD02a screen with the decomposed financial stack (gross fee, PR lab, PS compliance, liaison, sub-contractor → Net Perfact Revenue); base cost, manpower, duration mandatory; margin and Revenue/Month computed server-side; twin gates (15 to 30 per cent margin; ₹1.5 lakh/month velocity) evaluated before the CSO approval flow, below-floor cases routed to escalation; en-IN money formatting throughout.
Exit: blind submission impossible; a below-floor test case cannot pass without recorded escalation; CSO approves from Outlook. Quiz 5.

## B7, Stage 3b: The proposal package (6 to 8 days)

Template library under document control; Function assembles the defined-sequence package (roadmap PPT, commercial proposal, cover note, scope-timeline chart, credential deck) from templates and scope data; PDF route resolved here [VERIFY BEFORE SUBMISSION]; CSO-approved package mailed to the client contact via Graph; seven-day clock.
Exit: one click produces the sequenced package with correct branding per Design.md.

## B8, Stage 4: Negotiation rounds (4 to 6 days)

Versioned rounds (client offer, requote, delta value, scope change, reason) in ProposalVersionRegister; every concession re-enters the CSO gate; fifteen-day stall flag from the clock sweep; acceptance capture (WO/email/verbal).
Exit: a three-round test negotiation shows full version history and gate decisions. Quiz 6.

## B9, Stage 5: Won and onboarded (5 to 6 days)

BD02b billing start on WO/SO; ExpenseLedger opens on the P-Code; BD03a handover with tagged scope and fixed timeline baseline to the assigned delivery pool and EIA coordinator; milestones seed from templates; five-day clock.
Exit: Won produces handover, ledger and milestones in one action; pool routing correct.

## B10, Stage 6: Delivery integration and closure (6 to 8 days)

Apps Script bridge: TF07/TF22/TF08 submissions push event rows via Graph; BD02c updates the ledger on bill-raised events; TF08 triggers BD03b closure with the four-question AAR; lessons write to the learning register for the Operations Council; WinLossRegister updated; FNF and certificate close the record.
Exit: full lifecycle, lead to closed, runs on test data with the bridge live. Quiz 7.

## B11, Trackers, dashboards, MIS (6 to 8 days)

Pipeline board by stage with days-in-stage flags; lead/task tracker views; search across P-Code, Group, Customer, Contact, names; the fortnightly MIS roll-up reading Net Perfact Revenue, margin, velocity and stage ageing; iPad passes; accessibility floor per Design.md.
Exit: Nipun answers "where is it stuck and is it worth doing" in under ten seconds. Quiz 8.

## B12, UAT, migration, cutover, handbook (about 2 weeks elapsed)

UAT cohort (BD, LU, Technical Lead, Accounts, CSO); production site provisioned by the same scripts; masters finalised; historical migration per the gated COO decision (Won-first if partial); pilot with new leads; Kushal-approved cutover note; legacy BD forms to read-only; Memory.md distilled into the handover handbook chapter; final teach-back exam.

## B13, AI-assist pilot (gated; sized after the provider decision)

Per T3-NOTE-001 §7 and Recommendation 6: pilot on the highest-volume nodes first, lead intake parsing and proposal drafting, under the §4 guardrails in Rules.md; extend node by node only after the human-in-the-loop pattern proves out.

Rough core total (B0 to B12): 12 to 14 working weeks at learning pace.

Draft, requires approval by Kushal Bhargava before issue.
