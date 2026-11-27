# File reports

This page belongs to [Files and changes](workspace-tools.md#files-and-changes).
It states the limits, the parts, the revisions, and the repairs of the
runner's reports of the file tree and the branch changes. It also states
which entries and changes a report keeps, the totals of the rest, the
updates of the tree, and the rollout to older runners and readers.
[Changes deltas](changes-deltas.md) states the updates of the changes
list. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Terms

- **Changes delta:** an update of the changes list that carries only the
  rows that change, as [Changes deltas](changes-deltas.md) says.
- **Listed:** an entry of the tree, or a changed file, that a complete
  report holds.
- **Omitted:** an entry or a changed file that the scan of the runner
  finds, but that the report leaves out because of its limit.
- **Omitted totals:** the number of omitted entries of a tree report, or
  the number of omitted files of a changes report with the lines that
  they add and remove.
- **Context-only entry:** a file or a folder that only the scan of the
  [context folder](repository-folders.md#the-context-folder) adds to the
  tree.

## Report limits

- Runner file reports hold at most 256 KiB, or 262,144 bytes, of compact UTF-8 JSON per event.
  This includes the event type, metadata, escapes, and delimiters. It excludes the runner envelope.
- The complete runner envelope also meets the
  [runner event limit](agent-runner.md#the-agent-runner).
  Reason: paths have no fixed byte length, so an item count cannot bound an event.
- A complete tree report of a new runner holds at most 50,000 entries.
  Files and folders count together, and each path counts once.
- A complete changes report of a new runner holds at most 1,000 changed
  files.
- Reason: the Durable Object of one workspace has a memory limit of
  128 MB. Large reports passed that limit while the object stored,
  published, or replayed them (Cal, 20 November 2026).
- These ways were not chosen:
  - A changes list at most once in N seconds. The panel then lags.
  - A tree without the ignored folders under `.context/`. The entry limit
    covers them too.
- Most updates of the changes list send only the rows that change, as
  [Changes deltas](changes-deltas.md) says (Cal, 26 November 2026). The
  deltas do not replace the limit, because each connect still sends a
  full changes list.
- The limits apply only to the reports. The files on disk, Git, the read
  of a path, and the access checks do not change.
- The count limits do not replace the 256 KiB event budget or the
  512-change limit of a tree delta. So a report within its count limit
  can still take many parts.
- The end-of-turn file list keeps its own limit of 200 unique paths, as
  [The agent runner](agent-runner.md#the-agent-runner) says.

## Parts and revisions

- Full trees and branch changes lists use numbered parts of one revision (decision 76).
  Every path and entry stays whole. Each path appears once in the complete report.
- Tree reports and branch changes reports have independent revision sequences within one runner stream.
  A new stream starts both at revision 1 with full reports.
- The runner sends a full tree and a full changes list after each connect,
  also on a reconnect of the same stream. Reason: the workspace then gets
  complete reports again soon after each connect, also when an earlier
  update was lost.
- Each part gives its revision, part number, and total part count as positive safe integers.
  Part numbers start at 1 and end at the fixed total part count.
- The runner sends parts in order from one consistent captured state.
  It does not interleave revisions of one report kind, including tree deltas.
- A single-part or empty report uses part number 1 and total part count 1.
  Each changes part repeats the full report's base branch and summary.
- The summary counts the listed changes of all parts, rather than one part.
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
  After a refused changes report or changes delta, it asks for one full changes list.
- After the refused update, each part of that kind belongs to a replacement.
  The only exception is a remaining part of the refused report or of an earlier report.
- A stored new part 1 after the refused update starts a replacement, also at the revision of the refused report.
- An invalid part counts as a replacement unless its stream, revision, and part number show a remaining part.
  A tree delta or a changes delta is never a replacement. It never ends or fails an open repair of its kind.
- Each tree delta holds at most 512 changes and meets the same 256 KiB event budget.
  A large update uses several deltas, each with the next consecutive tree revision, except as
  [Updates and refreshes](#updates-and-refreshes) says.
- Reason: the count cap also bounds the tree work of each event.
- A tree delta applies only after its previous tree revision is complete.
  The runner increases the branch changes revision by 1 for each new full changes report and for each changes delta.
- A browser file event and a browser file response never expose a runner part as a full tree or changes list.
  A browser file event holds a complete report, a tree delta, or a changes delta. A browser file response holds a complete report.
- A changes delta reaches each tab in one of two forms: the delta, or the complete changes list with the same event number.
  [Events](workspace-events.md#events) says which tab gets which form.

## Omitted totals

- Each part of a full tree, each tree delta, and the tree that the
  workspace serves can carry `omittedEntryCount`, the number of omitted
  entries.
- Each complete changes list and each of its parts can carry `omitted`.
  It gives the omitted files and the lines that they add and remove as
  `files`, `added`, and `removed`. See [The delta](changes-deltas.md#the-delta)
  for the required field of each changes delta.
- The `summary` of a changes report counts only its listed changes.
  Reason: the previous Worker checks the summary against the listed files,
  so it still accepts the report of a new runner.
- Each part of a full report of a new runner carries its omitted totals,
  with zeros when the report omits nothing.
- Omitted totals that a full report or a saved list does not carry are
  unknown, not zero. A later full tree sets the tree count. A later full
  changes list or changes delta sets the changes totals. A tree delta with
  `omittedEntryCount` sets the tree count.
- Every part of one report repeats the same omitted totals.
- The workspace publishes the omitted totals only with the complete
  report. So a pending part changes no count of a panel.

## Which entries stay

- The tree report keeps entries in this order, up to its limit
  (Cal, 23 November 2026):
  1. The files of the branch that the changes report lists, in the order
     in which it selects them. The tree report keeps each such file with
     its parent folders, when the file and those folders fit in the
     remaining entries. Else it skips the file.
  2. The other entries of the repository, and the context-only entries.
     Up to 5,000 of the remaining entries go to the context-only entries.
     Each of the two groups lends the entries that it does not use to the
     other.
- Inside each group, the entries follow path order: the English collation
  of the paths, with the raw path as the tie-break. A folder takes its
  entry before the entries inside it.
- The report selects by the real paths, before the filter of secret values
  and before the split into parts. So the mask of a secret value cannot
  change which entries stay.
- The change mark of each entry comes from the complete scan, also for a
  file that the changes report omits.
- Reason: the tree keeps the current work first, then the folders of the
  repository and some notes. A plain prefix in path order was not chosen,
  because context files can fill it. Shallow entries first was not chosen,
  because a folder can then show with no entries in it.
- Risk: a large folder early in the path order, such as `tests/fixtures/`,
  can push later entries out, also root files such as `tsconfig.json`.

## Which changes stay

- The changes report keeps the uncommitted changes first, also the
  untracked files. The committed changes come next. Path order applies
  inside each group (Cal, 23 November 2026).
- Reason: the current edits stay in view. A plain prefix in path order was
  not chosen, because large changes late in the order then stay out. An
  order by changed lines was not chosen, because a binary file has no line
  count to rank. Generated files last was not chosen, because it needs a
  read of the Git attributes in each scan.
- The selection decides only which files the report keeps. The Changes
  panel keeps its own order of the rows.
- The selection does not depend on the tree. A deleted file can show in
  Changes with no entry in the tree.
- The counts of uncommitted files and of unpushed commits, and the file
  list at the end of each turn, use the complete scan. So the pull request
  bar does not take the local work from a limited list.

## Updates and refreshes

- An update that changes which entries the tree lists uses the removes and
  the upserts of a tree delta. The removes come first.
- That delta carries the new `omittedEntryCount`. A delta without the
  field keeps the previous count. A delta with no changes can carry a new
  count alone.
- A delta can also refresh a path. Each open file or diff of that path
  then reads again. A remove of a path that the tree does not hold
  refreshes an omitted path. An upsert of an unchanged entry refreshes a
  listed path.
- Reason: each reader, also an older one, reads a path again after such a
  remove or upsert, and its tree does not grow.
- The runner refreshes these paths:
  - each path that the tree omits, when a file at that path is added,
    changed, or deleted
  - after the base commit changes, each path of the complete changes lists
    before and after the change that neither listed changes report names,
    with the old and the new path of each rename
  - the same paths after a change of the data of a row of the complete
    changes list, such as the pairing of a rename
- The listed changes reports are the lists that readers hold before and
  after the update. A scan with unchanged report data can reuse the
  existing report.
- These rules decide when the runner sends one full tree within the limit,
  in place of deltas:
  - A limited tree that changes its listed entries keeps the whole update
    in one delta or one full tree. Here a limited tree omits entries before
    or after the update. So a reader never sees a part of such an update.
  - Refresh-only operations must arrive together because their only
    effect is to make readers read again. They remove absent paths or
    upsert unchanged entries. If they do not fit one delta, the runner
    sends one full tree.
  - After a repair of only one report kind, the next tree update is one
    full tree unless the repair found the same data as the last scan of
    the other kind.
- An operation that also edits its entry goes with the other edits.
  Ordinary edits split across successive deltas when they exceed one
  delta's budget, unless a full-tree rule applies. Each edit refreshes
  its path in whichever delta carries it, so every affected path
  refreshes. See [Parts and revisions](#parts-and-revisions).
- A full tree after a repair makes every reader read each open file and
  diff again, including older readers.
- In each scan that sends both reports, the runner sends every part of the
  full changes list, or the changes delta, before the tree update.
- Reason: the workspace then stores the new base branch before a refresh
  makes a diff read again.
- The runner compares the complete changes scan before it cuts the list.
  So an edit of only omitted files still sends a full changes list or a
  changes delta.

## Older runners and readers

- An older runner can still send reports with no limit and without omitted
  totals. The workspace accepts them, with no new refusal for their size.
- The workspace stores and serves such a tree or changes list in full.
  Their omitted totals stay unknown.
- Both limits start with the complete reports of a new runner, after the
  normal update of the sandbox software, as
  [Updates](sandbox-software.md#updates) says. They add no protocol
  version, and no reader has to update.
- The previous Worker drops the new fields. It still joins a new report,
  because the summary matches the listed changes.
- An older Mac app drops the new fields too. It keeps its rows and its
  totals, but it cannot show the new notices.
- An example: a list that the previous Worker saved during a rollback
  carries no omitted totals. After the next upgrade, they are unknown,
  not zero, as [Omitted totals](#omitted-totals) says.
- An older runner offers no changes deltas, so it sends a full changes
  list after each update. Each reader gets that list.
- A Worker whose welcome accepts no changes deltas, such as the previous
  Worker, gets full changes lists from a new runner. This holds also
  during a deploy and after a rollback.
- An older tab and an older Mac app do not name the delta form. So each
  gets the complete changes list after each update, as
  [Events](workspace-events.md#events) says.
- Risk: an older runner cannot start when its saved events hold a changes
  delta. This happens only when a new release saves a delta and then
  counts as a failed start, so that the previous release runs again, as
  [Updates](sandbox-software.md#updates) says. Each new type of runner
  event has the same risk.
