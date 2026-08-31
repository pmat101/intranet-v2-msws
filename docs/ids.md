# ids.md, public identifiers

| Control | PG/BD/IT-IDS-001 · v0.1 · 1 August 2026 · Owner: Pranav Mathur |
|---|---|

**What belongs in this file.** Public identifiers only. Tenant IDs, client IDs, subscription IDs, resource names and site URLs are not secrets: they travel in URLs, appear in the browser's own network traffic, and must be readable by anyone maintaining this system.

**What must never appear in this file, or anywhere else in this repository.** The client secret, connection strings, API keys, payment details, or any credential of any kind. Those live in Function App settings and in the password manager. A secret committed here would remain in the Git history even after deletion, and would have to be rotated.

## Microsoft 365 and Entra ID

| Item | Value |
|---|---|
| Tenant name | perfactgroup.in |
| Tenant ID | 62acdb32-484e-47ca-9e3a-0b58359edbb5 (verify against the portal) |
| App registration name | Perfact-Intranet |
| Application (client) ID | [record from Entra ID, App registrations] |
| Sign-in authority | https://login.microsoftonline.com/62acdb32-484e-47ca-9e3a-0b58359edbb5 |
| Client secret | NOT RECORDED HERE. Stored in the password manager. Rotation reminder June 2027, expiry to be verified. |

## Azure

| Item | Value |
|---|---|
| Billing account type | Microsoft Customer Agreement |
| Billing account | PERFACT GROUP |
| Billing profile in use | PRANAV MATHUR (interim; to be renamed and re-instrumented before live BD data, backstop 30 September 2026) |
| Subscription name | Perfact-Intranet |
| Subscription ID | [record from Subscriptions] |
| Resource group | rg-bd-pipeline |
| Region | Central India |
| Budget | ₹500 per month, alerts at 50, 90 and 100 per cent |

## SharePoint

| Item | Value |
|---|---|
| Development site URL | [record at S0.5] |
| Development site ID | [record at S0.5] |
| Production site URL | [record at B12] |
| Production site ID | [record at B12] |

## Application

| Item | Value |
|---|---|
| GitHub repository | pmat101/perfact-intranet-26-27 (private) |
| Static Web App name | [record at S0.3] |
| Static Web App default URL | [record at S0.3] |
| Service mailbox | [pending decision, proposed bd-app@perfactgroup.in] |

Draft, requires approval by Kushal Bhargava before issue.

## Mail sending, senders and scope

Set 25 August 2026. Policy: `support@perfactgroup.in` sends for BD, Accounts
and HR; `admin@perfactgroup.in` sends for everything else (TF, WPF, MPF, FQ,
FR, ADM, SF, CF). Recipients on each form are unchanged from the legacy
system. The mapping lives in `api/src/lib/mail-senders.js`; the two addresses
are environment variables `MAIL_SENDER_SUPPORT` and `MAIL_SENDER_ADMIN`.

`Mail.Send` is an application permission, so without restriction the app could
send as any mailbox in the tenant. Two independent controls are in place.

**Application Access Policy (legacy, restricts the Entra grant).**
Mail-enabled security group `sg-intranet-senders@perfactgroup.in` holds only
the two service mailboxes. Policy created with `New-ApplicationAccessPolicy`
and `-AccessRight RestrictAccess`. Verified: Granted for both service
mailboxes, Denied for a staff mailbox. Microsoft has said this feature will be
deprecated in future, hence the second control.

**RBAC for Applications (current, grants scoped permission).**
Exchange service principal `Perfact Intranet` created against enterprise
application object ID `3755c710-0ae7-4b1e-8f12-b008e0d7bbee`. Note this is the
ENTERPRISE APPLICATION object ID, not the app registration's; both are shown
as "Object ID" on similar pages and the wrong one fails silently. Management
scope `IntranetSenders` filters on the two addresses. Role assignment
`Intranet-MailSend` grants `Application Mail.Send` within that scope.
Verified with `Test-ServicePrincipalAuthorization`: InScope True.

**Still open.** `Mail.Send` remains consented in Entra. Removing it would make
RBAC the sole grant, which is the cleaner end state, but it must not be removed
until mail has been proven working end to end. Sequence when the time comes:
confirm mail sends, remove the Entra permission, confirm again, and allow up to
two hours before treating a failure as real.

**Gotcha.** The RBAC cmdlets (`New-ServicePrincipal`, `Get-ServicePrincipal`,
`Test-ServicePrincipalAuthorization`) load into a temporary session module with
a generated name, not into `ExchangeOnlineManagement`. If they appear to be
missing, the session has expired: reconnect. `Get-Command *ServicePrincipal*`
without a `-Module` filter is the right diagnostic.

## Site separation, deferred to B12 by decision

**Decision, 25 August 2026 (Pranav).** A separate production SharePoint site
will be created at B12 as part of cutover, rather than now. Until then both the
development and production deployments read and write `bd-pipeline-dev`. This
section supersedes the earlier "Open item" note.

**Reasoning.** Creating the second site now would mean a second provisioning
run, dual configuration, and a cutover at B12 regardless. Deferring costs
nothing provided the rule below holds. The trade accepted is that experiments
during B5 to B11 happen on the same site the production deployment reads.

**The rule this depends on. No real BD lead may be entered in the production
deployment until the second site exists.** The register currently holds only
test rows, with test P-Codes in the 4080 to 4118 range. If a genuine lead is
created before separation it becomes entangled with test data and with P-Codes
that correspond to nothing.

**Also required before B5 flows send anything.** Reviewer addresses in the
qualification approval flow must point at Pranav during development, not at the
real land use team or technical leads. Testing against colleagues' inboxes
trains them to ignore approval requests, which is the one habit this system
cannot afford.

**The steps, when B12 arrives.**

1. Create the production site `bd-pipeline`.
2. Grant the app registration the `manage` role on it, by POST to
   `/sites/{host}:/sites/bd-pipeline:/permissions`. This is an addition; the
   development grant stays.
3. Run `node provisioning/provision.js --site="{production-site-id}"` to build
   the lists. The `--site` override exists so `local.settings.json` is never
   edited and never left pointing at production.
4. Seed the reference masters and `UsersRoles`.
5. Seed `Sequences.project_serial` **from the live legacy sequences sheet**,
   read at cutover, not guessed at in advance. The legacy system mints daily,
   so any figure decided earlier will be wrong.
6. Change `SITE_ID` in the production environment variables only. Leave
   `local.settings.json` pointing at development.
7. Confirm the development deployment still reads `bd-pipeline-dev`.
