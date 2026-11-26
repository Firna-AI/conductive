# Tools of a workspace

This doc holds the requirements and the decisions in force for the tools of
a workspace. It covers the files and changes, the terminal, the port
previews, and the desktop. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
provider, the org image, and the startup script. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A chat link decision number names a decision of the change that
makes each web address of chat text a link, as
[Chat links](chat-links.md) says. A Markdown parser decision names a
decision of the change that reads Markdown with one parser, as
[Chat Markdown](chat-markdown.md) says. The
[mockup catalogue](../mockups/catalogue.md) draws the tools at
`app/files` and `app/tools`.

## Files and changes

- All files shows the files of the branch as a tree, up to the limit of
  its report, as [Report limits](file-reports.md#report-limits) says. A
  small mark shows each added or changed file.
- All files also shows the files of the context folder that Git ignores,
  without a mark, as
  [The context folder](repository-folders.md#the-context-folder) says.
  Changes leaves them out.
- A file opens in a tab of the centre column. A press on a file opens it in
  the temporary tab, as [Temporary tabs](temporary-tabs.md) says.
- Markdown shows rendered, with a switch to its source. Code shows with line
  numbers and syntax colours. An HTML file shows as a page, with a switch to
  its source, as [HTML file preview](html-file-preview.md) says.
- The Markdown preview reads a file with the parser of the chat, by the
  rules of CommonMark with the tables and the strikethrough of GitHub, as
  [Formatting](chat-markdown.md#formatting) says (Markdown parser decision
  3 C, 16 November 2026). Quotes, rules, strong text, emphasis,
  strikethrough, task boxes, headings, and tables have the same look as in
  the chat.
- HTML in a Markdown file shows as text. A line-break tag, `<br>`,
  `<br/>`, or `<br />` in any letter case, shows as a line break, also in a
  table cell, as [Line breaks](chat-markdown.md#line-breaks) says
  (Markdown parser decision 1, 16 November 2026).
- Reason: a file of the repository is untrusted, so no HTML of a file
  reaches the page. A table of a file with line-break tags then reads as
  on GitHub.
- A file tab can open at a line or a range of lines, such as from a file
  chip of an answer with a line target, as
  [Line targets](file-mentions-answers.md#line-targets) says (answer
  chip decision 2). The tab then shows the text of the file, also for a
  Markdown file. It scrolls the first line to the middle of the view, and
  marks each line of the range with a background colour.
- The address of such a tab names the lines in its query, as
  `?line=42` or `?line=42-50`. So a link opened in a new browser tab
  shows the same lines. Each new address with lines scrolls again.
- The lines win over the scroll place that the tab keeps. A later change
  of the file does not scroll the tab again, so the reader keeps the
  place.
- The saved view of the workspace keeps the tab without the lines.
  Reason: the view follows the member in each browser tab, and another
  tab must not jump.
- A range that runs past the end of the file stops at its last line. A
  first line past the end shows the top of the file and marks nothing.
- A link of the Markdown preview has the look and the title of a
  [link of chat text](chat-links.md) (chat link decision 1 D). A link to a
  page of the app opens that page in the app, in the same window, as in
  chat text. Reason: a link of the app in a file then works in the Mac app
  too.
- A link that names neither a page of the app nor a
  [local address](chat-links.md#local-addresses) opens a new tab with
  `noopener noreferrer`, as in chat text.
- Unlike chat text, the Markdown preview also links a `mailto` address,
  an address with a user name or a password, and an address of the app
  that names no page.
- An image of the Markdown preview shows its alt text, and no picture
  loads. At a web address, the alt text is a link to that address, with
  the rules of a link of the Markdown preview (Markdown parser decision
  10 B, 18 November 2026). Any other image shows its alt text only.
- Reason: such an image then shows as in an agent message, as
  [Chat links](chat-links.md#bare-addresses-and-markdown-links) says. The
  alt text without a link was not chosen for that reason. No picture
  loads, because a picture at a web address makes the browser of each
  reader call a server that the file chose.
- The header of a file tab can copy and download the file.
- Select all, Cmd+A on a Mac or Ctrl+A, in the text or the diff of a file
  tab selects only that text, without the line numbers. A press in the
  text gives it the focus. Reason: Cal asked on 23 November 2026, because
  select all selected the whole app, with its lists and tabs.
- A copy of a selection in the text of a file gives the source text of
  the selected part of each line, with its empty lines. Each line end
  that the selection passes becomes a line feed. After select all, it
  gives the whole text that the view shows. A copy at a caret, with no
  text selected, leaves the clipboard as it is. The Copy of the header
  stays the exact copy of the file. Reason: the browser left each empty
  line out of such a copy.
- Reading a file has a size limit of 5 MiB, or 5,242,880 bytes.
  Reason: Boat's file read stops at 5 MiB, so a file read that falls back
  to it cannot read more.
- [Pictures in file tabs](file-pictures.md) states how a file tab shows a
  PNG, JPEG, GIF, or WebP file, with its zoom bar and its expanded view.
- The Markdown preview fills short table rows only up to 65,536 empty
  cells in one file. Then it shows the rest of the file as text
  (decision 88).
- Changes lists the files that the branch changes against its base branch,
  from the merge base of the two, as [Base branches](base-branches.md)
  says, up to the limit of its report.
- The summary of Changes gives all changed files and the lines that they
  add and remove, and the count of its tab gives all changed files. Each
  adds the omitted totals to the `summary` of the report, which counts
  only the listed files, as [Omitted totals](file-reports.md#omitted-totals)
  says.
- A press on a changed file opens its diff against the base branch. The
  diff opens in the temporary tab, as a file does. The diff shows the
  syntax colours of the file, as code does.
- A new temporary tab opens at the end of the tab row of the centre column.
  A replaced one keeps its place, as
  [The tab row](agents-and-sessions.md#the-tab-row) says.
- A right click on a row of All files or Changes opens its row menu, with
  Add to chat and Copy path, as [File row menu](file-row-menu.md) says.
- The agent runner watches the repository and reports both lists.
  Branch changes count uncommitted and untracked work too.
- The report of the branch changes also gives the number of commits of
  the current branch that no remote branch holds. The pull request bar
  counts them as local work, as [Actions](github-banner.md#actions) says.
- After a start from a saved snapshot, the runner watches the live
  repository folder again when the app sees the end of the restore, and it
  scans the repository once. It uses the same signal as the terminal, as
  [The shell](terminal-shell.md#the-shell) says.
- Reason: a watch made before the restore ends stays on the old view of the
  disk, so the lists stop updating. A file that the provider writes inside
  the sandbox at the end of its restore was rejected, because the provider
  does not document it and can change it. A timer that compares the
  identity of the folder was rejected, because the app already has a
  documented signal for the end of the restore.
- [File reports](file-reports.md) states the limits, the omitted totals,
  the parts, the revisions, and the repairs of the runner's reports of
  both lists.
- When the tree report omits entries, All files shows a notice with their
  number. It names files and folders, because the limit counts folders
  too: "18,412 files and folders are not listed. Find them in the
  terminal, or ask the agent."
- When the changes report omits files, Changes shows a notice with their
  number: "The totals include 1,243 files that are not listed. Review them
  in the terminal, or ask the agent."
- Each count comes from the report, not from the limit. A report without
  omitted totals shows no notice, and Changes then counts only its rows.
  The [mockups](../mockups/catalogue-attachments-and-files.md) draw the
  notices at `app/files/limited` and `app/files/changes/limited`.
- A limited list is not a failed scan and not an empty repository. Each
  new complete report replaces its counts at once, and a count of zero
  removes its notice.
- A member reaches an omitted file in the terminal, or through the agent.
  A file tab and a diff tab read their path directly, so a link or an
  open tab of an omitted path still works.
- The runner reads one file or one diff on request. When the runner is not
  connected, a file read falls back to the file read of the provider.
- The Durable Object keeps the last tree and the last changes, with their
  omitted totals. So both tabs still show them and their notices while
  the sandbox sleeps and while it starts again.
- Reason: Boat's API can run `git` and read files only while the sandbox
  runs, one request at a time, and with no live updates.
- While the sandbox does not run, a file or diff tab reads nothing. While
  the sandbox is stopped or starts, or after its later start failed, a tab
  keeps the file that it already shows, as the lists keep their copy.
- Otherwise the tab shows the state of the sandbox in place of the file,
  with the Resume or Try again of that state. While the sandbox starts, or
  a Resume runs, the tab shows that it waits for the sandbox, as
  [The resume](stop-and-resume.md#the-resume) says.
- Opening a file or diff tab resumes a stopped sandbox, as
  [Stop and resume](workspace-life.md#stop-and-resume) says.
- When the runner cannot read the repository, it sends `files.unavailable`
  (decision 109). The event holds no other data. A failed scan after a
  connect does not stop `runner.ready`, as
  [The agent runner](agent-runner.md#the-agent-runner) says.
- The workspace then marks the file tree as unavailable, and each open tab
  gets the mark. The changes list keeps its last complete report.
- The tree that the workspace serves then carries `unavailable: true`. It
  keeps the entries, the revision, and the omitted entry count of the last
  tree. Before the first complete tree, it has revision 0 and no entries.
- These empty entries mean an unknown tree, not an empty branch.
- Only a complete full tree clears the mark. A tree delta and an incomplete
  full tree keep it.
- After a failed scan, the next scan that succeeds sends a full tree.
- The mark is never a replacement, and it never ends or fails a repair.
- All files then keeps the last tree, and a notice says that the latest list
  is unavailable. Before the first complete tree, All files says that the
  list is unavailable, in place of the tree.
- A limited list keeps its notice of omitted entries or files while its
  latest list is unavailable, and after a
  [failed repair](lost-workspace-updates.md) of the list. The notice of
  that state shows too, each notice in its own place.
- Reason: the user can tell an old or unknown tree from the latest one. A
  failed scan with no mark was rejected, because the tab then shows an old
  tree as the latest one.

## Terminal

[Terminal](terminal.md) gives the terminals of a workspace and their tabs,
the shell of each terminal, its screen, and its links.

## Port previews

The [port-preview requirements](port-previews.md) give the detected-server
list, manual opening, preview tabs, and the relay requirement.

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
  [Desktop](terminal-previews-and-desktop.md#desktop) says. The pause adds no
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

[Access and security](terminal-previews-and-desktop.md) states how the terminal, the
previews, and the desktop stay safe.
