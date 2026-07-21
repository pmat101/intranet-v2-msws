# Walkthrough.md, The Teaching Walk-through

| Control | PG/BD/IT-WLK-001 · v0.2 · 19 July 2026 · Owner: Pranav Mathur · Approver: Kushal Bhargava |
| ------- | ----------------------------------------------------------------------------------------- |

## How to use this document

This is the **teaching companion** to ImplementationPlan.md. The Implementation Plan says what to build and how to verify it; this document teaches the concept behind each step first, in plain language, and checks that the concept has landed before we move on. Both documents use the same step numbers (S0.1, S1.1 and so on), so they stay in lockstep and never drift.

**Our teaching loop, every step:**

1. I explain the concept first, why we are doing this and the mental model, including the one gotcha that trips people up.
2. You execute the step yourself on your machine. I do not touch your systems; you build the muscle memory.
3. We verify together against the "Verify" line.
4. On steps marked "Note to Memory", you write two or three lines in your own words into Memory.md. Your words, not mine, that is what proves you understood it.

**Quiz checkpoints** fall after every couple of steps. I ask, you answer from memory, and if it lands we continue; if not, we revisit before building on top of a shaky base. This document uses plain text labels, not symbols, in keeping with our own no-emoji rule.

**Scope of detail.** Phases B0 to B3 are written in full teaching detail because we build them next. B4 to B7 are written in solid detail. B8 to B13 are given as stepped outlines with their concepts named; each of those phases gets its full teaching detail when we reach it and when the gated inputs (Decoder content, rate card, the CSO decisions) have arrived. Writing minute detail now for a phase that depends on data we do not yet have would be guesswork, and guesswork is against our rules.

---

# PART A, the study syllabus (runs in parallel, self-paced)

You do not need all of this before we start; we start at B0 now. But these five tiers, roughly twenty to twenty-five hours total, are the background that makes each phase click. Study a tier a little ahead of the phase that needs it. The knowledge checks for these live inside the build quizzes below, so studying pays off directly.

**Tier 1, the ground (before B0 to B1).** How the web actually works: what a client and a server are, the request and response cycle, what HTTP verbs (GET, POST, PATCH) mean, what a status code is (200, 401, 403, 404, 429, 500), what DNS and HTTPS do. Git beyond the basics you have: what a branch is, what a pull request is and why teams use one, what merging means. JSON: objects, arrays, strings, numbers, booleans, null, and why it is the language every API speaks.

**Tier 2, the browser and the language (before B4).** JavaScript essentials: variables, functions, objects, arrays; asynchronous code, what a promise is, and the async and await keywords; the fetch function for calling an API; ES modules (import and export). The DOM: how JavaScript reads and changes the page.

**Tier 3, identity (before B1, deepened before B5).** Why passwords alone are not how apps authenticate any more. OAuth2 and OpenID Connect in plain terms. What a token is, and specifically what a JWT is (three parts: header, payload, signature) and why a signature matters. What MSAL does for us. What single-tenant means and why it is our zero-cost tenant lock.

**Tier 4, the Microsoft cloud (before B2 to B3).** Azure in three ideas: a subscription is a billing container, a resource group is a folder, a resource is a thing you run. Static Web Apps and Functions, and what "consumption" billing means (you pay per use, and our use sits inside the free grant). Microsoft Graph as the single front door to Microsoft 365 data. SharePoint Lists as a database, and the one gotcha that matters most: the difference between a column's display name and its internal name.

**Tier 5, workflow and our own design (before B5, and read our docs before B0).** Power Automate: what a trigger is, what a connector is, and the crucial split between standard connectors (included) and premium connectors (not, and the generic HTTP action is premium). The Approvals action. Then read our own PRD.md, Architecture.md, TRD.md and BackendSchema.md end to end; they are written to be read.

---

# PART B, the build walk-through

## Current position

Done already: Git and the private repo with the legacy snapshot; the Entra ID app registration (single-tenant) with Sites.Selected and Mail.Send consented; the client secret stored with a rotation reminder; the local tooling (SWA CLI, Functions Core Tools, VS Code extensions) installed; the app scaffold. Blocked on Kushal: the Azure subscription card, and the service-mailbox decision. So within B0 we do the two steps that need neither, S0.6 then S0.5, and hold S0.1 to S0.4 and S0.7 until the card and mailbox arrive.

---

## Phase B0, foundations close-out

