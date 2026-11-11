# Chat backend key code

This guide belongs to the [chat backend](README.md). It names the files,
the types, and the functions of the chat backend that a reader opens
first.

- `backend.ts`: `WorkspaceChat`, its gates, its trusted methods, the open
  tabs, and the one publisher of committed events.
- `workspace-binding.ts`: `ChatWorkspaceBinding`, which binds chat to one workspace and checks the object identity.
- [../model-gateway/workspace.ts](../model-gateway/workspace.ts): `WorkspaceTurnTokens`, available through `WorkspaceChat.turnTokens`.
  It derives a running turn's token and checks the starter's current login in the chat queue.
  Runner delivery gets the token of each version 2 `turn` command from `forRunningTurn`.
- `dependencies.ts`: the default seams of `WorkspaceChat`, which a feature
  owner can replace. The login resolver always wraps an override.
- `operation.ts`: `ChatOperation`, the reads and changes of one route, tab
  subscription, or dispatch, in the serial queue that its caller holds.
- `workspace-integration.ts`: `createWorkspaceIntegration`, which joins
  chat, the lifecycle, and the Mac devices in the workspace object. It
  sets the hooks, and gives the Mac devices the shared state writer.
- `workspace-operations.ts`: `WorkspaceOperations`, the queue-owned work of
  the lifecycle: the first message, the stop, the summary, and the
  lifecycle events. Its stop transaction clears the port report with
  `ports: null`, including when the workspace has no previews.
- `first-message.ts`: the checks and the admission of the first message of
  a create.
- `session-titles.ts`: the empty-name rule for the first session's workspace
  title and each later session's first message with text. A text with only
  the mentions of its own attached files counts as no text. In a title, each
  such mention becomes the original name of its file.
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
  `browserRequest` uses this form in the queue for each browser write.
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
- `routine-run.ts`: reports a routine's stored first-turn result after a chat transaction commits.
- `workspace-store.ts`: creates the chat store with lifecycle turn-end reports and routine outcome recovery after each change.
- `runner-channel.ts`, `runner-receipt.ts`, and `runner-refusal.ts`: the
  runner connection, the stream cursors, the file commands, and the receipt
  or refusal marker of each runner event. A connection keeps the protocol
  version of its `hello`, 1 or 2, and its `welcome` repeats that version.
  It also keeps `hello.loginKinds` for the connection's dispatch checks.
- `runner-connections.ts` and `runner-connection-store.ts`:
  `RunnerConnections`, the native acceptance, restore, close, and idle
  alarm of the current runner, and the chunked durable record of a
  physical runner socket. That record keeps the negotiated protocol
  version and the login kinds declared in `hello`.
  A record without login kinds keeps that list absent for legacy support.
  So after a wake, the runner keeps its login support and gets the commands
  of its version with no second `hello` or `welcome`.
- `runner-output.ts` and `runner-output-state.ts`: the filter from the
  actual start capture, and its encrypted state. Each runner stream keeps
  its held answer text. One workspace record keeps each shown answer end
  that can still start a secret, so a new stream cannot complete such a
  secret. That state, the filtered events, and the raw cursor of the
  stream commit in one transaction. The shared field policy keeps
  operational paths and masks display labels. It masks each complete port
  name and folder before the workspace display excerpt and the second parse.
- `runner-output.ts` also moves the answer ends of older stream records
  into the workspace record, at the first accepted receipt without that
  record. Held text stays with its own stream, because the held text of
  two streams has no order. A workspace record with no answer ends still
  marks the move as done, so later receipts do not scan older stream
  records again.
- `authenticated-runner.ts`: `AuthenticatedRunner`, the token check of the
  runner connection before each message. `RunnerConnections.alarm` runs it
  while the connection is idle.
- [`runner-version-data.ts`](runner-version-data.ts): `readRunnerProtocolVersion`, the workspace pin read before a runner's welcome or commands.
  [`runner-handshake.ts`](runner-handshake.ts): `prepareRunnerHello` checks the `hello`, closes a runner below that pin, and starts the stream before the `welcome`.
