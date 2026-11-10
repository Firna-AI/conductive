# Chat backend key code

This guide belongs to the [chat backend](README.md). It names the files,
the types, and the functions of the chat backend that a reader opens
first.

- `backend.ts`: `WorkspaceChat`, its gates, its trusted methods, the open
  tabs, and the one publisher of committed events.
- `dependencies.ts`: the default seams of `WorkspaceChat`, which a feature
  owner can replace. The login resolver always wraps an override.
- `operation.ts`: `ChatOperation`, the reads and changes of one route, tab
  subscription, or dispatch, in the serial queue that its caller holds.
- `workspace-integration.ts`: `createWorkspaceIntegration`, which joins
  chat, the lifecycle, and the Mac devices in the workspace object. It
  sets the hooks, and gives the Mac devices the shared state writer.
- `workspace-operations.ts`: `WorkspaceOperations`, the queue-owned work of
  the lifecycle: the first message, the stop, the summary, and the
  lifecycle events.
- `first-message.ts`: the checks and the admission of the first message of
  a create.
- `session-titles.ts`: the empty-name rule for the first session's workspace
  title and each later session's first message with text.
- `workspace-titles.ts`, `title-model.ts`, and `workspace-title.ts`: the
  background model request and the shared title storage and D1 projection.
  The shared writer checks the empty name and workspace access before it
  stores either a Worker title or a runner title.
- `workspace-summary.ts`: `WorkspaceSummaryProjection`, the summary that
  `readChatWorkspaceSummary` returns.
- `workspace-stop.ts`: `stopDispatchedTurns`, which ends the dispatched
  turns as stopped when the lifecycle state becomes stopped or error.
- `browser-authorization.ts`: `authorizeChatBrowser`, the browser gate of
  the object. With the body that the gate already read, it runs
  `gateAccess` in place of `gate`, and finds the workspace again.
  `WorkspaceChat.fetch` uses this form in the queue for each browser write.
- `runner-authorization.ts`: `authorizeChatRunner`, the machine origin and
  token checks before the runner connection opens.
- `browser-subscription.ts`: `subscribeBrowser`, the queue-owned start of
  a browser tab: the login refresh, the tab registration, the close after
  a failed start, and the grant check before the history.
- `browser-request.ts`: the queued browser writes and the transcript read
  that yields between history pages.
- `session-transcript.ts`: the transcript snapshot, metadata reads, and
  page loop through a fixed event cutoff.
- [session-markdown.ts](../../src/shared/transcript/session-markdown.ts):
  `SessionMarkdown`, the pure shared builder of concise and full copies.
- `http-routes.ts`, `send-message.ts`, `messages.ts`, and `sessions.ts`: the
  routes, Send and Retry with linked sessions, the turns, and session state.
- `model-changes.ts`: client session IDs, the creation records that repeated
  requests match, and ID conflicts.
- `store.ts` and `history-storage.ts`: `ChatStore` and `ChatTransaction`,
  the records, the event numbers, the GitHub view of a transaction, and the
  chunks of large file reports and tree deltas.
- `runner-channel.ts`, `runner-receipt.ts`, and `runner-refusal.ts`: the
  runner connection, the stream cursors, the file commands, and the receipt
  or refusal marker of each runner event.
- `runner-output.ts` and `runner-output-state.ts`: the filter from the
  actual start capture, and its encrypted state. Each runner stream keeps
  its held answer text. One workspace record keeps each shown answer end
  that can still start a secret, so a new stream cannot complete such a
  secret. That state, the filtered events, and the raw cursor of the
  stream commit in one transaction. The shared field policy keeps
  operational paths and masks display labels.
- `runner-output.ts` also moves the answer ends of older stream records
  into the workspace record, at the first accepted receipt without that
  record. Held text stays with its own stream, because the held text of
  two streams has no order. A workspace record with no answer ends still
  marks the move as done, so later receipts do not scan older stream
  records again.
- `authenticated-runner.ts`: `AuthenticatedRunner`, the token check of the
  runner connection before each message and while it is idle.
- `runner-event-identity.ts`: `readRunnerEventIdentity` returns the readable
  fields in `RunnerEventIdentity` for refusal, repair, and turn-context checks.
- `runner-delivery.ts`: the sends of pending commands, with the login
  check.
- `ordered-dispatch.ts`: `dispatchInOrder` and `commandDispatchState`, the
  send, wait, or skip check of each pending command in stored order.
- `report-repairs.ts`, `repair-refusal.ts`, and `repair-delivery.ts`: the
  report repair of each kind, its start or failure at a refusal, and its
  sends before the confirm.
- `delivery-state.ts`: dispatch state before sending and queued-state restoration.
- `runner-input.ts`, `runner-event-limits.ts`, `agent-events.ts`, and
  `other-events.ts`: the checks and the caps of runner messages.
  `parseRunnerEnvelope` applies the byte limits to the raw message.
  `parseRunnerOutputEnvelope` checks each filtered event again. It skips
  the byte limits only for file events, because masked labels can make
  them larger.
- `turn-lifecycle.ts`, `turn-events.ts`, `turn-context.ts`, and
  `continuation.ts`: active and waiting turns, the dispatch rule of each
  command, the retry message of a turn end, safe turn context, late data,
  terminal events, and unanswered messages.
- `sockets.ts`: the WebSocket upgrades of tabs and the runner.
- `browser-tabs.ts`: open tabs, their grants, the refresh and expiry
  timers, and the grant check before each send. By default,
  `WorkspaceChat` gives it `readConnectionAccess` from
  [`worker/security/connection-access.ts`](../security/connection-access.ts).
- `router.ts`: `routeChat`, `routeRunner`, and `forwardWorkspaceRequest`,
  which forward the browser chat routes and the runner socket from the
  outer Worker to the object.
- `queries.ts`: the D1 reads of workspaces, tokens, members, and logins,
  and the title update of a workspace.
- `login-access.ts`, `login-availability.ts`, and `login-kind.ts`:
  `readLogin` and the access checks, the metadata query
  `readLoginMetadata`, and the valid login kinds.
- `session-login.ts` and `session-storage.ts`: the two login paths of
  `SessionLogins`, and the defaults of older session records.
- `session-record.ts`: `sessionFor`, the read of one session record.
- `types.ts`: `ChatDependencies`, `ChatCallbackPublisher`, `ChatStorage`,
  and the peer types.