**S0.6, commit the project documents to the repo.** _(we do this first)_
Concept: version control is a save-game system with a full history and an undo that never expires. You already use it for code. We now put the _plan_ under the same discipline, because these ten documents are as important as the code and will change often; every change should be a labelled, reversible commit, not a file quietly overwritten. A repository has folders; ours keeps documents in `docs/` so the plan and the code live together and travel together. A commit has a message; a good message says what changed and why in one line, so that six months from now you or the second maintainer can read the history like a diary.
Do: per ImplementationPlan S0.6. Put the ten files into `docs/` in your local clone, then stage, commit with a clear message, and push.
Verify: the ten files appear under `docs/` on github.com in your browser, and `git log` shows your commit at the top.
Note to Memory: in your words, what a commit is, and why the plan lives in the repo alongside the code.

**S0.5, create the development SharePoint site and grant the app access to it.**
Concept: we never build against the live company data. A development site is a separate, safe sandbox that looks like production but holds only test rows, so a mistake costs nothing. Later, the same provisioning script builds the real site, so the sandbox is not throwaway work, it is a rehearsal of the real thing. The grant step is the important idea: our app has an identity (the Entra registration), and Sites.Selected means that identity can touch only the specific sites we name, nothing else in the whole company SharePoint. That is least privilege: give a component exactly the reach it needs and not one inch more.
Do: per ImplementationPlan S0.5. Create the site, record its URL in `docs/ids.md`, and grant the app's Sites.Selected permission to this site specifically.
Verify: a Graph Explorer read of the site succeeds using the app context; a read of some other site fails, which is the proof that the fence works.
Note to Memory: what least privilege means, in your words, and why Sites.Selected is safer than "access to all sites".

Quiz checkpoint 1 (after S0.6 and S0.5):
a) What problem does version control solve, and what is a commit message for?
b) What does Sites.Selected give our app, and why is that safer than a tenant-wide grant?
c) Why do we build on a development site instead of the live data?

**S0.1 to S0.4, the Azure subscription, cost alarm, Static Web App and health endpoint.** _(held until the card)_
Concept: a subscription is the billing container; a resource group is the folder we keep our resources in; the cost budget is the smoke alarm that mails us at 50, 90 and 100 per cent of ₹500 so a surprise bill is impossible. The Static Web App is our front door on the internet, wired to the repo so that a push becomes a live deployment automatically; that automatic pipeline is called continuous integration and deployment. A health endpoint is the simplest possible check that the back end is alive: it answers "ok" and nothing more, so that if it stops answering we know at once.
Do: per ImplementationPlan S0.1 to S0.4, when the card is approved.
Verify: the subscription shows under Billing; a test cost alert mail arrives; a push turns the deployment green and the hello page loads; the browser can call `/api/health` and receive ok.
Note to Memory: the three Azure words (subscription, resource group, resource) and what continuous deployment means.

**S0.7, the service mailbox.** _(held until Kushal's decision)_
Concept: system mail should come from a dedicated address, not a person, so that when the app mails a client or a reviewer it reads as the system speaking, and so that no individual's inbox owns the app's correspondence. A shared mailbox on Microsoft 365 costs nothing extra and is exactly this.
Do: per ImplementationPlan S0.7, once the mailbox exists.
Verify: a Graph sendMail test lands in Outlook showing the service address as sender.

---

## Phase B1, authentication end to end

This is the phase that makes the app private. Study Tier 3 alongside it.

**S1.1, sign the user in with MSAL.**
Concept: we do not write our own login. Microsoft handles the password, the two-factor prompt and the "keep me signed in" for us; our app only asks Microsoft "who is this person, and are they allowed here". MSAL is Microsoft's library that runs that conversation in the browser. Because our app registration is single-tenant, only accounts inside perfactgroup.in can even complete the sign-in; an outsider is turned away at Microsoft's door before our code runs at all. That single-tenant setting is our free tenant lock, the thing the corporate plan would otherwise charge about ₹800 a month for.
Do: per ImplementationPlan S1.1. Vendor the MSAL library, configure it with the tenant and client IDs, and render the signed-in user's name.
Verify: your perfactgroup.in account signs in and sees its name; a personal Microsoft account cannot complete sign-in.
Note to Memory: in your words, why single-tenant is our zero-cost tenant lock.

**S1.2, read the token.**
Concept: when you sign in, Microsoft hands the browser a token, a small signed pass that says who you are and what you may access. It is a JWT: three parts, a header, a payload of claims (your email, the tenant, an expiry time), and a signature that proves Microsoft issued it and nobody tampered with it. Reading it at jwt.ms makes the abstract concrete.
Do: per ImplementationPlan S1.2. Acquire the API-scope token and inspect its claims.
Verify: the audience, issuer, tenant and name claims read as expected.

Quiz checkpoint 2 (after S1.1 and S1.2):
a) In one sentence, what does MSAL do for us and what do we deliberately not build?
b) A JWT has three parts. Name them, and say what the signature proves.
c) Why can a Gmail account never sign into our app?

