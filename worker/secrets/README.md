# Org secrets

This folder stores the encrypted secrets of an org and their persistent
grants. The browser settings routes use it. Secrets stay separate from
the env vars that each cloud computer gets at start.

## Storage and access

`org_secrets` holds one record per secret. Its name is unique in its org.
The encryption context binds each value to its org and secret ID.
Metadata reads never select the ciphertext. The creator ID stays as an
opaque attribution ID after account removal. A removed account has no
display record in replies.

Workspace pre-approvals and session approvals reference secret IDs.
Their foreign keys enforce the org of both the secret and workspace.
Deleting a secret deletes both kinds of grant. Sessions live in Durable
Object storage, so their approval rows carry the workspace and session IDs.

The settings API uses the existing member and admin permission helpers.
Each SQL write repeats its membership, suspension, and role checks.
List, create, Replace, and all-agents replies return metadata only.
Reveal uses `POST /api/orgs/:orgId/secrets/:secretId/reveal` with the common
Origin and org write gates. Only an admin can reveal one value.
The reply holds only `value`. Secret metadata includes `lastReveal`, with
`revealedByUserId`, `revealedBy`, and `revealedAt`, or null.
One SQL statement records the reveal and reads its ciphertext,
so an overlapping Replace cannot change which value the record names.

`org_secret_reveals` keeps the org, secret ID, secret name, value version,
admin ID, and time of each reveal. Its org foreign key deletes the records
when the org is purged. Secret and admin IDs are opaque, so deleting a
secret or account keeps the records. No reveal record holds a value.
The last reveal in metadata joins the secret's current value version.
Replace increments that version only when it replaces the value.
Description and all-agents changes keep the version and last reveal.

## Workspace tool routes

The two fixed machine routes use a workspace bearer token on the machine
host. The outer Worker forwards them only to that token's workspace object.
The contracts and path helpers live in
[secret-requests.ts](../../src/shared/secret-requests.ts).

| Method and path | Input | Reply |
| --- | --- | --- |
| `GET /v1/tools/secrets` | Optional `X-Conductive-Turn-Id` header | `{ secrets: [{ name, description, available }] }`. No value |
| `POST /v1/tools/secrets/run` | `X-Conductive-Turn-Id` and `{ names, command, reason? }` | An allowed run gives `{ status: "allowed", values, grants }`. Each other result gives `{ status, requestId, message }` |

The list needs no turn. A running turn in this workspace adds its session
approvals to `available`. Without that turn, only org and workspace grants
count. The run route resolves the session and sender from the stored turn.
It checks the running turn and current access before it returns values.
It never starts the command. The workspace tool starts it with those values
in its environment and hides their exact copies from command output.

`grants` gives `{ name, grant }` for each name. The grant is `all-agents`,
`workspace`, `session`, `15-minutes`, or `workspace-value`.
Names without a grant make one request. The HTTP call waits at most
90 seconds. It then returns `pending` without values and keeps the request
open as `late`. A turn end makes it late too. A late answer cannot return
values to the original call. The agent must make a new run call.

## Browser answers and events

These routes need a signed-in member of the workspace's org. Writes use
the normal Origin and suspension gates. A workspace token cannot answer.

| Method and path under `/api/orgs/:org/workspaces/:workspace` | Contract |
| --- | --- |
| `GET /secret-requests` | `SecretRequestsResponse`: all request records and metadata-only `workspaceValues` |
| `POST /secret-requests/:id/answer` | `AnswerSecretRequest`; returns `{ request }` |
| `DELETE /secret-values/:id` | Removes a workspace value. No body. Returns HTTP 204 |

An answer is one of these JSON objects:

- `{ "kind": "deny" }`.
- `{ "kind": "allow" }` for stored secrets.
- `{ "kind": "values", "lifetime": "15-minutes" | "workspace" | "save", "values": { "NAME": "value" } }`.

Every missing name needs a nonempty value before any grant is written.
A mixed request also approves each stored secret for its session. One
lifetime covers all supplied values. Save uses the request reason as the
description, records the answering member as creator, and leaves the
all-agents mark off. If another request saved that name first, this
answer approves the existing secret and does not replace its value.

The ordered workspace stream carries these metadata-only events. Each
event has the usual workspace ID, event number, and occurrence time.

| Event | Fields | Use in the chat |
| --- | --- | --- |
| `secrets.request.updated` | `sessionId`, full `request` | Upsert by request ID. Use the latest event number |
| `secrets.run` | `sessionId`, `turnId`, `id`, `names`, `command`, `reason`, `grants` | Allowed run card. Fold with its turn |
| `secrets.notice` | `sessionId`, `turnId`, `requestId`, `text` | App line for a delivered late answer |

