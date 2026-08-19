# BackendSchema.md, Data Model, Storage and Auth Flow

| Control | PG/BD/IT-SCH-001 · v1.0 · 19 July 2026 |
| ------- | -------------------------------------- |

Authoritative reference for every SharePoint List, column, relationship and the authentication flow. Provisioning scripts implement exactly this document; drift between script and document is a defect.

## 1. Conventions

Lists and columns PascalCase; internal names fixed at creation (the display-vs-internal-name Graph gotcha is avoided by never renaming after creation). Keys are text columns holding minted IDs, indexed; relationships ride on those keys, enforced by the Functions layer, not by SharePoint lookups (portability, simpler Graph queries). Timestamps ISO 8601 UTC; display formatting is the frontend's job. Money: every live form captures amounts **in lakhs**. This document specifies storage in decimal rupees with the UI rendering lakh and crore, because whole rupees keep arithmetic exact and put formatting in one place, but that requires converting historical values at migration. The unit decision is open [VERIFY with CSO] and must be settled before B2 provisioning, since it fixes the column type. Every register row carries the audit tail columns `CreatedByEmail, CreatedAtIso, ModifiedByEmail, ModifiedAtIso` written by Functions from the verified token, independent of SharePoint's own metadata. Deletion is forbidden on registers and masters: rows carry `Status` and archives, never hard deletes.

## 2. Identity keys

| ID                               | Format                                                                                                     | Minted at         | Rule                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P-Code                           | `Entity + FY(2) + Serial`, for example `PE273853`                                                          | BD01A             | One P-Code per project. The Perfact entity is the first segment, so PE, PR and PS work for one client are separate projects with their own P-Codes, related through GroupID and CustomerID. Index-seeded serial, permanent continuity, never re-minted.                                                      |
| ProposalID                       | `Entity + FY(2) + State(3) + Serial + WorkType(3) + Sector(3) + Spec(3)`, for example `PE27JH3853ECR1AGPL` | BD01A             | Shares the P-Code's serial. This is the long composite string that PG/IMS/BP-002 calls the P-Code; the two are distinct and both are needed. Note that Sector feeds this string but is not mandatory on the live form, so historical values may carry a blank segment which the golden tests must reproduce. |
| GroupID / CustomerID / ContactID | Per Decoder [VERIFY exact formats with Kushal before B3]                                                   | BD01A with dedupe | One canonical Group per corporate group; aliases resolve to it. Group numbers compute through the shared identifiers, never keyed twice.                                                                                                                                                                     |
| RoundNo, TermID, EntryID, LogID  | Simple prefixed serials                                                                                    | On create         | Idempotent minting; clash guard                                                                                                                                                                                                                                                                              |

**Correction, 4 August 2026.** Revision 1.0 of this document described the P-Code using the ProposalID's anatomy, taken from the blueprint. Reading `Code.js` directly showed `genProposalIDnPCODE` mints both strings from one serial, with the short form as the P-Code. Every register keys on the P-Code, so building to the previous definition would have corrupted all downstream joins.

## 3. Registers (system of record)

