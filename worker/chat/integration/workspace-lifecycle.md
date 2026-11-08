# The workspace lifecycle

This page belongs to the [chat backend integration](README.md) guide. It
gives how chat and the lifecycle work together in the workspace object:
the first message, the hooks and events, and the stop and summary. A file
name without a folder names a file in `worker/chat/`.

`createWorkspaceIntegration` joins chat, the lifecycle, the file broker, and the Mac devices
in the workspace object. The object also owns the preview, terminal, desktop, and GitHub handlers. The outer Worker calls the lifecycle through RPC
methods of `Workspace`.

- Chat and the lifecycle share the serial queue of `ChatStore`. Each
  lifecycle change of `Workspace` runs in it through `runLifecycle`, then
  calls `flushRunner`. So a waiting turn goes out when the lifecycle state
  allows it.
- `acceptFirstMessage`, `stopWorkspace`, `commitWorkspaceEvent`, and
  `flushRunner` do not enter the queue. Call them only inside it.
  `workspaceSummary` enters the queue.
- `waitCreationAdmission`, `waitCreationLifecycle`, and `waitLifecycleStart`
  do not hold the queue. So they cannot block the alarm that they wait for.
- A change of a Mac request enters `authorizedWorkspaceOperation` once.
  Inside it, the projection callback of `createWorkspaceIntegration` reads
  the stored session with `chat.store.read`, then calls
  `projectDeviceState` of the controller. The lifecycle reads the waiting
  requests through `deviceWaiting`. Neither read enters the queue again.
  [The shown state](../../lifecycle/recovery-and-shown-state.md#the-shown-state)
  gives the one writer of the D1 state and its event.
- Keep the lifecycle records outside the `chat:v1:` key prefix.

## The first message

- `initializeLifecycle` checks the workspace and the org membership of the
  sender. Then its admission hook gives the assigned first message to
  `acceptFirstMessage`.
- `requireFirstMessage` in `first-message.ts` checks the stored creator,
  the session, the turn, the message ID, and the model choice. A mismatch
  gets `404 workspace_not_found`, and nothing is stored.
- `admitFirstMessage` of the same file needs a stored agent login of the
  sender. One chat transaction stores the session, the message, its first
  turn, and their events. It commits before `initializeLifecycle` returns.
  So the first message is durable before a browser can lose the create
  reply.
- A repeat returns the stored message and adds no history. An archived
  workspace can return its stored first message, but admits no new one.
- The RPC `acceptLifecycleFirstMessage`, or a `runner.ready` event, clears
  the pending first message of the lifecycle.

## Hooks and events

- Each hook passes its `publish` argument to the lifecycle. So the
  lifecycle events of a hook commit in the task of that hook.
- `runnerHello(workspaceId, publish)` runs after each `welcome`, also on a
  stream that is not ready. It repairs the lifecycle, as
  [Turn recovery](../../lifecycle/recovery-and-shown-state.md#turn-recovery) says.
- `runnerReady(workspaceId, publish)` runs after the Durable Object stores
  each `runner.ready` event, and after `runnerHello` on a stream that sent
  it before. It reports the event to the lifecycle. A runner that is ready
  before the start is prepared gets its turns only after that. Their
  messages and model changes wait behind them.
- `runnerEventStored(envelope, publish)` runs after each other stored runner
  event or refusal marker. It reports `turn.started`, `turn.completed`,
  `turn.failed`, and `start.updated`, with no time. The lifecycle reads the
  newest turn end from the committed chat, as
  [Turn recovery](../../lifecycle/recovery-and-shown-state.md#turn-recovery) says. A
  refused `turn.completed` or `turn.failed` ends its lifecycle turn.
- A `workspace.title` updates the name of the workspace in D1. It is not
  unread output.
- `runnerReady` and `runnerEventStored` run after the commit and the
  confirm. A hook error closes the runner connection, and the runner does
  not send that event again. The next `hello` repairs the turns and the name.
- `turnDispatching` registers the sender of a turn with the lifecycle
  before the command goes out. While the lifecycle state allows no turn, it
  returns `false`, and the turn waits. `turnDispatchFailed` removes that
  turn after a failed send. It also removes it when the runner disconnects
  while `turnDispatching` registers the turn, before the send.
- `runnerDisconnected` reports a closed runner connection. It runs later in
  the queue, through `waitUntil`.
- The other lifecycle events go through `commitWorkspaceEvent`, with the
  one chat publisher. No hook calls `appendWorkspaceEvent` while it holds
  the queue.

## Stop and summary

- When the lifecycle state becomes `stopped` or `error`, or a failed create
  clears the lifecycle, `stopWorkspace` closes the runner. It ends each
  running or stopping turn as stopped. Queued turns stay for the resume.
  Device cleanup starts too.
- During org deletion, a missing workspace ends only the state projection.
  Device reconciliation still settles the request and sends its broker cancellation.
- `workspaceSummary` gives the last event number, the last event number
  with visible output, and whether a dispatched turn runs. Its record
  commits with the events and the turns. Queued turns do not count as
  working.
- Known limit: `Workspace.alarm` holds the queue during one lifecycle
  phase. A phase can make several provider requests. Each can take up to 30
  seconds, or 65 for a file read. So a slow phase delays the chat reads, the
  messages, and the runner receipts of that workspace.
