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

The Durable Object runs the gates itself.

- A forwarded browser chat request keeps the body limit of the Worker
  entry and the host and `Origin` checks. The outer Worker skips its
  request gate, so only the gate of the Durable Object parses the JSON body.
- `authorizeBrowser` runs `gate` from `worker/security/gate.ts`, the gate
  of the other app routes. It checks the app hostname, the `Origin`
  header, the session cookie, the org membership, and the body of writes.
- `findChatWorkspace` then reads the workspace from D1. The workspace must
  belong to that org, and the org must not be deleted.
- Each browser write then enters the serial queue of the object. In the
  queue, `authorizeChatBrowser` checks the access again, with the body that
  the gate already read and the time of the queued check. It runs
  `gateAccess`, the [access checks](../security/README.md#access-checks) of
  the gate, and reads the workspace and its archive state again. This
  repeats the D1 reads of the first check. So a write that waited for its
  body or for the queue gets the refusal that a new request would get. An
  example is `401 sign_in_required` after a sign-out. The write saves
  nothing. Reads and the events socket take no second check. The transcript is a read,
  so archived and suspended-org workspaces remain readable. Closed sessions
  remain readable too. A sandbox token cannot pass the browser sign-in gate.
- Each open tab holds a `workspace` identity. The
  [shared connection reader](../security/README.md#open-connections) of
  the security area gives it a grant with a deadline. The `workspace` kind
  needs no running sandbox. So the tabs of a stopped or archived workspace
  stay open.
- The Durable Object reads the first grant of a new tab before the
  history read. It checks the grant again before it sends the history. A
  tab without a valid grant gets no history and `404 workspace_not_found`.
- Each event send checks the grant first, without a D1 read. A tab with
  an expired grant closes and gets no event.
- Every 15 seconds, one D1 query refreshes the grants of all open tabs.
  The refresh closes each tab without a new grant. Sign-out, membership
  removal, a suspension of the user, session expiry, and org deletion end
  access. A failed read closes each tab of its batch.
- A separate expiry timer closes each tab at its grant deadline, also
  while a refresh read waits. A late read result cannot reopen a closed
  tab.
- Both timers stop when the last tab closes.
- An archived workspace still serves its history and its events socket.
  Each write gets `409 workspace_archived`.
- `connectRunner` accepts only `/v1/runner` on `MACHINE_ORIGIN`, with
  `Authorization: Bearer <workspace token>`.
- `tokenWorkspace` hashes the token. It accepts a token that is not
  revoked, of a workspace that is not archived, in an org that is not
  deleted, with an owner who is not suspended.
  `workspaceTokenAccessPredicate` in
  [`workspace-token-access.ts`](../data/workspace-token-access.ts) holds
  that rule. The agent tools, the git credential route, and the Mac
  commands use it too.
- The runner sends `hello` first, with `RUNNER_PROTOCOL_VERSION` and its
  workspace ID. A new runner connection closes the previous one.
- `AuthenticatedRunner` keeps the token hash of its connection. It checks
  the token rule again before each message that it sends or receives, and
  every 15 seconds while the connection is idle, with no cached result. A
  failed rule or a failed read closes the connection.
- The first workspace that passes a gate binds the Durable Object. Each
  other workspace gets `404 workspace_not_found`. So does a workspace that
  `matchesObject` refuses, because `WORKSPACES.idFromName` names another
  object.
- Every login lookup goes through `SessionLogins`. Its credential path uses
  `readLogin` in `login-access.ts`, the only caller of `resolveLogin`. It
  reads the agent login of a starter or of a linked-session member, for one
  agent. `resolveLogin` first checks the workspace, that user, the sender,
  and the runner token in one D1 read. The workspace must pass the token
  rule above, without the token. That user and the sender must be members
  who are not suspended. The same read checks the share setting of the
  login, `agent_logins.no_reuse`, before it reads a secret. An override
  replaces only the login read. A refusal to share keeps the starter's own
  login available, so `SessionLogins.observe` stores
  `loginAvailable: true` and `loginShared: false`. Send uses the existing
  empty linked session, and queued member commands cannot receive the
  starter's login while the starter does not share it.
- Its metadata path, `readLoginMetadata`, reads only the membership, the
  suspension, the stored login kind, and the share setting of each starter,
  in one D1 query. It returns a map of `SessionLoginMetadata` by session
  ID. A valid login gives `loginAvailable: true`, and `loginShared` is true
  when `no_reuse` is 0. A missing or invalid login gives false for both.
  The workspace must also pass the token rule above. So a suspended starter
  or a refused workspace shows an unavailable login. The result sets only
  `loginAvailable` and `loginShared`, so the session list, the history, and
  the event subscription stay readable. It reads no ciphertext.
- A revoked or replaced runner token closes that connection without a
  login, and the command stays queued. A sender who left the org gets no
  login either. [Session logins](integration/README.md#session-logins) says
  when the workspace checks the starter's login. The storage never holds a
  login.

An org suspension keeps chat history and event subscriptions readable.
The common browser write gate refuses session and message changes with `org_suspended`.
The second access check of each browser write refuses such a change again in the queue.
This also holds when the suspension starts while the change waits.
The shared token rule refuses runners and agent logins for the org.

## History and event order

[History and event order](history.md) gives the serial queue, the one
publisher, the event numbers, the runner streams, and the order of the
runner commands.

## Retries

[Retries](retries.md) gives the stored retry state, and the rules of the
retry route for `Session.retryMessageId`.

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
[Outer Worker tests](integration/outer-worker-tests.md) guide gives the
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
