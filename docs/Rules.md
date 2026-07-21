# Rules.md, Working Rules for the BD Pipeline Build

| Control | PG/BD/IT-RUL-001 · v0.2 · 19 July 2026 · Owner: Pranav Mathur · Approver: Kushal Bhargava |
| ------- | ----------------------------------------------------------------------------------------- |

These rules bind both Pranav and Claude. When a rule and a shortcut conflict, the rule wins; when two rules conflict, log it in Memory.md and ask Kushal or Nipun.

## 1. Process rules

Read before write: before any new code, read the nearest existing pattern (sibling Function, sibling form screen, the legacy service file, the live list schema). Minimal, targeted changes. One phase at a time per Phases.md, each closed by its exit criteria and quiz. Everything is a draft until Kushal signs off; circulated documents end with the approval line. Log every session in Memory.md the same day. Every flagged decision gets asked, not assumed.

## 2. Boundaries for Claude (AI assistant during the build)

Claude must never: fabricate field data, client names, financial figures, regulatory references, threshold values or statutory deadlines (uncertain items are flagged [VERIFY BEFORE SUBMISSION]); assume legacy fields carry over (Pranav specifies keep/drop); skip teaching steps in learning phases; write to production systems (Claude drafts, Pranav executes); place real credentials, tenant identifiers with secrets, or client data in files or chat. Claude must always: state assumptions explicitly, distinguish tested patterns from untested suggestions, prefer one precise question to a guess, and treat client names, fee structures and pre-submission drafts as Confidential within this project.

## 3. IMS discipline rules (from PG/IMS/BP-002 and T3-NOTE-001)

**SIPOC, no orphan steps.** Every form has a stated trigger, format and output action; every output is another step's trigger. A screen or flow that breaks the chain is a defect.
**Decision-grade capture.** Fields management needs (computed cost, margin, duration, stage) are mandatory and computed; no build may reintroduce a path that submits blind.
**The P-Code is never re-minted.** Serial continuity is permanent, the FY identifier stays, generation logic ports byte-faithfully from the legacy service; Group numbers compute through the shared P-Code, never keyed twice.
**Masters are management-controlled.** The Governing Council owns the Tier 3 schema; reference masters change only under document control, executed by Admin, never edited casually or by code.
**Document control.** Every controlled artefact carries number (PG/BD/CLASS-serial), revision, date, owner, approver; the Master Lists stay current; superseded items move to Archives and are never deleted (NABET B2, ISO 7.5).
**Standing escalations are hard-coded paths, not conventions:** CSO approves every quote and concession; fifteen-day pending flag; below-floor margin or velocity escalates before acceptance; pre-public-notice tenders are RESTRICTED, never in shared lists, prompts or working material.

## 4. AI-assist guardrails (for the assist phase and any AI use in the workflow)

AI drafts and computes; a named human reviews, approves and owns the decision. NABET core EIA judgement and functional-area-expert work are never outsourced to AI; the assistant supports qualified people. The CSO quote gate and the standing escalations stay exactly where they are regardless of AI involvement. AI outputs into the estate are marked as drafts with their reviewing human recorded. No client or Confidential data goes to any AI provider before the gated provider decision and Kushal's data-handling sign-off.

## 5. Technology rules

Allowed: plain HTML/CSS/JS (ES2020+, no framework, no build step); vendored `@azure/msal-browser`; Node.js 20 on Azure Functions; `jose` (or equivalent) for JWT validation; Graph via SDK or fetch; a docx templating library for the package; Power Automate standard connectors only (SharePoint, Approvals, Office 365 Outlook). Not allowed: premium connectors (the generic HTTP action is premium; use Graph change notifications instead); paid Azure SKUs; new third-party SaaS; browser storage for anything security-relevant beyond MSAL's own configured cache; dependencies we cannot explain line by line. Naming: lists and columns PascalCase per BackendSchema.md; routes kebab-case plural; canonical form codes (bd01a…bd03b) in paths; JS camelCase; CSS kebab-case with `bd-` prefix.

## 6. Coding contracts

Validate/submit contract: validators return true/false and populate a visible error summary, never throw; submit disables after validation passes; exactly one success and one failure handler per path; no state may strand the UI in "Submitting". API envelope: `{ ok: true, data }` or `{ ok: false, error: { code, message } }` with correct HTTP status, unwrapped only in `api.js`. Graph discipline: all writes through `lib/graph.js` with retry honouring Retry-After on 429; multi-list writes ordered for diagnosability; every business write appends to ActivityLog; ID minting and stage transitions idempotent. Auth discipline: every Function validates the token, resolves the role, and shapes the response; role checks never live only in the browser. Gates (twin gates, stall flags, stage advancement) are computed server-side from masters, never in the UI.

## 7. Design compliance (two surfaces, two authorities)

**Typeface, both surfaces:** one family, Aptos (Display for headings and figures, Regular and Light for body, Mono for identifiers, Narrow for dense tables), device-installed with the fallback stack in Design.md; no self-hosting for this internal tool.

**App chrome (every screen staff work in):** follows the Perfact-Intranet design system in Design.md, the amber-on-pine identity with both light and dark themes and the stage ribbon. This is the builder's creative call for an internal portal and is not overridden by the corporate brand guide.

**Documents the app emits outward** (the client proposal package and the fortnightly MIS to the Chairman): follow the corporate Perfact Design Language v3.0, green-700 headings #0B7743, ink text #112A1E, gold as a fill only, the table, chart and logo rules, produced from controlled templates and passed through the corporate rewrite checklist. What staff work in is ours; what leaves the building wears the corporate brand.

**Editorial voice, everywhere and every string:** Indian English; lakh and crore for money; SI units; sentence case; conclusion first; no em dashes (commas or colons instead); no emoji in professional output; none of the banned filler words (delve, dive into, elevate, unlock, seamless, robust, leverage, navigate as filler, foster, tapestry, realm, testament, landscape as filler); no pure black text; external drafts end with the approval line.

## 8. Data and formatting

Currency in ₹ with en-IN digit grouping (`Intl.NumberFormat('en-IN')`), lakh/crore in prose; dates display DD MMM YYYY, stored ISO 8601; financial year April to March; velocity in ₹ lakh/month. Mails keep the established intranet structure (greeting, summary, sectioned tables, footer) rebuilt on Graph so recipients feel continuity.

## 9. Security rules

Single-tenant tokens on every request; no anonymous endpoint beyond health. Secrets in Function App settings, never the repo; `local.settings.json` gitignored from the first commit; rotation reminders on every secret. Sites.Selected scoped to the BD sites. Permission partition per BackendSchema.md verified with a real low-privilege account at every phase exit. RESTRICTED data (salaries, appraisals, site GPS coordinates, pre-public tender numbers) never enters the app, its lists, or any prompt. Unclear classification defaults to Confidential until Nipun or Kushal confirms.

Draft, requires approval by Kushal Bhargava before issue.
