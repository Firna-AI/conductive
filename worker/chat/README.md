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
Object class. Its `fetch` gives secret and device paths to those features first.
It gives each other request to `WorkspaceChat.fetch` in `backend.ts`,
which serves these routes. The path helpers live in
`src/shared/sessions.ts`, `src/shared/events.ts`, and
`src/shared/agent-tools.ts`.

| Route | Path helper | What it does |
| --- | --- | --- |
| `GET` sessions | `sessionsPath` | Lists the open sessions and the session history |
| `POST` sessions | `sessionsPath` | Creates a session. The requester becomes its starter |
| `POST` explain | `explainSessionPath` | Starts an open session with a selection anchor and a first message that the Worker writes. It uses the requester's choice or default, login, and normal message admission |
| `PATCH` session | `sessionPath` | Renames a session |
| `POST` messages | `sessionPaths.messages` | Accepts a message. During a running turn, the message joins that turn. When the session login cannot serve the sender, a linked session takes the sender's default login, as [Session logins](integration/README.md#session-logins) says |
| `POST` retry | `retryMessagePath` | Sends the message that `Session.retryMessageId` names again, also to a new linked session. Each other message gets `409 retry_not_available`, as [Retries](#retries) says |
| `POST` interrupt | `sessionPaths.interrupt` | Stops a turn |
| `PUT` model | `sessionPaths.model` | Changes the model. A model of the other agent creates a session that the requester starts. A session with no turn yet keeps it and changes its agent |
| `POST` close, reopen | `sessionPaths.close`, `sessionPaths.reopen` | Moves a session to the session history, and back |
| `GET` transcript | `sessionTranscriptPath` | Copies one session as concise or full Markdown |
| `GET` history | `chatHistoryPath` | Reads the stored events of one session in newest-first pages, with `before` and `through` |
| `GET` events socket | `workspaceEventsPath` | Answers the upgrade, then sends the stored history and each new event. A long history goes over several connections, as [History and event order](history.md) says |
| `GET` runner socket | `MACHINE_PATHS.runner` | Connects the agent runner on the machine hostname |

The outer Worker forwards each route of this table to the object of its
workspace, as [the integration README](integration/README.md#the-outer-worker)
says. `routeChat` in [`router.ts`](router.ts) forwards the browser routes.
`routeRunner` forwards the runner socket of the machine hostname, by its
bearer token.

After Explain accepts its written prompt, `routeChat` calls
[`startAcceptedMessage`](../lifecycle/accepted-message-start.ts) outside
the workspace queue. The reply keeps its acceptance fields and adds the
same `resume` status as a tool message. A failed resume check keeps HTTP 201
and the saved prompt. The shared operation applies the normal open checks.

The [secret request feature](../secrets/README.md#browser-answers-and-events)
adds browser list, answer, and temporary-value removal routes.
`fetch-workspace-features.ts` composes their handling. `secret-notice.ts`
admits a late answer as an app line in the original session. It starts
for the original turn sender or joins that session's current turn.
It sends no member message event and creates no linked session.
Secret requests share this object's transaction, event sequence, needs
input projection, turn-end callbacks, and lifecycle cleanup.

Trusted Worker code can also call methods of `WorkspaceChat` that run no
gate. [Trusted workspace calls](integration/README.md#trusted-workspace-calls)
gives their rules.

`Workspace` has these trusted chat RPCs with no HTTP path:

- `acceptLifecycleFirstMessage(first)` returns the stored first message of
  a create. A repeat returns the same message and adds no history.
  Admission cleans an optional `firstSessionTitle` once and saves it before
  the message, in the same transaction.
- `readChatWorkspaceSummary(options?)` returns the last event number, the
  last event number with visible output, and whether a dispatched turn
  runs. With `{ messageWaiting: true }`, it also says whether a message
  waits: a queued message that the runner has not received, or the first
  message of a create that the chat has not accepted yet. The list read
  asks this for each starting workspace. An object that runs older code
  ignores the option and leaves the answer out, which reads as no waiting
  message.
- `readChatWorkspaceResponse(orgId, workspaceId, appOrigin, includeSeed)`
  returns the ordered workspace reply and its chat summary. GET sets
  `includeSeed`. [Browser routes](../lifecycle/routes.md#browser-routes)
  gives both reply shapes.
- `writeAgentSession(input)` accepts trusted tool requests after exact-object, org, archive, and current-sender checks inside the queue.
  The [tools README](../tools/README.md#session-writes) gives its machine routes and resume behavior.
- `writeMergeQueueFix(fix)` accepts a restack request from the merge queue.
  [Queue fix admission](queue-fix.ts) checks that each session is idle and
  uses the newest open session and its login. It stores an ordinary message
  from the queuer. The turn's terminal transaction saves its report for
  the workspace alarm.
- `manageAgentSession(input, origin)` renames, closes, or stops a session for the stored sender of a tool call.
  It runs the same checks inside the queue, and it uses no admission or resume.
  [Queued management](../tools/sessions.md#queued-management) gives its routes and replies.

[The workspace lifecycle](integration/README.md#the-workspace-lifecycle)
says how the lifecycle and chat work together.

A cross-agent model change uses the client's `newSessionId`, unless the
session has no turn yet. Such a session changes its agent in place, checks
the default login for the new agent again, and ignores the field. It fixes
its login only at the first accepted message. A
repeated request gets the same session. An unrelated occupied ID is refused. A
same-agent change ignores this field.

An empty session's `defaultLogin` names its starter's current default owner for every reader.
The metadata check treats the starter as the sender and uses the shared login access query.
The first accepted message fixes `login` and clears `defaultLogin`.

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
- `StoredTurn.stopRequest` keeps the first requester. A new turn record
  starts with `null`, which marks that no request has arrived. A later
  request emits its own event and leaves that field. The transcript fold
  keeps the first request of each turn, so the chat and the copy name the
  first stopper.
- An older turn record has no `stopRequest` field. When such a turn is
  stopping or has ended, the next request reads the session history for its
  first request.
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
`explain-session.ts` checks the selected message and saves the anchored session with its first message in one transaction.
It reads member messages from their stored records and finished agent answers from paged session history, with `agent-message.ts`.
`get_message` uses the same lookup of finished agent answers.
`explain-prompt.ts` builds the prompt with the canonical parent session link.
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

[The workspace read state](history.md#the-workspace-read-state) gives the
stored state and the recovery that the workspace GET uses.

## Retries

[Retries](retries.md) gives the stored retry state, and the rules of the
retry route for `Session.retryMessageId`.

## Runner warnings

[Runner warnings](runner-warnings.md) gives the warning kinds and the
fields for runner connections, for turn ends with no Stop request, and for
runner work that did not finish.

## Automation first turns

A run workspace reports the stored outcome of its first turn to its D1 run record.
The report keeps the failure cause, including a login failure before dispatch.
A finished first turn resets the automation's consecutive failure count.
A failed first turn adds one failure and stays failed after an in-workspace retry.
Later turns do not change that run outcome.
Chat commits the turn before it reports the outcome.
Each later chat change checks for an unreported outcome.
A failed report does not fail the chat change, so a D1 failure cannot stop the chat or close the runner.
It logs `automation_report_failed` and stores the `automation-report` due time of the workspace alarm, 30 seconds later.
The alarm retries the report until it succeeds, as [the object alarm scheduler](../lifecycle/alarm-scheduler.md) says.
A chat without that alarm, as in some tests, gives the error to the caller, which sends the change again.

## Report repairs

[Report repairs](report-repairs.md) says how the chat backend asks the
runner for one fresh full report after it refuses an update. It describes
the stored records, the refusal checks, and the sends before each confirm.

## Browser sockets

`workspace-events.ts` defines the private saved event shape and presents browser events.
Each authorized tab socket keeps its app origin and immutable workspace number in its attachment.
`sockets.ts` reads the `forms` query parameter as a comma list.
The attachment keeps the recognized forms across a wake.
The socket gets `changes.changed` when it names that form.
Each other socket gets a complete `changes.updated` list with the same event number.
When an older socket is open, the runner receipt reads that list once from the projection in its commit task.
The publisher sends it after the commit.
For an older socket replay, the history reader uses the list only at the stored delta's revision.
The replay byte budget counts the form that the socket receives.
[Workspace events](../../docs/protocol/workspace-events.md#events)

Replay and live events get the same fields before they reach the browser.
Older saved workspace updates can omit number and link.
Presentation fills both fields while it keeps each saved name, state, time, and event number.
An older saved update without a GitHub summary presents null.
The HTTP history route uses the same presentation.
No origin is saved in the chat records or the history.

## Skill lists

The chat backend keeps the latest skill lists of the workspace, as
[The list in the workspace](../../docs/protocol/skill-mentions.md#the-list-in-the-workspace)
says. The workspace seed carries the latest `skills.updated` event at its
cutoff, also while the cloud computer sleeps. The history also keeps that
event for socket replay. A runner report passes the output filter first.
That filter leaves out each skill whose name held a secret value.
Then `skill-reports.ts` cuts each description.
`skill-state.ts` stores the result, and it publishes `skills: null` when the
list is unavailable. [Chat backend key code](key-code.md) gives both files.

## Services

[Service reports](../../docs/protocol/service-reports.md) states the
service messages of a runner connection. `RunnerChannel.services` delegates
them to the [services area](../services/README.md) before the numbered reader
and work mark. `runner-hello.ts` negotiates support and requests a fresh report.
Saved connections retain the optional support flag and the connection's
sandbox binding across a wake. Old connections without support stay readable.

Service snapshots and control receipts use `services:v1:` records. They use
no chat commands, cursors, repair records, browser socket kinds, or activity
calls. Raw log assemblies live only in memory. Computer Stop clears service
state through `RunnerChannel.stop` and `WorkspaceServices.stoppedHook`.
Software Restart, including its failure path, keeps the service catalogue.
Its runner disconnect ends an outstanding control as unconfirmed.
The catalogue, controls, and log reads use the
[workspace feature routes](../features/README.md).

## Tests

```sh
npm run test -- worker/chat
npm run typecheck
```

The shared chat and runner fixtures run the production workspace object in Miniflare with native SQLite.
Their restart helpers evict the real object.
The lifecycle fixture uses isolated temporary storage outside the repository.
Restart keeps that storage, and disposal removes it.
[Chat backend tests](tests.md) names the native controls and each group of tests.

## Seams for other milestones

[Chat attachments](attachments.md) gives storage, message proofs, shared file transfers, the one-use machine download route, dispatch order, agent input, and cleanup.
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
Its `AgentLoginOwner` is a personal user ID string or an org owner
`{ orgId }`. The context and decrypt helpers accept both. Personal logins
keep their existing encryption context, and org logins use a separate
`org-agent-login` context.
`login-kind.ts` owns the trusted `AgentLogin` union, separate from the native runner login types.
`login-access-data.ts` owns the access and metadata query for both login owners.
`default-login.ts` owns the default order for sessions, account reads, tools, and automation runs.
`login-availability.ts` checks the plain `endpoint_origin` through that query.
It selects no ciphertext and decrypts no login.
The shared builder refuses every IPv4 and IPv6 address, the product domain, and the configured `PREVIEW_DOMAIN`.
Dispatch still decrypts and checks the full saved address before it sends a turn.
`session-login.ts` treats a refused endpoint as an unusable login for linked-session admission and dispatch.
Its failed-turn cause requires a public HTTPS endpoint with a host name and names the owner and agent.
A personal endpoint cause points to Account settings.
An org endpoint cause points to the Agents tab of the org settings.
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

`runner-command-preparation.ts` owns the login, runner capability, and
repository folder checks before dispatch. Own endpoints require support for the agent's API-key
mode. `runner-delivery.ts` owns the prepared command's send.

`runner-input.ts` keeps only `fileServer: true` from a runner hello.
A missing or false value announces no file server. A value of another
type logs `runner_file_server_invalid` through `warnWorker`, without the
value, and leaves the hello valid. `ActiveRunner` and
`runner-connection-store.ts` keep the announcement across a native socket
wake. A saved connection without the field announces no file server.
The [workspace features](../features/README.md) use the current connection
to gate files preview opens. The
[file server protocol](../../docs/protocol/file-server.md) gives its rules.

`readRunnerEventIdentity` in `runner-event-identity.ts` reads the identity of
each runner event for refusal, repair, and turn-context checks. Its policy,
derived from the shared runner types, gives each known `RunnerEvent['type']`
the scope `turn` or `workspace`. It also gives the source of the session and
the turn: the event root, the nested `start`, or none. The reader takes them
only from that source. A `workspace` event has no source, so it gets no
session and no turn, also when its payload names them.

A private `tool.detail.part` reads as `tool.updated`, so its refusal marker
names that public type. The reader takes its session and turn only from an
object `start`. A later part has no `start`, so `refuseRunnerEvent` reads them
from the saved assembly of its stream, as
[Key code: tool details](key-code-tool-details.md) says. An event of an
unknown type keeps its root IDs. Each check uses a session and a turn only
when `verifiedTurn` finds that turn in that session.

## Related docs

- [Chat and events: Messages](../../docs/protocol/messages-and-attachments.md#messages)
- [Chat and events: Events](../../docs/protocol/chat-and-events.md#events)
- [Session watches](../../docs/protocol/session-watches.md)
- [Agent runner: Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates)
- [Agent runner: Runner warnings](../../docs/protocol/runner-warnings.md)
- [Agent runner: Services](../../docs/protocol/services.md)
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
