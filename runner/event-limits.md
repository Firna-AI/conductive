# Event limits

This guide belongs to the [agent runner](README.md). It gives the limits
that the runner keeps for each event, and the file reports.

The runner keeps each event within the limits that
[Chat and events](../docs/protocol/chat-and-events.md#the-agent-runner) and
[Files and changes](../docs/protocol/workspaces-and-sandboxes.md#files-and-changes)
state. The [shared contracts](../src/shared/README.md) hold the constants.
No variable changes them, and the runner protocol stays at version 1. Each
byte budget measures the event or field after the output filter.

- A tool detail keeps the longest prefix that fits
  [`TOOL_DETAIL_MAX_BYTES`](../src/shared/chat-events.ts), and
  `omittedDetailBytes` counts the rest. A turn summary keeps the first whole
  files within `TURN_COMPLETED_MAX_FILES` and `TURN_COMPLETED_FILES_MAX_BYTES`.
  `omittedFileCount` counts the rest, and the Changes report lists every file.
- Each file event fits [`FILE_EVENT_MAX_BYTES`](../src/shared/files.ts). A
  full tree or changes report goes as numbered parts of one revision. A
  large tree update goes as deltas of at most `FILE_TREE_DELTA_MAX_CHANGES`
  changes, with consecutive revisions.
- Tree and changes reports have separate revision counters, which survive
  a reconnect or a restart. The refresh after each connect sends a full tree
  and a full changes report with newer revisions.
- Before the outbox takes an event number, it checks the complete envelope
  against [`RUNNER_EVENT_MAX_BYTES`](../src/shared/runner.ts). An event
  that does not fit gets a local warning and no number, so later events
  continue. This check covers the size of an event only.
- A confirm can also cover a refusal marker that the workspace stored for
  an event. The runner then removes that event from its outbox and does
  not send it again. The runner never sends a refusal marker.
