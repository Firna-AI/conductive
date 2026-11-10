# Store rules

This guide belongs to [the Files screens](README.md). It gives the rules of
the stream of the kept store, the open pages, the failed repairs of the
lists, and a tree that the cloud computer could not read.
[Integration](README.md#integration) shows how the app connects the store.

The store reads each message of the subscription from `unknown`: the stored
history first, in one or more pages, then the live events. The pages of
one replay share one cutoff, and a page can leave out event numbers. The
store reads the tree and the changes routes, then applies the file events
in event order, and live events wait for the final page. It skips an event
that it already has. After a gap in the numbers of the live events, it
subscribes again from its last event number. After a gap in the tree
revisions, it reads the tree route again.

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
- Only a later full report of the same list in the stream clears it. A
  tree delta and a report of the other list clear nothing.
  [Files and changes](../../docs/protocol/workspace-tools.md#files-and-changes)
  says which reports replace a list.
- A reply of a route clears nothing, also the read of the tree after a gap
  in the revisions. Only the order of the stream shows that a report is
  newer than the failure.
- A further failure of a failed list keeps the time of the first one.
- The store reads the failures from the same stream as the file events, in
  event order, and keeps them in memory. A new subscription after a gap
  keeps them. A new store reads the stored history of the workspace from
  its first event, so a new tab shows them too.

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
- Only a full tree of the stream clears it. A tree update and a reply of
  the route clear nothing, because a reply can be older than the mark.
- The parsers keep only the value true, and they refuse nothing new.

With a saved tree, All files shows it, and the notice "The latest list of
all files is unavailable" shows under the lists, with no age. With no tree
to show, All files says "The list of all files is unavailable" in place of
an empty list. That state shows also while the first read of the tree
waits, or after it failed.