**GroupMaster** `GroupID*, CanonicalName, AliasNames (multi), Sector, Tier, Notes, Status`, one row per corporate group; alias list is how duplicate spellings resolve.
**CustomerRegister** `CustomerID*, GroupID*, LegalName, PGEntity, GSTStateCode, Address, Status`.
**ContactRegister** `ContactID*, CustomerID*, Name, Designation, Email, Phone, IsPrimary, StartDate, EndDate, Notes`, name/phone/email separate and searchable per the BD01 enhancement.
**ProjectRegister** `PCode*, ProposalID, ProjectName, Nickname, GroupID, CustomerID, PrimaryContactID, PGEntity, LeadDate, LeadSource, StateCode, Sector, Scope, Specification, TypeOfWork, Service, OwnerEmail, Stage, StageEnteredAtIso, Status (Active/OnHold/Lost/Closed), LostReason, FilesFolderUrl` + audit tail. Identity fields lock post-create (server-enforced; edit rights per gated decision).
**QualificationReviews** `ReviewID*, PCode*, ReviewerEmail, ReviewType (LU/TechLead), Decision (Clear/NeedsInfo/Conflict), Remarks, DecidedAtIso`.
**ProposalRegister** carries two complementary decompositions, a revenue side from the blueprint and a cost side from the live BD02 form. Both are required to compute margin honestly.
`ProposalRecID*, PCode*, Version,`
_revenue side (BP-002):_ `GrossFee, PRLab, PSCompliance, Liaison, SubContractor, NetPerfactRevenue (computed),`
_cost side (live BD02 stack, all in the stored unit):_ `OverheadCosts, TestingCharges, AdminExpenses, ManpowerCosts, OutsourcingCosts, Commissions, OutsourcedManpower, SecondaryDataCosts, ContingencyCosts, SiteVisitCosts,`
_quote ladder:_ `PBL (base level cost, computed as the sum of the cost stack), PBL2Minimum (minimum acceptable quote, the floor), PBL3First (opening quote), PBL10Final (agreed quote),`
_derived and gates:_ `MarginPct (computed), DurationMonths, VelocityPerMonth (computed), GateMarginResult, GateVelocityResult, EscalationRef,`
_approval and despatch:_ `CSODecision, CSORemarks, CSODecidedAtIso, PackageFolderUrl, SentToClientAtIso, ProposalTrendsSummaryLink, WorkOrderLink, SalesOrderLink, CostComputerLink, FinalProposalLink, GSTTreatment, PRR, PRB, PRMode, TravellingExpensesInScope, Status`, PBL/PBL10 semantics per Decoder/Handbook [VERIFY BEFORE SUBMISSION]; computed fields written only by `lib/gates.js`.
**ProposalVersionRegister** (negotiation rounds) `RoundID*, PCode*, ProposalRecID*, RoundNo (hard cap = Settings.MaxNegotiationRounds, default 3; a fourth is blocked), ClientOffer, OurRequote, DeltaValue (computed), ScopeChange, Reason, CSODecision, CSORemarks, Outcome, RecordedAtIso`.
**AcceptanceRegister** `PCode*, Mode (WO/Email/Verbal), ReferenceNo, WONumber, SONumber, AcceptanceDateIso, RecordedBy`.
**ExpenseLedger** `EntryID*, PCode*, Source (BD02-open/TF07/TF22/Manual), EntryType, InvoiceNo, InvoiceDateIso, Amount, MilestoneRef, SentAtIso, PaidAtIso, Notes`, opened at billing start and appended by delivery events. The live BD04 form records only three counters per entity (total, sent, paid) with no invoice number, date or amount, which is precisely why no receivables position can be derived today. WorkOrderValue and WorkOrderValidity sit on the ProjectRegister; AmountReceived and OutstandingAmount are computed from these rows and never typed.
**HandoverRegister** `HandoverID*, PCode*, DeliveryPool, EIACoordinatorEmail, TeamEmails, ScopeDocUrl, TagSet, TimelineBaselineUrl, StartDateIso, HandoverAtIso`.
**BillingMilestones** `TermID*, PCode*, MilestoneName, Sequence, Percent, PlannedDateIso, AchievedDateIso, InvoiceNo, InvoiceDateIso, InvoiceAmount, PaymentDueIso, PaymentReceivedIso, Status, Notes`.
**MilestoneAchievements** `AchievementID*, PCode*, TermID*, Source (TF07/TF22 bridge), AchievedDateIso, EvidenceUrl, Remarks, SubmittedBy` (absorbs TF07 on cutover).
**ClosureRegister** `ClosureID*, PCode*, TF08Ref, AARQ1..AARQ4, Lessons, FinalInvoiceNo, FNFAmount, FNFDateIso, CertificateUrl, ClosedBy, ClosedAtIso`.
**WinLossRegister** `PCode*, Outcome (Won/Lost), StageAtOutcome, Reason, Value, MarginPct, VelocityPerMonth, DecidedAtIso`, the analytics feed.
**LearningRegister** `LessonID*, PCode*, Lesson, TaskCode, OwnerCouncil (Ops), Status`.
**ActivityLog** `LogID*, PCode, EntityType, EntityID, Action, ByEmail, AtIso, Detail`, append-only; every business write lands here.
**BridgeEvents** `EventID*, Source (TF07/TF22/TF08), PCode, PayloadJson, ReceivedAtIso, ProcessedAtIso, Result`, the Apps Script parallel-run inbox; consumers treat it exactly like native triggers.
**DocumentControl** `DocNo* (PG/BD/CLASS-serial), Title, Class (FORM/TRK/REG/REF/DSH/TMP/ARC), Revision, DateIso, Owner, Approver, Status (Live/Retired), Location`, the Master List of Forms and of Record Formats in one controlled list.

## 4. Reference masters (management-controlled)

**PipelineStages** `StageNo*, StageName, ExitCriterion, ClockDays, StallDays, Variant, Status`, seeded with the six canonical stages and clocks (1: same day · 2: 7 · 3: 7 · 4: stall 15 · 5: 5 · 6: per milestone); the 6-vs-8 ratification is a data edit here.
**Decoder** `Segment (Entity/State/Scope/Sector/Spec/IDFormats), Code, Meaning, Status`, the P-Code controlled vocabulary and ID formats.
**RateCard** `ItemCode*, Description, Unit, FloorRate, EffectiveFromIso, Status`, the pricing floor.
**SectorBenchmark** `Sector*, Band, CeilingIndicator, Notes, Status`, the tier-dialled ceiling.
**TagTaxonomy** `Tag*, Category, Definition, Status`.
**FormMapping** `LiveCode* (BD00, BD01A, BD01B, BD02, BD03, BD04, BD05), TierThreeCode (BD01a…BD03b), BlueprintCode, Title, Stage, DocNo, Status`, carries the numbering reconciliation. The live estate is the seven codes above; the Tier 3 note and the blueprint each use a different scheme, so this master is the single translation point.
**DeliveryPools** `Pool*, Mailbox, Lead, Status`, seeded with the seven pools that work with clients: Fountain, Ocean, Pond, Pool, Reservoir, Spring, Tributary. The Tier 3 note lists Glacier in place of Spring, and the live BD05 dropdown offers nineteen names; one list must be ratified as authoritative [VERIFY with COO].
**PGEntities** `EntityCode* (PE/PS/PR…), LegalName, Status`.
**MilestoneTemplates** `TemplateID*, Sector, TypeOfWork, Service, MilestoneName, Sequence, Percent`.
**UsersRoles** `Email*, Name, Role, Team, Active`. Roles: BD, LU, TechLead, CSO, COO, Accounts, Delivery, TeamHead, CSuiteOfficer, EIACoordinator, Admin, MIS. TeamHead, CSuiteOfficer and EIACoordinator are named on the live BD03 handover and were absent from revision 1.0. Business Head is deliberately not a role; it appeared on the live BD05 closure form and has been retired.
**Settings** `Key*, Value, Description` (service mailbox, site IDs, gate bounds: MarginFloorPct 15, MarginCeilingPct 30, VelocityFloorPerMonth 150000, StallDays 15, MaxNegotiationRounds 3; bounds live here so management tuning is a data change, not a code change).

