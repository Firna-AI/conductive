# Runner warnings

[Runner warnings](../../docs/protocol/runner-warnings.md) states when the
Worker writes each warning about the agent runner, and what a warning may
hold. This page gives the warning kinds and their fields.

The chat backend writes each warning through `warnWorker` in
[`worker/warnings.ts`](../warnings.ts). `warnWorker` selects each field
explicitly, because a typed caller can still supply extra fields.
[`worker/warning-types.ts`](../warning-types.ts) holds the kinds.

| Kind | When | Fields after `kind` and `message` |
| --- | --- | --- |
| `runner_connected` | After the first accepted hello of a runner connection. A connection that closes before such a hello gets it just before its `runner_disconnected` | `workspaceId`, `connectionId`, `streamId`, `processStartId`, `protocolVersion` |
| `runner_disconnected` | When the runner connection ends | `workspaceId`, `connectionId`, `streamId`, `processStartId`, `protocolVersion` |
| `runner_work_interrupted` | At the first runner work after a new start of the workspace object, when an earlier object left the record of runner work that did not end | `workspaceId`, `connectionId`, `streamId`, `processStartId`, `protocolVersion`, `work`, `stage`, `eventType`, `eventNumber`, `size` |
| `turn_ended_without_stop_request` | After the commit that stores a turn end with no Stop request | `workspaceId`, `turnId`, `state`, `connectionId`, `streamId`, `processStartId`, `protocolVersion` |

- `message` is a fixed text for each kind.
- `state` is `finished`, `stopped`, or `failed`.
- `connectionId` is `ActiveRunner.state.id`, the ID that the workspace
  gives the runner connection. A turn end takes the connection that is
  current at its commit, not the connection that got the turn.
- `processStartId` is the `hello.processStartId` of the runner connection.
  One runner start keeps it across reconnects, and each new start sends a
  new one, as
  [Process starts](../../docs/protocol/runner-warnings.md#process-starts)
  says.
- A value that is not available is null. A connection that closes before an
  accepted hello has a null `streamId`, `processStartId`, and
  `protocolVersion`. A hello without `processStartId`, such as from an
  older runner, and a saved record without it also give a null
  `processStartId`.
- `workspaceId`, `connectionId`, and `turnId` must pass
  `WarningId.checked`. `streamId` and `processStartId` must pass
  `WarningStreamId.checked`, a UUID check. An ID that fails its check shows
  as `unknown`. `protocolVersion` must be a positive safe integer, or it
  shows as null. [`worker/warning-values.ts`](../warning-values.ts) holds
  these checks.
- `warningProcessStartId` in the same file reads `processStartId` from the
  hello and from the saved record. It never throws, so this field refuses
  no hello and fails no restore. It keeps a value that passes the UUID
  check. A missing or null value becomes null, and each other value
  becomes `unknown`.
- [`runner-diagnostics.ts`](runner-diagnostics.ts) builds the connection
  fields and writes the connection warnings.
- A restore of the saved runner connection writes no `runner_connected`.
  A restored connection with no accepted hello yet still gets it at its
  first accepted hello, or just before its `runner_disconnected`.
- A restored connection keeps the saved `processStartId`. A saved record
  without it restores by the same rules.
- When `restore` refuses the matching saved connection, such as for an
  unsupported protocol version, it writes `runner_disconnected` with the
  checked values of the saved record. A socket that does not match the
  saved record writes no warning.
- A failed commit writes no turn warning. A resent end of the runner then
  writes the one warning, at its commit.
- A turn record with `stopRequest: null` needs no history read. For an
  older record without that field, a stopping turn reads the session
  history at its end. When that read fails, the end writes no warning and
  still completes.

## Interrupted runner work

[`runner-work-watch.ts`](runner-work-watch.ts) keeps the record of
[Runner work that did not finish](../../docs/protocol/runner-warnings.md#runner-work-that-did-not-finish).

- `nativeRunnerWorkStorage` keeps the record under one chat storage key.
  It writes with plain storage calls, outside the chat transactions, and
  then calls `storage.sync()`. Without the sync, a reset during work that
  never waits for I/O loses the record with its implicit transaction.
- Plain writes add no transaction to a runner message. They also stay out
  of the commit hooks of the native test storage, so a commit fault that a
  test injects still reaches the chat change.
- After the purge of a deleted org, a workspace keeps no records. So the
  storage reads the purge fence and saves no record after a purge.
- `RunnerWorkWatch.check` reads the record once in each object instance,
  before the first runner work, writes the warning, and deletes the record.
- The chat dependency `runnerWork` gives the storage. Without it, the
  watch marks nothing.
- [`runner-receive.ts`](runner-receive.ts) parses each runner message,
  writes `runner_message_failed` when it fails, and ends the record in a
  `finally` block. The runner channel updates the stage to `after_commit`.
- The hello sets `ActiveRunner.state.watchUntil`. The saved runner
  connection keeps it, so a wake from hibernation keeps the window to its
  original end. A saved connection without the value, such as from an
  older Worker, has no window.
- Each record step is best effort and ignores its own failure.
- [`warning-runner-work.ts`](../warning-runner-work.ts) checks the values
  again when the warning is written.

## Tests

- `runner-connection-diagnostics.test.ts` checks the connect and
  disconnect warnings, also for a socket with no hello.
- `turn-end-diagnostics.test.ts` checks the turn warnings of each state,
  an older turn whose Stop request is only in its history, a rolled-back
  end, and a resent end.
- `turn-end-reports.test.ts` checks that a turn warning takes the runner
  that is current at its commit. A runner of another workspace, or no
  runner, gives null connection fields.
- `runner-native-close.test.ts` checks that a hibernation writes no
  warning, and that a close as the first wake event writes the disconnect.
  Its cases restore a saved `processStartId` that is valid, missing, or
  invalid.
- `runner-version.test.ts` checks a refused hello: the version warning,
  then the connect and disconnect warnings with null `streamId` and
  `protocolVersion`.
- `runner-native-version.test.ts` checks a refused restore of the saved
  connection: no new connect warning, and one disconnect warning with the
  saved values. Its saved `processStartId` is valid, missing, invalid, or
  null.
- `runner-work-watch.test.ts` holds an event after its commit, resets the
  object without waiting for its work, and connects again. It checks one
  warning with the event values and the `after_commit` stage, no warning
  after work that ended, and no record after the watch window.
- `runner-work-wake.test.ts` counts the writes of the record across two
  wakes: work 10 seconds after the hello still gets a record, and work at
  30 seconds gets none.
- [`worker/warnings.test.ts`](../warnings.test.ts) checks that the
  explicit field selection drops private fields and invalid values.
