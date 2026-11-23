# File reports

This page belongs to [Files and changes](workspace-tools.md#files-and-changes).
It states the limits, the parts, the revisions, and the repairs of the
runner's reports of the file tree and the branch changes. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

- Runner file reports hold at most 256 KiB, or 262,144 bytes, of compact UTF-8 JSON per event.
  This includes the event type, metadata, escapes, and delimiters. It excludes the runner envelope.
- The complete runner envelope also meets the
  [runner event limit](agent-runner.md#the-agent-runner).
  Reason: paths have no fixed byte length, so an item count cannot bound an event.
- Full trees and branch changes lists use numbered parts of one revision (decision 76).
  Every path and entry stays whole. Each path appears once in the complete report.
- Tree reports and branch changes reports have independent revision sequences within one runner stream.
  A new stream starts both at revision 1 with full reports.
- Each part gives its revision, part number, and total part count as positive safe integers.
  Part numbers start at 1 and end at the fixed total part count.
- The runner sends parts in order from one consistent captured state.
  It does not interleave revisions of one report kind, including tree deltas.
- A single-part or empty report uses part number 1 and total part count 1.
  Each changes part repeats the full report's base branch and summary.
- The summary counts the complete list, rather than one part.
  The workspace joins entries in part order and uses the full report atomically.
- The workspace checks the fields of each part when the part arrives.
  It checks for a repeated path only when the last part arrives. A repeated path refuses that last part.
- Reason: a check of each part against all earlier parts takes seconds for a large tree, and a stored index of their paths was rejected (Cal, 20 November 2026).
- A report becomes complete only after every part is stored.
  The workspace keeps the last complete report while parts are pending.
- Parts never join across streams, report kinds, or revisions.
  A conflicting repeated part is invalid. An identical repeated part never counts twice.
- A resend keeps its stream, runner event number, and payload.
  A reconnect keeps pending parts. Confirmation of a part includes its durable assembly state.
- A refused part, a newer full report, or a new stream discards the incomplete report.
- A new full report has a newer revision than the last applied report of its kind.
  It can skip unapplied revisions to recover missing or refused data.
- After a refused tree report or tree delta, the workspace asks for one full file tree, as
  [Lost workspace updates](agent-runner.md#lost-workspace-updates) says (decision 96).
  After a refused changes report, it asks for one full changes list.
- After the refused update, each part of that kind belongs to a replacement.
  The only exception is a remaining part of the refused report or of an earlier report.
- A stored new part 1 after the refused update starts a replacement, also at the revision of the refused report.
- An invalid part counts as a replacement unless its stream, revision, and part number show a remaining part.
  A tree delta is never a replacement, and it never ends or fails an open tree repair.
- Each tree delta holds at most 512 changes and meets the same 256 KiB event budget.
  A large update uses several deltas, each with the next consecutive tree revision.
- Reason: the count cap also bounds the tree work of each event.
- A delta applies only after its previous tree revision is complete.
  The runner increases the branch changes revision by 1 for each new full changes report.
- A browser file event and a browser file response contain complete reports.
  They never expose a runner part as a full tree or changes list.
