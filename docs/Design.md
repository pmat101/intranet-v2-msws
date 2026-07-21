# Design.md, BD Pipeline Design System

| Control | PG/BD/IT-DSN-001 · v0.2 · 19 July 2026 · Owner: Pranav Mathur · Approver: Kushal Bhargava |
| ------- | ----------------------------------------------------------------------------------------- |

**Change log v0.1 to v0.2:** the Perfact-Intranet visual identity (amber on pine, both themes, the stage ribbon) is retained by the builder's decision; this is an internal working portal, not an outward brand surface. One change is adopted from the corporate Perfact Design Language v3.0: the typeface becomes **Aptos**, which is native on every M365 device we run and therefore costs nothing and needs no self-hosting. The three previous faces (Bricolage Grotesque, Inter, IBM Plex Mono) are retired. A governance split is stated in section 0: the app's own screens use this system; documents the app generates for clients or the Chairman use the corporate design language.

## 0. Two surfaces, two design authorities

This document governs the **app chrome**: every screen a Perfact staff member works in. It is a green-led, calm, internal tool and it carries the intranet identity.

Documents the app **emits to the outside** are governed instead by the corporate Perfact Design Language v3.0 (Aptos, green-700 headings #0B7743, ink text #112A1E, gold as a fill only, the table and chart rules, the voice rules): the client proposal package (regulatory roadmap, commercial proposal, cover note, scope-timeline chart, sector credentials) and the fortnightly MIS export to the Chairman and External Affairs Council. These are produced from controlled templates, not styled ad hoc, and they follow the corporate rewrite checklist. The reason for the split is simple: what staff look at while working is ours to design; what leaves the building wears the corporate brand.

The **editorial voice rules apply to both surfaces** and to every string in the UI: Indian English, lakh and crore for money, SI units, sentence case, conclusion first, no em dashes (use commas or colons), no emoji in professional output, none of the banned filler words, and external drafts end with the approval line. These live in Rules.md section 7 and bind all copy.

## 1. Colour tokens

Both themes ship; light is the default, dark follows the operating-system preference with a manual toggle persisted as a per-user server-side setting, never browser storage.

| Token                       | Light                  | Dark              | Use                                            |
| --------------------------- | ---------------------- | ----------------- | ---------------------------------------------- |
| `--bg`                      | #f5f8f4                | #0a1411           | App background                                 |
| `--card`                    | #ffffff                | #101d18           | Cards, panels, table surfaces                  |
| `--ink`                     | #0d2019                | #e8f2ea           | Primary text                                   |
| `--ink-soft`                | #4c6156                | #9db3a6           | Secondary text, labels                         |
| `--line`                    | #dee8df                | #1d2f27           | Hairline borders, dividers                     |
| `--pine`                    | #0e3a2c                | #6fcd9c           | Headings accent, nav, links                    |
| `--pine-hero-a` / `-b`      | #0a2b21 / #155540      | #08110e / #123528 | Rail and header gradient                       |
| `--moss`                    | #2e7e5a                | #54b183           | Success, Approved, Completed                   |
| `--moss-soft`               | #e2efe7                | #14271f           | Success chip fill                              |
| `--amber`                   | #f27b21                | #ff9142           | Primary actions, focus, pending attention      |
| `--amber-deep`              | #d8620f                | #ffa05c           | Action hover and pressed                       |
| `--amber-soft`              | #fdebdc                | #2a1c10           | Pending chip fill, highlights                  |
| `--river`                   | #2e7fa3                | #5fb0d2           | Informational accents, links in tables         |
| `--danger`                  | #b3372b                | #e07a6d           | Rejected, On Hold, overdue, stall, below-floor |
| `--danger-soft`             | (light tint of danger) | (dark tint)       | Danger chip fill                               |
| `--hero-ink` / `--hero-sub` | #f1f7f1 / #c4dac8      | #edf6ee / #a9c4ae | Text on the pine gradient                      |

On Hold and overdue rows carry a 3 px `--danger` left rule, never a full red wash. Every colour pairing used for text is checked to at least 4.5:1 in both themes (section 8).

## 2. Typography

One family, **Aptos**, replacing the three previous faces. Aptos is present on the company's M365 Windows and Office devices, so the app relies on the device-installed family with a system fallback and does not self-host, which sidesteps the font-licence question entirely for an internal tool.

- **Display**: `"Aptos Display"` then `"Aptos"`, then `"Segoe UI Variable"`, `"Segoe UI"`, `system-ui`, `sans-serif`. Page titles, dashboard numbers, stage names; weights 600 to 800; tight tracking (minus 0.01em to minus 0.02em) at large sizes only.
- **Body**: `"Aptos"` with the same fallback chain. All readable text; weights 400, 500, 600; never bolder than 600 in running UI.
- **Mono**: `"Aptos Mono"`, then `"Cascadia Mono"`, `Consolas`, `monospace`. P-Code, ProposalID, invoice numbers, amounts in tables; identifiers should look like identifiers.
- **Dense**: `"Aptos Narrow"` where available, for wide data tables only.

Type scale (rem): 2.25 display, 1.5 page title, 1.125 section, 1.0 body, 0.875 secondary, 0.75 caption labels (uppercase, plus 0.06em tracking, `--ink-soft`). Line-height 1.5 body, 1.2 display. Minimum text size 12 px equivalent.

## 3. Space, radius, elevation

An 8-point grid, 4 px only for icon-internal spacing. Cards pad 20 to 24 px; sections separate by 32 to 48 px; density comes from tables, not cramped cards. Radius: 14 px cards and modals, 10 px inputs and buttons, 999 px chips. Elevation is rare: a soft shadow on raised cards, a larger one on modals only; tables and inline panels sit flat on `--line` hairlines. The amber glow is reserved for the single primary action per view, one glow per screen maximum.

## 4. Components

**Buttons.** Primary: amber fill, white text, 10 px radius, subtle press scale (0.98), one per view; hover uses `--amber-deep`. Secondary: transparent, 1 px `--line`, `--ink` text. Destructive: danger outline, filled only on confirm. Disabled: 40 per cent opacity, no pointer. Buttons state their action ("Create lead", "Send for CSO approval", "Record round"), never "Submit".
**Inputs.** Card-surface field, 1 px `--line`, focus ring 2 px amber at 40 per cent opacity; label above in caption style; inline error in `--danger` below the field; an error-summary panel at the top of the form per the validate/submit contract in Rules.md. Computed mandatory fields (margin, velocity) render read-only with a visible "computed" affordance, so the discipline is legible rather than mysterious.
**Chips.** Soft fills carry status: amber-soft for pending, moss-soft for approved or complete, danger-soft for rejected, on-hold, stalled or below-floor, neutral `--line` outline for draft. Colour never stands alone; every chip carries its label.
**Tables.** Flat, hairline row separators, sticky header, mono for codes and amounts (right-aligned, en-IN grouping), row hover in a `--bg` tint, no zebra stripes.
**Cards.** Dashboard KPI cards: a large Aptos Display number in `--pine`, a caption label, a context or delta line in secondary text.

## 5. Signature element, the stage ribbon

Every project view is headed by a horizontal six-stop ribbon reading the current canonical stages: Lead Identified, Qualification, Proposal Sent, Negotiation, Won and Onboarded, Delivered and Closed. The stops are read from the PipelineStages master, so a ratified change (for example the eight-stage variant) re-renders without a redesign. Completed stops fill `--pine` with a subtle moss check; the current stop pulses once on load in amber and carries "Pending with:" and the days-in-stage count beneath it; stalled or below-floor states overlay a `--danger` dot; future stops are hairline outlines. The ribbon miniaturises to a six-dot strip in tracker rows, the app's identity at every zoom level. This is the one place motion is spent.

## 6. Layout

Left rail, 72 px collapsed or 240 px expanded, on the pine gradient with hero-ink text: logo mark, then Dashboard, Pipeline, Projects, Approvals, Billing, Registers, Masters, MIS, Archives, filtered by role. Content area max-width 1280 px, 24 px gutters. Dashboard order: KPI row (Active, In qualification, Awaiting CSO, Stalled, Below-floor escalations) then the stage board then the tracker table. Project page: ribbon header, then stage panels stacked, the current stage expanded, earlier stages collapsed to summary rows with a role-gated Edit affordance. Breakpoints: tables collapse to card lists under 768 px; the app must be fully usable on iPad (management's device), tested at 1024 by 768 and 820 by 1180 every phase. The logo appears top-right on any printable or exported surface per the corporate logo rules, never recoloured or modified.

## 7. Motion and restraint

Durations 150 to 200 ms, ease-out; one page-load moment (the ribbon pulse), hover and focus micro-transitions, nothing ambient. The reduced-motion preference disables the pulse and all non-essential transitions. Loading states are skeleton rows for tables, not spinners; buttons show inline progress text during submits. Empty states instruct ("No proposals awaiting the CSO. Items appear here when commercials pass the gates."). Errors say what happened and the next step; they never apologise theatrically and never blame the user.

## 8. Accessibility and quality floor

Visible keyboard focus on every interactive element (the amber ring); logical tab order matching visual order; chips never rely on colour alone; icons paired with labels or aria-labels; both themes verified to at least 4.5:1 for body-text contrast; forms completable and submittable by keyboard alone. This floor is checked at every phase exit, not retrofitted. Generated and exported documents follow the corporate design language's own accessibility rules (its section 3.4) since they are produced under that system.

Draft, requires approval by Kushal Bhargava before issue.
