# Event limits

This guide belongs to the [agent runner](README.md). It gives the limits
that the runner keeps for each event, and the file reports.

The runner keeps each event within the limits that
[Agent runner](../docs/protocol/agent-runner.md) and
[Files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
state. The [shared contracts](../src/shared/README.md) hold the constants.
No variable changes them.
Runner byte budgets apply after its known-credential filter. Displayed
port-label limits apply later, after the workspace's marked-env filter.

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
- A failed repository scan sends `files.unavailable` and still permits
  `runner.ready`. The next successful tree scan sends a full snapshot.
- Before the outbox takes an event number, it checks the complete envelope
  against [`RUNNER_EVENT_MAX_BYTES`](../src/shared/runner.ts). An event
  that does not fit gets a local warning and no number, so later events
  continue. This check covers the size of an event only.
- A confirm can also cover a refusal marker that the workspace stored for
  an event. The runner then removes that event from its outbox and does
  not send it again. The runner never sends a refusal marker.
- `ports.updated` sends a full list of at most 64 ports. Its private names
  and folders stay complete through the runner filter, outbox, refresh,
  reconnect, and workspace filter. No private prefix or tail cut is safe.
- The runner gives its serialized port report a conservative 512 KiB budget.
  It keeps each port row and fits whole optional labels in port order, name
  first. A label that does not fit becomes null and gets a local warning.
  The complete envelope still passes the existing 1 MiB outbox check.
- After the workspace filter, its port report owner keeps names at 40
  characters and folders at 120. A long folder keeps its end after "…".
  These final excerpts never split a Unicode character.
  [Listening ports](../docs/protocol/agent-runner.md#listening-ports)
  gives the limits of that report: its ports, its names, and its folders.
- `skills.updated` sends at most 200 skills for each agent. The runner
  never cuts a name or a description. It sends a description over 4096
  characters as an empty string, and fits whole descriptions in a 512 KiB
  budget, as [Skills](reports.md#skills) says.
