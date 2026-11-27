# Changes deltas

This page belongs to [File reports](file-reports.md). It states the
changes delta, the update of the branch changes list that carries only the
rows that change. It also states when a full changes list goes instead,
how a connection agrees on deltas, the checks and the repair of a delta,
and how a tab applies a delta. The terms are those of
[File reports](file-reports.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The delta

- When the connection agrees on deltas, as
  [The agreement](#the-agreement) says, the runner sends an update of the
  changes list as a changes delta, in place of a full changes list
  (Cal, 26 November 2026).
  [When a full list goes](#when-a-full-list-goes) gives the exceptions.
- Reason: the cost of each edit then does not grow with the size of the
  list. A Worker that makes full lists from the deltas was rejected,
  because the history and each tab then still pay for the whole list. A
  Worker that makes the deltas from full lists was rejected, because the
  runner then still sends the whole list.
- A changes delta is the runner event `changes.changed`. The workspace
  sends it to a tab as the browser event of the same name. Each event
  holds one `delta`.
- Reason: an older Worker or reader would take the rows of a
  `changes.updated` event as the whole list.
- Each delta carries the next changes revision of its stream, as
  [Parts and revisions](file-reports.md#parts-and-revisions) says.
- Each delta also carries the complete header of the new list: the base
  branch with its display label, the count of unpushed commits, the count
  of uncommitted files, the `summary`, and the `omitted` totals.
- Reason: a complete header costs little, and it needs no rule for an
  absent field.
- The `summary` counts only the listed rows of the new list, as for a full
  list. [Omitted totals](file-reports.md#omitted-totals) gives the other
  totals.
- A delta turns the list of the previous changes revision into the new
  list. The new list holds the rows that
  [Which changes stay](file-reports.md#which-changes-stay) selects, within
  the limit of [Report limits](file-reports.md#report-limits).
- A delta holds `removes`, a list of paths, and `upserts`, a list of rows.
  Each upsert gives `index`, the place of its row in the new list.
- A reader removes the path of each remove and the path of each upsert.
  Then it inserts the upserts in ascending `index`. The result is the new
  list, in the order of the report.
- Reason: a reader cannot repeat the order of the runner exactly, because
  the English collation of paths can differ between ICU versions.
- The runner upserts each new row and each row whose fields change. It
  removes each row that leaves the list, also a row that leaves because of
  the limit.
- An edit of the content of a file that changes no field of its row adds
  no row to the delta. When nothing else changes, the delta has no rows,
  and it carries only the header of the new list.
- Reason: the tree update of the same scan refreshes each edited path, so
  each open file and diff of that path reads again, as
  [Updates and refreshes](file-reports.md#updates-and-refreshes) says.
- An edit of only omitted files gives a delta with no rows and new omitted
  totals.
- A delta holds at most 512 removes and upserts together. It also meets
  the 256 KiB event budget of [Report limits](file-reports.md#report-limits).
- Reason: the count cap bounds the work of each event, as for a tree delta.

## When a full list goes

- The runner sends one full changes list in place of a delta in these
  cases:
  - after each connect, as
    [Parts and revisions](file-reports.md#parts-and-revisions) says
  - after a change of the base commit or of the base branch
  - when the update does not fit one delta
  - while the connection does not agree on deltas
- A large update never goes as several deltas. Reason: the header of each
  event must match the list after that event.
- After a change of the base, each listed diff can change with no change
  of its row. A full list makes each reader read each listed diff again,
  as [In the browser](#in-the-browser) says. Such changes are rare.

## The agreement

- A connection agrees on deltas only when its hello offers them and its
  welcome accepts them.
- Each hello of a runner that can send deltas carries
  `changesDeltas: true`. A welcome that accepts them carries
  `changesDeltas: true` too. A welcome accepts them only when the hello
  offers them.
- Any other hello or welcome agrees on no deltas, also that of older
  software. A value of another type refuses neither the hello nor the
  welcome.
- The runner protocol version stays 2. Reason: an optional field of the
  hello needs no new protocol version, as for complete tool details. A new
  protocol version would also lock a new runner out of the previous
  Worker, as [Runner versions](version-pins.md#runner-versions) says.
- A welcome accepts deltas only while the deployment turns them on with
  `CHANGES_DELTAS`, as [Public variables](../deployment.md#public-variables)
  says.
- The runner chooses between a delta and a full changes list when it makes
  each update, by the latest welcome. A resent event keeps its form,
  because a resend keeps its payload.
- So the workspace applies a valid delta also on a connection whose
  welcome does not accept deltas. Reason: after deltas are turned off, the
  saved events of a runner can still hold deltas.

## Checks and repairs

- The workspace applies a delta only at the next changes revision of its
  stream, and only while no full changes list is incomplete.
- The workspace refuses a delta that breaks the contract
  (Cal, 27 November 2026). These deltas break it:
  - a delta whose revision is not the next one, or that comes while a full
    changes list is incomplete
  - a delta when the workspace holds no changes list, such as after a move
    to another repository, or when it cannot read its saved changes list
  - a delta that removes a path that the list does not hold
  - a delta whose upserts do not ascend by `index`, or that has an upsert
    with an `index` outside the new list
  - a delta in which two removes or upserts have the same path. The
    previous path of a renamed row does not count.
  - a delta whose `summary` does not equal the totals of the listed rows
    after the delta
- After a refused delta, the workspace asks the runner for one full
  changes list, as [Lost workspace updates](lost-workspace-updates.md)
  says (decision 96).
- Reason: no tab then shows a wrong list, and one repair rule covers each
  kind of report. A delta that the workspace applies as well as it can
  was rejected, because a tab then shows a wrong list until the next full
  list. A summary that the workspace counts itself was rejected, because
  a wrong summary of the runner then stays hidden.
- When a delta finds the saved changes list damaged, the workspace drops
  that list and refuses the delta. The next full changes list replaces
  the list in full. A failed storage operation is not damage, so it stays
  retryable, as [The agent runner](agent-runner.md#the-agent-runner) says.
- Reason: a damaged list would otherwise fail the delta on each resend,
  and each later runner event would wait behind it.
- While the saved changes list is damaged, a tab that does not name the
  delta form gets no complete list for that delta.
- The marker of a refused delta names `changes.changed` as its event
  type. Reason: the marker has no session, so no copy of the app shows it,
  also an older one.
- A delta is never a replacement, as
  [Parts and revisions](file-reports.md#parts-and-revisions) says.

## In the browser

- A changes delta reaches a tab in one of two forms, as
  [Events](workspace-events.md#events) says.
- The changes read and each full changes list carry the `revision` of the
  list. A list without it has an unknown revision, such as a list that
  the previous Worker saved.
- A tab applies a delta only at the next revision of its list. After any
  other delta, it reads the list again. This holds after a gap in the
  revisions, and when its list has an unknown revision.
- Reason: a tab then never applies a delta to a list that the delta does
  not fit.
- Each open file and diff of a path that a delta removes or upserts reads
  again. This includes the previous path of each renamed row.
- After a full changes list, each open file and diff of each path of the
  old and the new list reads again. A change of the base sends a full list
  because it can change each listed diff without changing its row. A Git
  attribute edit can also change a listed diff without changing its row.
- [Chat history](chat-history.md) states which deltas the stored history
  keeps.
  [Older runners and readers](file-reports.md#older-runners-and-readers)
  states what older runners, the previous Worker, and older tabs get.