Trackers are saved views over these lists (pipeline board, lead tracker, stalled view, below-floor view, billing due) and are documented per view in the provisioning script.

## 5. Relationships (text diagram)

```
GroupMaster [1..n] CustomerRegister [1..n] ContactRegister
     |                    |
     +---------+----------+
               v
        ProjectRegister (keyed by PCode)
               |
               |--[1..n] QualificationReviews
               |--[1..n] ProposalRegister --[1..n] ProposalVersionRegister
               |--[1..1] AcceptanceRegister
               |--[1..1] HandoverRegister --> DeliveryPools
               |--[1..n] BillingMilestones --[1..n] MilestoneAchievements
               |--[1..n] ExpenseLedger   <-- BridgeEvents (TF07/TF22)
               |--[1..1] ClosureRegister <-- BridgeEvents (TF08)
               |--[1..1] WinLossRegister
               |--[1..n] LearningRegister
               |--[1..n] ActivityLog

Reference masters (Decoder, RateCard, SectorBenchmark, TagTaxonomy, PipelineStages,
FormMapping, DeliveryPools, PGEntities, MilestoneTemplates, UsersRoles, Settings)
are read by Functions and flows, and written only under DocumentControl.
```

## 6. Permission partition (list-level; SharePoint has no column security, so the partition is the security)

| Lists                                                           | Read                                       | Write (via Functions/flows)                 |
| --------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| ProjectRegister, ContactRegister, CustomerRegister, GroupMaster | All app roles                              | BD, Admin                                   |
| QualificationReviews                                            | Reviewers, BD (own), management            | Flow write-back                             |
| ProposalRegister, ProposalVersionRegister (cost, margin)        | BD leadership, CSO, COO, Accounts          | Owner BD + gates Function                   |
| ExpenseLedger, BillingMilestones, AcceptanceRegister            | Accounts, management                       | Accounts, bridge Function                   |
| ClosureRegister, WinLossRegister, LearningRegister              | Management, Ops Council; owner for own AAR | Owner, Functions                            |
| Masters + DocumentControl                                       | All read where needed by UI                | Admin under Governing Council approval only |
| ActivityLog, BridgeEvents                                       | Admin, management                          | Functions only                              |

Verified with a real low-privilege account at every phase exit. Pre-public-notice tender material never enters any list above (RESTRICTED, escalation path only).

## 7. Auth flow (end to end)

1. Browser loads the app; MSAL (auth-code + PKCE, single-tenant authority) redirects to Microsoft login; only perfactgroup.in accounts can complete sign-in.
2. MSAL acquires an access token for the API scope; `api.js` attaches it as Bearer on every call and silently refreshes.
3. Every Function: `lib/auth.js` validates signature against tenant JWKS, issuer = our tenant, audience = our API, expiry; failures return 401 with no detail.
4. `lib/roles.js` resolves the verified email against UsersRoles (Active only); unknown users get 403.
5. Handler enforces role rules, runs business logic, writes via the app-only Graph identity (client credentials, Sites.Selected on the BD sites), appends ActivityLog, and shapes the response to the caller's role so the browser never receives fields it may not show.
6. Flows act on list events; their decisions (Approvals connector) carry platform-verified identity and are written back to the triggering item; Functions learn of changes via Graph change-notification subscriptions (validated by clientState) and advance the state machine. Stage transitions are computed only in Functions.

## 8. Storage, lifecycle, migration

Dev site `bd-pipeline-dev` mirrors production; both provisioned by the same idempotent scripts. Historical data: reference masters seed from management content; the pre-P-Code ~500-row master enters Archives per the gated COO scope decision (Won-first if partial), never the live registers without a minted P-Code. Backups: registers are inside the tenant's SharePoint retention; additionally a timer Function exports register CSVs to a controlled library monthly. The 5,000-item view threshold is managed by indexing PCode, Stage, Status, GroupID and date columns at creation.
