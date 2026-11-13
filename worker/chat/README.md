# Chat backend

This folder holds the chat backend of the workspace Durable Object. One
Durable Object serves one workspace. It keeps the sessions, the messages,
and the chat history of that workspace. It gives each message to the agent
runner in the sandbox. It stores the events of the runner and pushes them
to each open tab. A tab is one browser connection to the events socket.

[Chat and events](../../docs/protocol/chat-and-events.md),
[Agent runner](../../docs/protocol/agent-runner.md), and
[Access and security](../../docs/protocol/access-and-security.md) state the
requirements. This README names the code, its guarantees, and the seams
for other milestones.

A Codex ChatGPT login stores its structured sign-in only in the Worker.
Version 2 delivery gives the runner a turn token and public account claims.
The [Codex authentication backend](../codex-auth/README.md) renews the real
tokens. A failed renewal makes the login unavailable to chat dispatch.

## Entry points

`Workspace` in [`worker/workspace.ts`](../workspace.ts) is the Durable
Object class. Its `fetch` gives device paths to the device feature first.
It gives each other request to `WorkspaceChat.fetch` in `backend.ts`,
which serves these routes. The path helpers live in
`src/shared/sessions.ts`, `src/shared/events.ts`, and
`src/shared/agent-tools.ts`.

