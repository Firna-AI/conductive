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
| `turn_ended_without_stop_request` | After the commit that stores a turn end with no Stop request | `workspaceId`, `turnId`, `state`, `connectionId`, `streamId`, `processStartId`, `protocolVersion` |
| `workspace_provider_resume_refused` | A provider-stop continuation cannot queue automatic Resume because access or another request rule refuses it | `workspaceId`, `error` |

- `message` is a fixed text for each kind.
- The automatic-resume warning keeps the checked workspace ID and the
  structured error kind, status, and code. It keeps no error message.
  [Provider stops](provider-stops.md) gives the retained queued turn.
- `state` is `finished`, `stopped`, or `failed`.
- `connectionId` is `ActiveRunner.id`, the ID that the workspace gives the
  runner connection. A turn end takes the connection that is current at
  its commit, not the connection that got the turn.
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
- [`worker/warnings.test.ts`](../warnings.test.ts) checks that the
  explicit field selection drops private fields and invalid values.