Request states are `waiting`, `late`, `allowed`, `denied`, and
`not-answered`. `late` is also a permanent boolean. A request that ever
became late stays unfolded after its answer. Place it at `createdAt` in
its original turn. `waiting` belongs above the composer. `late` belongs
in the chat. Both keep needs input while open. Denial uses `answeredBy`
to name the member and says the command did not run.

`notice` is null before a late allow. A delivered notice has
`{ state: "sent", turnId }`. A failed admission has
`{ state: "not-sent", reason }`, where the reason is `login-not-shared`,
`login-unavailable`, or `sender-unavailable`. The grant stays. The widget
can explain how the next message, or restoring the starter's login,
tells the agent. A late deny sends no notice.

The notice starts a turn for the sender of the turn that asked. It uses
that sender's current login rules. It joins a running turn in the same
session and keeps that turn's sender. Both the app line and agent text
name the member who answered. Notice admission is idempotent by request
ID. It never opens a linked session.

After admission releases the chat queue, one delivery helper flushes a
connected runner. Without a runner, it uses the normal open checks and
resume flow, with the accepted turn's sender. Recovery uses the same helper.

No event or transcript insert has a value, command output, command
duration, or command exit code. The browser can fetch `workspaceValues`
after an answer or removal to refresh Capabilities. Fifteen-minute values
do not appear in that list. The shared transcript builder also includes
request cards, run cards, and app notices for copy and `read_session`.
Request copies keep each description and creation order after later answers.

## Durable state and filtering

`SecretRuntime` uses the chat queue. Its request records and browser events
commit together. Storage keys begin with `secrets:v1:`. Large records use
chunks. Temporary values stay encrypted in this object. Their encryption
context binds the workspace and value ID. Fifteen-minute values serve
only the requesting session. Workspace values serve every session until
removal or Archive. An available temporary value takes precedence for
its name. Archive deletes every temporary value.

Archive, org suspension, owner suspension, and session close end open
requests as `not-answered`. `endedBy` gives `archived`, `org-suspended`,
`owner-suspended`, or `session-closed`. Needs input ends when none remain.
Turn end alone keeps an open late request.

The filter reads current ciphertexts for stored secret IDs that a run
used. It keeps no stored value copy in the request records. Replacement
and deletion therefore change the next filter read. Every live temporary
value also enters the filter, including a supplied value before a run.
The filter covers runner text and each request's reason and command.
Expiry and removal also remove temporary copies from encrypted saved
filter state. No automation-specific rule changes these grants.

## Key code

- [data.ts](data.ts): `listSecrets`, `readSecret`, and the encryption context.
- [access.ts](access.ts): the creator and admin rights and guarded SQL access.
- [writes.ts](writes.ts): secret creation, replacement, deletion, and the all-agents mark.
- [reveals.ts](reveals.ts): `recordSecretReveal`, the guarded reveal record and ciphertext read.
- [capabilities-data.ts](capabilities-data.ts): workspace capabilities and session approval metadata.
- [capabilities-writes.ts](capabilities-writes.ts): workspace pre-approvals and removal of session approvals.
- [capabilities-input.ts](capabilities-input.ts): capability request parsing and create defaults.
- [runtime.ts](runtime.ts), [request-run.ts](request-run.ts), and [run-values.ts](run-values.ts): machine calls and their waiters.
- [request-answer.ts](request-answer.ts) and [request-reconcile.ts](request-reconcile.ts): member answers, late notices, and lifecycle cleanup.
- [notice-delivery.ts](notice-delivery.ts): runner delivery and resume after an accepted late notice.
- [request-records.ts](request-records.ts) and [request-storage.ts](request-storage.ts): durable requests and encrypted temporary values.
- [output-values.ts](output-values.ts) and [filter state](../chat/output-filter-records.ts): exact-copy filtering.
- [Settings routes](../app-api/secrets.ts) and
  [capability routes](../app-api/capabilities.ts): the signed-in browser API.

## Development

Run `npm run test -- worker/app-api/secrets.test.ts worker/app-api/secrets-reveal.test.ts worker/app-api/secrets-reveal-lifetime.test.ts worker/app-api/capabilities.test.ts worker/app-api/create-capabilities.test.ts worker/lifecycle/create-capabilities.test.ts worker/devices/mac-access.test.ts` from the repository root.

Run `npm run test -- worker/secrets --maxWorkers=1` for tool routes,
member answers, grants, fake-clock deadlines, lifecycle cleanup,
encrypted value lifetimes, restart, and filtering.

See [Secrets](../../docs/protocol/secrets.md) and
[Secret requests](../../docs/protocol/secret-requests.md) for the requirements.