| Route | Path helper | What it does |
| --- | --- | --- |
| `GET` sessions | `sessionsPath` | Lists the open sessions and the session history |
| `POST` sessions | `sessionsPath` | Creates a session. The requester becomes its starter |
| `PATCH` session | `sessionPath` | Renames a session |
| `POST` messages | `sessionPaths.messages` | Accepts a message. During a running turn, the message joins that turn. When the starter's login cannot be used, or the starter does not share it with the sender, a new linked session takes it, as [Session logins](integration/README.md#session-logins) says |
| `POST` retry | `retryMessagePath` | Sends the message that `Session.retryMessageId` names again, also to a new linked session. Each other message gets `409 retry_not_available`, as [Retries](#retries) says |
| `POST` interrupt | `sessionPaths.interrupt` | Stops a turn |
| `PUT` model | `sessionPaths.model` | Changes the model. A model of the other agent creates a session that the requester starts |
| `POST` close, reopen | `sessionPaths.close`, `sessionPaths.reopen` | Moves a session to the session history, and back |
| `GET` transcript | `sessionTranscriptPath` | Copies one session as concise or full Markdown |
| `GET` history | `chatHistoryPath` | Reads the stored events of one session in newest-first pages, with `before` and `through` |
| `GET` events socket | `workspaceEventsPath` | Sends the stored history, then each new event |
| `GET` runner socket | `MACHINE_PATHS.runner` | Connects the agent runner on the machine hostname |

The outer Worker forwards each route of this table to the object of its
workspace, as [the integration README](integration/README.md#the-outer-worker)
says. `routeChat` in [`router.ts`](router.ts) forwards the browser routes.
`routeRunner` forwards the runner socket of the machine hostname, by its
bearer token.

Trusted Worker code can also call methods of `WorkspaceChat` that run no
gate. [Trusted workspace calls](integration/README.md#trusted-workspace-calls)
gives their rules.

`Workspace` has these trusted chat RPCs with no HTTP path:

- `acceptLifecycleFirstMessage(first)` returns the stored first message of
  a create. A repeat returns the same message and adds no history.
  Admission cleans an optional `firstSessionTitle` once and saves it before
  the message, in the same transaction.
- `readChatWorkspaceSummary()` returns the last event number, the last
  event number with visible output, and whether a dispatched turn runs.
- `readChatWorkspaceResponse(orgId, workspaceId, appOrigin)` returns the reply of a
  workspace read or Resume and that summary, as
  [Browser routes](../lifecycle/README.md#browser-routes) says.
- `writeAgentSession(input)` accepts trusted tool requests after exact-object, org, archive, and current-sender checks inside the queue.
  The [tools README](../tools/README.md#session-writes) gives its machine routes and resume behavior.
- `manageAgentSession(input, origin)` renames, closes, or stops a session for the stored sender of a tool call.
  It runs the same checks inside the queue, and it uses no admission or resume.
  [Queued management](../tools/sessions.md#queued-management) gives its routes and replies.

[The workspace lifecycle](integration/README.md#the-workspace-lifecycle)
says how the lifecycle and chat work together.

A cross-agent model change uses the client's `newSessionId`. A repeated
request gets the same session. An unrelated occupied ID is refused. A
same-agent change ignores this field.

## Session transcripts

[Session transcripts](../../docs/protocol/session-transcripts.md) states the
copy contract. `GET` of `sessionTranscriptPath` takes `detail=concise` or
`detail=full` and returns `SessionTranscriptResponse`, with a `markdown` string.
A missing or invalid detail gives `400 invalid_input`. A missing session
or a session of another workspace gives `404 session_not_found`.

The route captures one session record, event cutoff, workspace name, member
list, model list, and Mac command list. It then reads each history page
through that cutoff in a separate `ChatStore.run` task. Runner events and
writes can proceed between pages. The captured session record stays fixed.
The shared `SessionMarkdown` folds pages and renders both kinds of copy.
It uses the same grouping, command placement, and words as browser chat.
The route gives it the app origin and the org as `TranscriptDocument.linkContext`.
So the copy of a tool stop writes "Stopped from" and the session link, in angle brackets.
It puts the line of a turn's end reason before the duration and the changed
files of that turn.
The route keeps no generated transcript in storage.

`buildSessionTranscript` also serves the workspace tools through trusted workspace RPCs.
Its `TranscriptAccess` input carries workspace identity and presentation without a browser context.
The machine handler and the target object check access before the build.
The [tools README](../tools/README.md#session-reads) gives the machine paths, query options, reply fields, and size budget.
`transcript-window.ts` selects whole lines or recoverable fragments after the shared build.
The browser copy still returns the complete text with its existing detail query and response shape.

## Session names

[Workspace and session names](workspace-titles.md) gives the background
model request, the shared title writer, the first session name, and the
names of later sessions. It also gives the local development setup.
Workspaces and sessions without a provided name start with null names. The shared `nameLabel` helper
in `src/shared/name-label.ts` gives their display label, "Untitled".

## Stop requests

Stop, a close that stops a turn, and a tool stop or close of an active turn
all call `TurnLifecycle.stop` with a `TurnStopRequester` from
`src/shared/session-stop.ts`.

- A browser request names the authenticated member in `requestedById`.
  A tool request names the calling workspace and session in
  `requestedBySession`, from the stored calling turn. No request body
  names the requester. The references hold IDs only, and no origin.
- `recordStopRequest` in `stop-request.ts` emits `turn.stop-requested`
  before the stop saves its interrupt. So the event commits before the
  runner gets the interrupt.
- `StoredTurn.stopRequest` keeps the first requester. A later request emits
  its own event and leaves that field. The transcript fold keeps the first
  request of each turn, so the chat and the copy name the first stopper.
- An older turn record has no `stopRequest`. When such a turn is stopping
  or has ended, the next request reads the session history for its first
  request.
- The browser rename and the tool rename share `renameSession` in
  `session-management.ts`.
- `readStopRequester` in `src/chat/api/read-stop.ts` reads both event forms
  in the browser. `stoppedAttribution` in the shared turn words gives
  "Stopped from" and the session of a tool stop. The chat line shows that
  session as its session chip, as
  [Sends and Stop](../../src/chat/loads-and-sends.md#sends-and-stop) says.
  The copy gives its link instead.

## Message admission

Send and Retry use the normal login and session checks during a first start.
Accepted messages enter the durable queue while the computer starts or its first start is failed.
Repeats return the stored acceptance and add no message or history.
The same queue also serves later resumes.
Lifecycle readiness controls delivery to the runner.
Try again replaces the failed first computer without accepting the stored messages again.

`send` takes a parsed message and its actual sender, so browser and trusted tool callers share one admission path.
Its optional acceptance callback saves a tool request in the message transaction.
`tool-session-write.ts` owns tool request replay and atomic creation with an optional first message.
`ChatRecords` stores each `ToolSessionRequest` beside its accepted session and message.
The workspace title request removes only the canonical final tool footer from its stored first-message input.

## Access

[Chat backend access and open connections](access.md) gives the gates
that the Durable Object runs itself. It covers the browser gate and its
second check in the queue, the grants of open tabs, the runner token
checks, the runner version, the binding of the object, the login
lookups and checks, and an org suspension. It also gives the native state
of the tab and runner sockets across a wake.

## History and event order

[History and event order](history.md) gives the serial queue, the one
publisher, the event numbers, the runner streams, and the order of the
runner commands.

## Retries

[Retries](retries.md) gives the stored retry state, and the rules of the
retry route for `Session.retryMessageId`.

## Routine first turns

A run workspace reports the stored outcome of its first turn to its D1 run record.
The report keeps the failure cause, including a login failure before dispatch.
A finished first turn resets the routine's consecutive failure count.
A failed first turn adds one failure and stays failed after an in-workspace retry.
Later turns do not change that run outcome.
Chat commits the turn before it reports the outcome.
Each later chat change checks for an unreported outcome, including runner redelivery after a failed D1 write.

## Report repairs

[Report repairs](report-repairs.md) says how the chat backend asks the
runner for one fresh full report after it refuses an update. It describes
the stored records, the refusal checks, and the sends before each confirm.

`workspace-events.ts` defines the private saved event shape and presents browser events.
Each authorized tab socket keeps its app origin and immutable workspace number in its attachment.
Replay and live events get the same fields before they reach the browser.
Older saved workspace updates can omit number and link.
Presentation fills both fields while it keeps each saved name, state, time, and event number.
An older saved update without a GitHub summary presents null.
The HTTP history route uses the same presentation.
No origin is saved in the chat records or the history.

## Tests

```sh
npm run test -- worker/chat
npm run typecheck
```

The shared chat and runner fixtures run the production workspace object in Miniflare with native SQLite.
Their restart helpers evict the real object.
[Chat backend tests](tests.md) names the native controls and each group of tests.

## Seams for other milestones

[Chat attachments](attachments.md) gives the internal storage boundary, acceptance proof, copy preparation and order, agent input, and cleanup integration.
Attachment copies use the provider account of the workspace record.
Each copy checks that account and the sandbox ID before each file and after the last file.

[Chat backend integration](integration/README.md) gives the seams for other
features. It covers the hooks, the trusted workspace calls, the workspace
events, the outer Worker, and the lifecycle. It also covers the files, the
GitHub state, the agent runner, the logins and attachments, the session
logins, and the test fixtures. Its
[Agent runner integration](integration/runner/README.md) page gives the
runner events and the runner commands. Its
[Agent logins and attachments](integration/logins-and-attachments.md) page
gives the agent logins and the attachments.
Its [Outer Worker tests](integration/outer-worker-tests.md) guide gives the
tests through the production Worker entry.

## Key code

[Chat backend key code](key-code.md) names the files, the types, and the
functions of the chat backend that a reader opens first.

`sockets.ts` owns WebSocket upgrades and abstract browser connection setup.
`queries.ts` decrypts native-provider and own endpoint logins inside the Worker.
`login-kind.ts` owns the trusted `AgentLogin` union, separate from the native runner login types.
`login-availability.ts` checks the plain `endpoint_origin` in its one metadata query.
It selects no ciphertext and decrypts no login.
The shared builder refuses every IPv4 and IPv6 address, the product domain, and the configured `PREVIEW_DOMAIN`.
Dispatch still decrypts and checks the full saved address before it sends a turn.
`session-login.ts` treats a refused endpoint as an unusable login for linked-session admission and dispatch.
Its failed-turn cause requires a public HTTPS endpoint with a host name, names the starter and agent, and points to the account page.
Runner delivery maps a valid endpoint to an API-key turn-token credential.
`runner-gateway-command.ts` adds `promptCacheTtl: '1h'` only for a Claude own endpoint turn.
No endpoint address or key enters a runner command or chat record.
`delivery-state.ts` schedules an own endpoint model-list read after dispatch.
The read uses `waitUntil` and does not delay the runner command.
The private turn record keeps its dispatched endpoint model ID.
It follows model commands sent to Claude, which applies them during the turn.
Codex can start a message on another model inside the same turn.
For Codex `agent_model_unavailable` failures, `turn-events.ts` reads the model of the checked `retryMessageId`.
Claude uses the dispatched endpoint model ID, which also supplies the fallback for Codex.
The public cause names the missing model and no host.
Native logins keep their existing cause text.
`endpoint-models.test.ts` checks background dispatch, owner privacy, and both agents' failure text.
`endpoint-logins.test.ts` checks queued turns, session metadata, and refused sends for invalid addresses.

`runner-command-preparation.ts` owns the login and runner capability checks
before dispatch. Own endpoints require support for the agent's API-key
mode. `runner-delivery.ts` owns the prepared command's send.

## Related docs

- [Chat and events: Messages](../../docs/protocol/messages-and-attachments.md#messages)
- [Chat and events: Events](../../docs/protocol/chat-and-events.md#events)
- [Agent runner: Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates)
- [Chat backend integration](integration/README.md)
- [Report repairs](report-repairs.md)
- [GitHub banner backend](../github/README.md)
- [Access and security: Agent logins in a sandbox](../../docs/protocol/isolation.md#agent-logins-in-a-sandbox)
- [Access and security: The workspace token](../../docs/protocol/tokens-and-secrets.md#the-workspace-token)
- [Operator actions: Workspace tokens and runners](../../docs/protocol/operator-actions.md#workspace-tokens-and-runners)
- [Architecture: Workspace Durable Object](../../docs/architecture/components.md#workspace-durable-object)
- [Shared contracts](../../src/shared/README.md)
- [Backend and runner fakes](../test-support/README.md)
- [Browser fakes](../../src/test-support/README.md)