**S1.3, the api.js wrapper.**
Concept: every call to our back end needs the token attached and every reply comes wrapped in the same envelope. Rather than repeat that in fifty places, we write it once, in one small module, `api.js`. This is the single-responsibility idea: one place owns one job, so a change happens in one place. The envelope is a fixed shape, either ok with data or not-ok with an error code and message, so the front end always knows how to read a reply.
Do: per ImplementationPlan S1.3.
Verify: a deliberately failing call surfaces the error path cleanly, not a raw crash.

**S1.4, validate the token on the server.**
Concept: here is the rule that carries the whole app's security. The browser is not trusted. Anyone can edit what runs in a browser, so a check that lives only in the browser protects nothing. Every Function therefore re-checks the token itself: it verifies the signature against Microsoft's public keys, checks the issuer is our tenant, checks the audience is our API, and checks it has not expired. Only then does it act. A token that fails any check gets a flat 401 with no detail, because error messages should never teach an attacker.
Do: per ImplementationPlan S1.4, building `lib/auth.js`.
Verify: an expired token and a tampered token are both rejected in tests.
Note to Memory: the single most important security sentence in your own words, that the browser is not trusted and every Function re-validates.

**S1.5, whoami and the first role.**
Concept: authentication is "who are you"; authorisation is "what may you do". They are different. Once the Function knows who you are (from the validated token), it looks you up in the UsersRoles master to learn your role, and shapes what it returns accordingly. An unknown person, even with a valid company token, gets 403, not because we do not know them but because they have no role in this app.
Do: per ImplementationPlan S1.5.
Verify: your account resolves to the right role; an unknown account gets 403.

Quiz checkpoint 3 (after S1.3 to S1.5):
a) Why is a permission check that runs only in the browser worthless?
b) What is the difference between authentication and authorisation?
c) What is the difference between a 401 and a 403, in our app's terms?

---

## Phase B2, the Tier 3 estate provisioned

**S2.1, provision the lists from a script.**
Concept: we create every register and master by running a script, not by clicking in the SharePoint interface. Two reasons. First, it is repeatable: the same script builds the dev site and later the production site identically, and running it twice changes nothing (that property is called idempotence). Second, it is documented: the script is the exact record of what exists, so there is never a gap between the plan and reality. We index the columns we will search on (P-Code, stage, status) from the very start, because SharePoint slows down on large lists unless the sorted-and-filtered columns are indexed.
Do: per ImplementationPlan S2.1, against BackendSchema.md sections 3 and 4.
Verify: run the script twice; the second run is a no-op; the indexes are present.
Note to Memory: what idempotence means, in your words, and why we index from day one.

**S2.2, apply the permission partition.**
Concept: SharePoint cannot hide a single column from a person; it can only control access to a whole list. So the security design is the way the data is split across lists. Commercial figures live in their own list that only leadership, the CSO, the COO and Accounts can read. This is why BackendSchema.md separates the registers the way it does; the split is not tidiness, it is the access control.
Do: per ImplementationPlan S2.2.
Verify: a low-privilege test account cannot open the proposal (commercial) list.

**S2.3 and S2.4, seed the masters.**
Concept: masters are the controlled vocabularies the forms read: the pipeline stages and their clocks, the P-Code decoder, the rate card, the sector benchmark, the tags. They are management-owned; the team reads them but never edits them. We seed the structural ones now (stages, entities, delivery pools, roles, settings) and load the content-heavy ones (decoder, rate card, benchmark, taxonomy) when Kushal and Nipun provide the content. Where content is missing, only the steps that read it are blocked, nothing else.
Do: per ImplementationPlan S2.3 and S2.4.
Verify: the seed scripts are re-runnable; the stage list shows the six canonical stages with their clocks.

