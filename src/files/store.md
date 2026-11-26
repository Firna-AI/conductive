# Store rules

This guide belongs to [the Files screens](README.md). It gives the rules of
the stream of the kept store, the open pages, the failed repairs of the
lists, a tree that the cloud computer could not read, and the omitted
totals of a limited list.
[Integration](README.md#integration) shows how the app connects the store.

On its first visit, `WorkspaceFiles` starts both list reads. Each reply
can carry `stateRead` with its cutoff, its failed repair, and its
repository. A 503 reply for an absent list can also carry `stateRead`.
When both reads give cutoffs, the store opens its stream after the smaller
cutoff. As soon as a read gives no readable cutoff, the store starts its
stream after event 0. A stream report can fill the missing list while the
other read is still pending.

Each list has an event floor. Its read cutoff sets the floor. An event
that changes the list advances it. An event at or below a list's floor
has no effect on that list. Each new event still counts for stream order.
A read with a cutoff above the list's floor replaces the list. When a
tree revision gap still needs repair, a tree reply at the floor also
applies. It includes the event that set the floor. If the tree reply has
a cutoff below the floor and the gap remains, the store reads the tree
again after that reply. An error without a cutoff starts no retry. A
legacy reply can fill a missing list or repair a gap in the tree revisions.

The stream reads stored history in pages, then applies live events.
The pages share one cutoff and can omit event numbers. Live events wait
for the final page. After a gap in live event numbers, the stream
subscribes again from its own progress. A kept store also resumes at
that point. A retry updates its own list and leaves the stream in order.

The stored history and the live events change the open pages in the same
way. An event names the paths whose file or diff it may change, and the
open page of such a path reads again.

An add-or-replace (`upsert`) with unchanged entry fields reports a content
change, so the open file and diff read again.

Some events cannot name their paths:

- a new full tree
- a tree update that waits for a tree, or that the tree already holds
- a change list without an earlier one

After such an event, each open page reads its file or diff again. The
store collects the changes of one message: a history page, or one live
event. Then it applies them once.

An accepted list read with a cutoff also refreshes every open file, diff,
and HTML page preview. This includes a 503 with a cutoff. The read cannot
name the paths of the events it covers. A legacy tree read that repairs a
revision gap also refreshes all open paths. A legacy read that fills a
missing list leaves the open paths as they are.

The workspace can refuse an update of a file list. After such a first
loss, it asks the runner for a fresh full report of that list, and the
screens show nothing. When the workspace refuses that report too, the
repair failed.
[Lost workspace updates](../../docs/protocol/agent-runner.md#lost-workspace-updates)
gives the rules. `FilesSnapshot.failedRepairs` holds the failed repairs of
the two lists:

- The key is `files.snapshot` for All files, or `changes.updated` for
  Changes. The value is the time of the first failed repair since the last
  full report of that list, in Unix milliseconds.
- Only a marker with `repairFailed: true` and no session adds a failed
  repair. A first loss adds nothing. The chat owns the markers of a session.
- A later full report of the same list in the stream clears it. A
  tree delta and a report of the other list clear nothing.
  [File reports](../../docs/protocol/file-reports.md)
  says which reports replace a list.
- A read with a newer cutoff gives the open failure of its list. A legacy
  reply without a cutoff leaves the failure in place.
- A further failure of a failed list keeps the time of the first one.
- A new store takes each failure and its first time from its own list
  read. Full replay can recover failures for a list read with no cutoff.
  The store keeps the failures in memory across subscriptions.

The workspace screen shows the failed repairs of the name and the start
steps below its header, as [the workspace screen](../shell/workspace/README.md)
says.

The cloud computer can fail to read the files of the branch. The workspace
then marks the tree, until the runner sends a full tree again.
`FilesSnapshot.treeUnavailable` holds the mark:

- A `files.unavailable` event of the stream sets it. The tree stays as it
  is, because only the newest tree is unknown.
- A reply of the tree route with `unavailable: true` sets it too. Its tree
  is the saved tree, or an empty tree at revision 0 when none was saved.
- A newer full tree in the stream or a read with a newer cutoff can clear
  it. A tree update or a legacy reply leaves the mark in place.
- The parsers keep only the value true, and they refuse nothing new.

With a saved tree, All files shows it, and the notice "The latest list of
all files is unavailable" shows under the lists, with no age. With no tree
to show, All files says "The list of all files is unavailable" in place of
an empty list. That state shows also while the first read of the tree
waits, or after it failed.

A repository change moves the workspace to the folder of another
repository, as
[Repository change](../../docs/protocol/repository-change.md#after-the-change)
says. Each list starts with the repository from its read. Later
`workspace.updated` events apply to that list above its floor.

- The first record names the repository for a list with no ID. A record
  of the same repository leaves the list as it is.
- A move marks the saved tree as unavailable or drops the changes of the
  old folder. A move between the two read cutoffs affects only the older
  list. The saved tree keeps its revision for later updates. Each open
  page reads again.
- The store then reads the changes route again, which waits for the
  report of the new folder. The next full tree and the next changes report
  of the stream replace both lists.
- `files-moved.test.ts` checks these steps.

## Omitted totals

A limited report leaves out entries or changed files, and it gives their
totals. The tree keeps the count of its report in
`FileTree.omittedEntryCount`, and the changes keep theirs in
`ChangesResponse.omitted`. Each report replaces or keeps them, as
[Omitted totals](../../docs/protocol/file-reports.md#omitted-totals) and
[Updates and refreshes](../../docs/protocol/file-reports.md#updates-and-refreshes)
say. A missing total is unknown, so no notice shows.

- The parsers keep a total that is a safe count. They drop any other
  value, and they refuse no reply because of it.
- A tree update that waits for a tree read applies its count over that
  tree, as it applies its entries.
- The unavailable mark, a failed repair, and a repository move keep the
  saved tree with its count, so its notice stays. A move drops the
  changes with their totals.
- A remove of a path that the tree does not hold changes no entry, also no
  entry under that path, and the open page of that path still reads again.
  So a file or a diff of a path that the report leaves out stays fresh, and
  such a remove does not scan the tree.
- `omitted-lists.test.ts` checks the totals and the refresh,
  `files-tree-repair.test.ts` checks the count of an update that waits, and
  `tree-model.test.ts` checks the entries and the touched path of a remove
  of an absent path.
