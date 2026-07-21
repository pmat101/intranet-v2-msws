# Memory.md, BD Pipeline Project Logbook

Append-only. Newest entries at the top. Every working session adds: date, what was done, decisions, gotchas, open items. This file feeds the handover handbook at project close.

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
