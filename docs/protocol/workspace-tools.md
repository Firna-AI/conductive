# Workspace tools

This doc holds the requirements and the decisions in force for the tools
of a workspace: its files and changes, its terminal, its port previews,
and its desktop. [Workspaces and sandboxes](workspaces-and-sandboxes.md)
holds the life of a workspace and its sandbox. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws the tools at
`app/files` and `app/tools`.

## Files and changes

- All files shows every file of the branch as a tree. A small mark shows
  each added or changed file.
- A file opens as a tab in the centre column. Markdown shows rendered, with
  a switch to its source. Code shows with line numbers and syntax colours.
- The header of a file tab can copy and download the file.
- Reading a file has a size limit of 5 MiB, or 5,242,880 bytes.
  Reason: Boat's file read stops at 5 MiB, so a file read that falls back
  to it cannot read more.
- The Markdown preview fills short table rows only up to 65,536 empty
  cells in one file. Then it shows the rest of the file as text
  (decision 88).
- Changes lists the files that the branch changes against the default
  branch. Its summary gives the number of changed files and the lines that
  they add and remove.
- A changed file opens its diff against the default branch as a tab.
- The agent runner watches the repository and reports both lists.
  Branch changes count uncommitted and untracked work too.
- Runner file reports hold at most 256 KiB, or 262,144 bytes, of compact UTF-8 JSON per event.
  This includes the event type, metadata, escapes, and delimiters. It excludes the runner envelope.
- The complete runner envelope also meets the
  [runner event limit](chat-and-events.md#the-agent-runner).
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
  [Lost workspace updates](chat-and-events.md#lost-workspace-updates) says (decision 96).
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
- The runner reads one file or one diff on request. When the runner is not
  connected, a file read falls back to Boat's file read.
- The Durable Object keeps the last tree and the last changes, so both tabs
  still show them while the sandbox sleeps.
- Reason: Boat's API can run `git` and read files only while the sandbox
  runs, one request at a time, and with no live updates.
- When the runner cannot read the repository, it sends `files.unavailable`
  (decision 109). The event holds no other data. A failed scan after a
  connect does not stop `runner.ready`, as
  [The agent runner](chat-and-events.md#the-agent-runner) says.
- The workspace then marks the file tree as unavailable, and each open tab
  gets the mark. The changes list keeps its last complete report.
- The tree that the workspace serves then carries `unavailable: true`. It
  keeps the entries and the revision of the last tree. Before the first
  complete tree, it has revision 0 and no entries.
- These empty entries mean an unknown tree, not an empty branch.
- Only a complete full tree clears the mark. A tree delta and an incomplete
  full tree keep it.
- After a failed scan, the next scan that succeeds sends a full tree.
- The mark is never a replacement, and it never ends or fails a repair.
- All files then keeps the last tree, and a notice says that the latest list
  is unavailable. Before the first complete tree, All files says that the
  list is unavailable, in place of the tree.
- Reason: the user can tell an old or unknown tree from the latest one. A
  failed scan with no mark was rejected, because the tab then shows an old
  tree as the latest one.

## Terminal

- The Terminal tab opens a shell in the sandbox, in the folder of the
  workspace's repository (decision 94).
- The Terminal shell of a workspace keeps running when its connection
  drops. Each new connection attaches to that shell, with its running
  commands and its current screen (decision 118).
- Reason: a connection can drop at any time, such as at a network change
  or when Cloudflare updates the runtime of the Worker. A shell that ends
  with its connection was rejected, because the user then loses a running
  command, such as a dev server.
- After a start from a saved snapshot, the sandbox provider restores the
  disk in the background. A shell that starts after the restore ends opens
  in the live repository folder. A shell that started earlier moves to the
  live copy of its own folder once, at its first prompt after the app sees
  the end of the restore (decisions 147 and 149).
- Reason: when the restore ends, a running program keeps an old view of
  the disk at another path. A restart of the shell was rejected, because it
  ends running commands. A terminal that waits for the end of the restore
  was rejected, because the Terminal tab then waits too.
- Apart from that one move, the terminal never moves a running shell by
  itself. The app learns the end of the restore from a signal that the
  sandbox provider documents (decision 149).
- Reason: a move each time that the real folder of a shell differs from
  the path in its prompt was rejected, because it also moves a shell
  outside a restore. A check of the provider's path of the old view was
  rejected, because the provider does not document that path.
- When the user ends the shell, such as with `exit`, the next connection
  opens a new shell.
- A stop of the sandbox ends the shell and its commands, as
  [Stop and resume](workspaces-and-sandboxes.md#stop-and-resume) says. The first connection after the
  resume opens a new shell.
- On a phone, a row of keys adds the keys that a phone keyboard lacks.

## Port previews

- The user opens a port preview by typing its port. The app does not
  discover ports.
- A preview shows in a frame inside the app, with an "Open in new tab"
  link. Reason: Safari blocks the cookies of the previewed app inside a
  frame.

## Desktop

The Desktop tool shows the live desktop of the sandbox, where the agents
use a browser. The app hides Desktop for now, and keeps its implementation
for its return.

- The app offers Desktop to no user, also not to an operator. The tools
  panel, the tab bar of a phone, and the command palette show no Desktop
  entry. This holds in the web app and in the Mac app.
- An address that names Desktop shows Terminal in the same workspace, on
  both screen sizes. Desktop does not mount, and the app asks for no
  desktop URL.
- A saved view that names Desktop shows Terminal too. The app keeps that
  saved choice. Neither the Desktop address nor the saved view makes the
  app save Terminal in place of the saved tool.
- The saved view and the server still accept Desktop as a tool. So an
  older saved choice stays valid, and Desktop can return without a change
  of the stored data.
- The server keeps the desktop URL route and its access rules, as
  [Desktop](access-and-security.md#desktop) says. The pause adds no
  refusal at the server.
- A Mac app build from before the pause keeps its Desktop tab until it
  updates.
- Reason: the user found the desktop stream not reliable. The user chose
  to hide Desktop for every user for now, and to keep its implementation
  for its return.
- A deployment flag, a Desktop for operators only, and a switch in the
  operator section were rejected. Each adds a setting or an access rule
  for a paused tool. A build setting that shows Desktop again was
  rejected, because it adds another build mode.
- A refusal at the server was rejected, because the user asked to hide
  the tool, not to change the server. Removal of the implementation was
  rejected, because Desktop comes back later.

These rules hold wherever Desktop shows, such as in a Mac app build from
before the pause:

- The Desktop tab shows the live desktop of the sandbox. The user watches
  the agents there.
- When the [content security policy](access-and-security.md#content-security-policy)
  of the page blocks the stream, the Desktop tab says that the desktop
  couldn't open, with Try again. It never shows a blocked stream as live.

[Access and security](access-and-security.md) states how the terminal, the
previews, and the desktop stay safe.