- `runner-event-identity.ts`: `readRunnerEventIdentity` returns the readable
  fields in `RunnerEventIdentity` for refusal, repair, and turn-context checks.
- `runner-delivery.ts`: the sends of pending commands, with the login
  and runner support checks and the current branches that `branch-data.ts`
  reads. Each command
  takes the shape of the connection's protocol version. Version 1 gets the
  real login in each `turn` and `message` command. Version 2 gets a turn
  token in each `turn` command, after the running state commits, and no
  credential in a `message` command.
  `gatewayRunnerCommand` in `runner-gateway-command.ts` builds that
  version 2 command. Delivery skips a command whose `deliveredTo` names
  the current connection. Internal `PreparedCommand` holds the full login and
  relative attachment paths. `ResolvedCommand` holds the live absolute paths.
  The derived version 1 wire type excludes Codex ChatGPT sign-ins.
  `runnerSupportsLogin` in the shared runner contract owns the exhaustive
  rule for each login kind and protocol version. An absent `loginKinds`
  list keeps legacy support. An explicit version 2 list names its support.
  Version 1 cannot opt into ChatGPT. An unsupported turn or message gets
  one failed end before any login or turn token reaches the runner.
  [The agent runner](integration/runner/README.md#the-agent-runner) gives
  the rules of both versions.
- `runner-login-failure.ts`: `failCommandLogin`, the turn failure of a
  command whose login cannot run, after the runner or at once.
- `attachment-paths.ts`: the captured repository folder lookup and the
  absolute attachment paths of each runner send.
- [`src/shared/attachment-paths.ts`](../../src/shared/attachment-paths.ts):
  `attachmentPath`, the relative copy path of a file from its ID and its
  name. The upload reply, admission, the copy, and the proof check use it.
  The development fakes share it.
- `ordered-dispatch.ts`: `dispatchInOrder` and `commandDispatchState`, the
  send, wait, or skip check of each pending command in stored order.
- `report-repairs.ts`, `repair-refusal.ts`, and `repair-delivery.ts`: the
  report repair of each kind, its start or failure at a refusal, and its
  sends before the confirm.
- `delivery-state.ts`: dispatch state before sending, queued-state restoration, and the `deliveredTo` receipt of a sent command.
- `port-reports.ts`: the listener-list parser, final port-label excerpts, and
  displayed-label checks. Private labels stay complete for the output filter.
  Runner reports require a sorted unique array. Only a workspace stop
  publishes a null list.
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
  `TurnLifecycle.runnerEnded`, `workspaceStopped`, and `fail` handle each source of a turn end.
  `fail` ends a queued turn at once. Runner compatibility failures use its
  immediate mode for both queued and running turns. A running failure
  keeps an interrupt for the prior process after the turn ends.
  A failed token or gateway check calls it for a running turn.
  Then `fail` keeps its Stop and cause until a runner end or workspace stop.
  `TurnCompletion.finish` in `turn-completion.ts` commits each end, updates the session, and advances waiting work.
  It also records the turn ID of the end in `ChatTransaction.endedTurns`.
- `turn-end-reports.ts`: `TurnEndReports` keeps the recorded ends of each
  committed transaction. `ChatStore.reportTurnEnds` gives each end to the
  `turnEnded` hook. It runs after the runner confirm, before each dispatch,
  and at the end of each queued task. So the workspace lifecycle gets each
  end by its turn ID, from one path, whatever ended the turn.
- `sockets.ts`: the WebSocket upgrades of tabs and the runner.
- `browser-connections.ts` and `browser-registration.ts`:
  `BrowserConnections`, the native acceptance, restore, and close of tab
  sockets, and the read of a saved registration.
- `browser-tabs.ts`: open tabs, their grants, the batch refresh, the
  `browser` alarm deadlines of physical tab sockets, and the grant check
  before each send. By default,
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
  `PreparedCommand`, `ResolvedCommand`, and the peer types.
