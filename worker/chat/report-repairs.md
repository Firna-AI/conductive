# Report repairs

This guide belongs to the [chat backend](README.md). It describes how the
workspace Durable Object asks the runner again for a full report after a
refused report event.
[Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates)
states the rules. A report repair is the stored `report.refresh` command of
one `RunnerReportKind`.

- `ReportRepairs` on `ChatTransaction.repairs` keeps one record for each kind
  under the `chat:v1:report-repair:` prefix.
- Refusal checks use one identity reader. It reads only the event type,
  session and turn IDs, and the revision and part number of a full file report.
  Each unreadable field is null. The checks use this identity, the envelope
  stream, and the stored records. Part count and payload contents do not
  identify an old tail.
- A record holds its command, its cause, its state, a `sent` flag, and a
  `replacementRevision`. The cause is the stream and the event number of the
  first refusal. For a file kind, it also holds the newest applied,
  incomplete, or refused full-report revision. The state is `pending` or
  `failed`.
- `refuseRunnerEvent` calls `refuseReportRepair` before `refuse(type)`
  discards the incomplete file report. So the check still reads the revision
  of that report.
- The first refusal of a kind saves a `pending` record with a new command ID.
  A later refusal of a replacement sets `failed`, and its marker gets
  `repairFailed`. A remaining part or a tree delta changes nothing.
- A stored new part 1 of a multipart report on the cause stream sets
  `replacementRevision`. So the later parts of a reused revision count as a
  replacement.
- The record, the marker, and the cursor commit in the receipt transaction.
- A complete tree, changes list, start steps, name, or port list removes the record of
  its kind in the same transaction. A tree delta and a pending part do not.
- After the commit, `RepairDelivery.flush` sends each `pending` record whose
  `deliveredTo` does not name the current connection. Each send then
  commits `sent` and `deliveredTo`. A wake keeps the connection ID, so it
  sends no record again.
- Only then does `RunnerChannel` send the confirm and run the hooks. A send
  failure or a failed `sent` commit throws. The channel then closes the
  connection without the confirm.
- The `welcome` holds `confirmedThrough` below the cause of each `pending`
  record of its stream that no connection got. So the runner sends that
  event again, and the channel confirms it as a duplicate.
- After the `welcome`, the channel sends the repairs before the other
  commands. A repair needs no `runner.ready` and carries no login, so its
  send runs no login check. Like each send, it first passes the token
  check of `AuthenticatedRunner`, as the
  [chat backend access guide](access.md) says.
- Turn, message, interrupt, model, and file commands still wait for
  `runner.ready`.
- Each new connection gets each `pending` record again, with the same
  command ID. A `failed` record is never sent again.