**S2.5, the Graph helper.**
Concept: the app talks to SharePoint through Microsoft Graph, the single front door to all Microsoft 365 data. Our Functions get in using the app's own identity (not a person's), through a flow called client credentials: the app proves itself with its client ID and secret and receives a token. We wrap all of this in one module, `lib/graph.js`, which also handles the polite retry when Microsoft asks us to slow down (the 429 response and its Retry-After header). Being a good API citizen is part of the craft.
Do: per ImplementationPlan S2.5.
Verify: a unit test with a forced slow-down response shows the retry working.

Quiz checkpoint 4 (after S2.1 to S2.5):
a) What is idempotence, and why does our provisioning script need it?
b) SharePoint has no column-level security. How does our design protect commercial figures anyway?
c) What is Microsoft Graph, and what is the client-credentials flow for?

---

## Phase B3, the identity spine

This is the most delicate porting job in the whole project. Slow is smooth here.

**S3.1, port the P-Code generator byte-faithfully.**
Concept: the P-Code is the spine of the entire system; one hundred per cent of live proposals carry it, and it must never change format or re-number. So we do not reinvent it; we lift the existing generator across exactly, and we prove it is exact with golden tests: we feed it inputs whose correct historical P-Codes we already know, and we require it to reproduce them character for character. A golden test is a test whose expected answer is a known-good real result. If a single character differs, the port is wrong and we stop.
Do: per ImplementationPlan S3.1, building `lib/ids.js` with the clash guard.
Verify: the golden suite is green; known historical inputs reproduce their exact live P-Codes.
Note to Memory: what a golden test is and why the P-Code demands one.

**S3.2, mint Group, Customer and Contact IDs with dedupe.**
Concept: the live data has the same company under several spellings (Jubilant, Jubilant Ltd, Jubiliant), which is why group-level numbers were never trustworthy. We fix this at the source: when a lead is captured, we check the new name against the Group master's canonical names and aliases before minting, so one real company resolves to exactly one Group ID. This is deduplication, and doing it at capture is far cheaper than cleaning it up later.
Do: per ImplementationPlan S3.2 (formats per the Decoder; blocked only if the Decoder content is still pending).
Verify: two different spellings of one group resolve to a single Group ID.

**S3.3, the activity log.**
Concept: every meaningful action the app takes gets one line in an append-only log: who did what, to which record, when. Append-only means we add, never edit or delete, so the log is trustworthy evidence. This is not optional plumbing; it is what makes the system auditable, which is a NABET requirement, and it is what lets us answer "who changed this and when" without guessing.
Do: per ImplementationPlan S3.3, building `lib/audit.js`, used by every write path from here on.
Verify: one test write produces exactly one log row.

Quiz checkpoint 5 (after S3.1 to S3.3):
a) Why do we port the P-Code generator instead of writing a fresh one, and how do golden tests protect us?
b) What is deduplication, and why is doing it at capture cheaper than later?
c) What does append-only mean, and why does an audit log need it?

---

## Phase B4, Stage 1, BD01a Lead Captured

Full detail at the phase; the shape is: build the lead form screen to the design system and the validate-then-submit contract, with separate searchable contact fields and live dedupe suggestions (S4.1); the create endpoint that checks the role, validates, mints all four IDs, writes the project and contact records, locks the identity fields on the server, and logs (S4.2); the preserved admin@ confirmation mail (S4.3); the firing of the qualification reviews (S4.4); the tracker stub showing projects as stage chips (S4.5).
Concepts introduced: the validate/submit contract (a validator returns true or false and shows a summary, it never throws, and the submit button cannot strand the screen in "submitting"); server-side field locking (the browser may hide a field, but only the server can truly prevent it being changed); idempotent create (the same lead submitted twice must not make two projects).
Quiz checkpoint 6 will cover the validate/submit contract and why field locking must be server-side.

## Phase B5, Stage 2, qualification approvals

The shape: a Power Automate flow that, when a qualification review record is created, sends an Outlook approval to the LU team and the Technical Lead, "everyone must approve", and writes their decisions and remarks back (S5.1); a Graph change-notification subscription that tells a Function when reviews are complete, so the Function advances the stage, all without the premium HTTP action (S5.2); the Lost path with a mandatory reason (S5.3); the clock sweep that ages each stage against the master (S5.4).
Concepts introduced: a trigger and a connector; the standard-versus-premium line and why we route around it with change notifications; why approvals must carry platform-verified identity rather than a clickable link.
This phase ends with the first live demo to Kushal and Nipun. Quiz checkpoint 7 will cover the connector split and the change-notification pattern.

