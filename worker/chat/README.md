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
| `GET` history | `chatHistoryPath` | Reads the stored events of one session |
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
- `readChatWorkspaceSummary()` returns the last event number, the last
  event number with visible output, and whether a dispatched turn runs.
- `readChatWorkspaceResponse(orgId, workspaceId, appOrigin)` returns the reply of a
  workspace read or Resume and that summary, as
  [Browser routes](../lifecycle/README.md#browser-routes) says.

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
The route keeps no generated transcript in storage.

## Session names

[Workspace and session names](workspace-titles.md) gives the background
model request, the shared title writer, the first session name, and the
names of later sessions. It also gives the local development setup.
New workspaces and sessions have null names. The shared `nameLabel` helper
in `src/shared/name-label.ts` gives their display label, "Untitled".

## Message admission

Send and Retry use the normal login and session checks during a first start.
Accepted messages enter the durable queue while the computer starts or its first start is failed.
Repeats return the stored acceptance and add no message or history.
The same queue also serves later resumes.
Lifecycle readiness controls delivery to the runner.
Try again replaces the failed first computer without accepting the stored messages again.

## Access

[Chat backend access](access.md) gives the gates that the Durable Object
runs itself. It covers the browser gate and its second check in the
queue, the grants of open tabs, the runner token checks, the workspace
version pin, the login lookups, and an org suspension.

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
Each authorized connection captures its app origin and immutable workspace number.
Replay and live events get the same fields before they reach the browser.
Older saved workspace updates can omit number and link.
Presentation fills both fields while it keeps each saved name, state, time, and event number.
The HTTP history route uses the same presentation.
No origin is saved in the workspace object.

## Tests

```sh
npm run test -- worker/chat
npm run typecheck
```

The shared chat and runner fixtures run the production workspace object in Miniflare with native SQLite.
Their restart helpers evict the real object.
[Chat backend tests](tests.md) names the native controls and each group of tests.

`write-access.test.ts` holds a rename at its body read or in the queue.
Then one access fact ends, such as a sign-out, a removal from the org, or
an archive. The rename gets the refusal that a new request would get, and
saves nothing. A new refused request leaves its body unread.

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