## Phase B6, Stage 3a, commercials and the gates

The shape: the BD02a screen with the decomposed cost stack, computed fields shown read-only as they calculate (S6.1); `lib/gates.js` computing Net Perfact Revenue, margin and velocity on the server, reading its bounds from the Settings master (S6.2); the below-floor escalation path that must be walked before the CSO can even see the proposal (S6.3); the CSO approval flow on a passing gate (S6.4).
Concepts introduced: why computation lives on the server, never the browser (numbers management relies on must be beyond a user's edit); configuration as data (the gate bounds live in a master so management can tune them without a code change); the escalation as a hard gate, not a convention.
Quiz checkpoint 8 will cover why gates compute server-side and why bounds live in a master.

## Phase B7, Stage 3b, the proposal package

The shape: the controlled template library, each template a document-controlled item (S7.1); a decision between two document-templating libraries after a quick trial against the real template (S7.2); a Function that assembles the five-document package in the defined sequence to the project folder, versioned (S7.3); the PDF conversion route, verified on our tenant before we rely on it (S7.4); the client mail carrying the package on CSO approval (S7.5).
Concepts introduced: templating (data poured into a fixed document shape); the difference between the app's own design system and the corporate design language that these emitted documents must follow; verifying a platform capability before depending on it.

## Phase B8, Stage 4, negotiation rounds

Outline: versioned rounds in the version register, each with the client offer, our requote, the computed delta, the scope change and the reason; a hard cap of three rounds held as a data value in Settings, so it can be raised later without code; every concession re-entering the CSO gate; the fifteen-day stall flag; the acceptance capture that exits the stage. Concept: versioning as history you never overwrite.

## Phase B9, Stage 5, won and onboarded

Outline: billing start on the work order or sales order opens the expense ledger; the handover assigns the delivery pool and EIA coordinator, attaches the tagged scope and fixes the timeline baseline; milestones seed from templates. Concept: a clean handoff, where one action produces every downstream record the delivery team needs.

## Phase B10, Stage 6, delivery integration and closure

Outline: the Apps Script bridge, where the still-live TF07, TF22 and TF08 forms push event rows to a bridge list via Graph during the parallel run, so our consumers behave identically before and after cutover; the events Function that turns those into ledger entries and the closure task; the closure screen with the four-question after-action review, the lessons written to the learning register, the Win or Loss recorded, and the final settlement. Concept: bridging two live systems during a migration without either one knowing about the other.

## Phase B11, trackers, dashboards, MIS

Outline: the pipeline board with columns driven by the stages master; role-shaped KPI rows; search that jumps straight to a P-Code or returns grouped matches; the fortnightly MIS roll-up reading Net Perfact Revenue, margin, velocity and stage ageing; the iPad and accessibility passes. Concept: a dashboard earns its place only if it answers a real question fast, here, where is it stuck and is it worth doing.

## Phase B12, UAT, migration, cutover, handbook

Outline: user acceptance testing with a real cohort; the production site built by the same script; the historical migration per the gated scope decision; a pilot with new leads while the legacy stays readable; the approved cutover note; the legacy BD forms set to read-only; and the handover handbook distilled from Memory.md, ending in a teach-back where you run me through the system.

## Phase B13, the AI-assist pilot (gated)

Outline: only after the provider and budget decision and Kushal's data-handling sign-off. Pilot the two highest-volume nodes first, parsing an inbound enquiry into a pre-filled lead draft that a human confirms before anything is minted, and drafting a proposal against templates within the rate-card floor and the benchmark ceiling. Extend node by node only on evidence, always under the guardrails: AI drafts and computes, a named human reviews and owns the decision, and the core EIA judgement is never handed to the machine.

---

# PART C, the quiz map

The checkpoints above fall at these points, and each must be passed from memory before we build further:

1. After S0.5 to S0.6, version control and least privilege.
2. After S1.1 to S1.2, MSAL and the JWT.
3. After S1.3 to S1.5, the browser is not trusted; authentication versus authorisation.
4. After S2.1 to S2.5, idempotence, list-level security, Graph.
5. After S3.1 to S3.3, the P-Code port, dedupe, the audit log.
6. In B4, the validate/submit contract and server-side locking.
7. In B5, the connector split and change notifications.
8. In B6, server-side gates and configuration as data.
   Later phases add their own checkpoints as we reach them.

Draft, requires approval by Kushal Bhargava before issue.
