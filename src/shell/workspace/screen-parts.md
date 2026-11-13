# The chat and the parts of the screen

This page is part of the [workspace screen](README.md) guide. It gives the chat
in the centre, and the parts that the shell gives.

## The chat of the workspace

`ChatArea` draws the chat in the centre: `WorkspaceChatView` with the kept
`ChatController`, as
[A chat that the app keeps](../../chat/README.md#a-chat-that-the-app-keeps)
says.

- The shell draws the start steps, with the time of each step, and the
  sandbox bar, with Resume. It draws them from its own record of the
  workspace, and gives them to the chat as `host`. The chat places them.
- An open reads the workspace, shows it, and starts the stream. Only then
  does a stopped or failed workspace resume. A Resume answers when the
  server queued the start, with the state `starting`. The stored chat
  shows during the start, and the stream brings the start steps and the
  result. A failed resume keeps the workspace and its chat, with Try
  again.
- Connect, on the notice of a missing agent login, opens the Connect form
  of the account.
- On desktop, the chat shows the file and diff tabs of the saved view
  among the session tabs, in the one order of the tab row. A file or diff
  tab moves by drag and with its tab menu, as a session tab does, as
  [the chat](../../chat/README.md#rules-for-this-code) says. The file or
  diff tab of the address shows in place of the chat of the session, and
  the tabs stay. No session tab is the current one then, and the row keeps
  the tab of the address in view. The temporary tab of the saved view shows
  its title in italics, and a screen reader hears "temporary" after its
  name.
- A click on a session tab, a new session, or a reopened session makes
  that session the active tab of the view. The address then goes back to
  the chat.
- Close on a file tab takes it out of the view. When it shows, the next
  file tab shows, else the one before, else the chat. Close on the
  temporary tab also clears its mark.
- A file of a finished turn opens its diff tab. A phone shows it in the
  Files tab.
- The chat gets the kept files of the workspace as `mentions`, for the
  list of `@` and the file chips, as
  [File mentions](../../../docs/protocol/file-mentions.md) says. It reads
  them from the one connection of the screen, also on a phone before a
  visit to Files. A file chip opens the file tab, as a
  press in All files does. A folder chip opens the folder in All files and
  shows the right column on desktop, or the Files tab on a phone.
- An archived workspace shows no file tabs and no file page, and its chat
  gets no files.
- A `center` part of the host takes the place of the whole chat, also of
  its tabs.
- When the features give the `tabs`, `transcript`, or `composer` slot, the
  shell draws its own chat column with those slots, in place of the chat.

## The Files part

The shell gives All files, Changes, and Checks as its own `files` part,
with the [Files screens](../../files/README.md). A `files` part of the host
takes its place. The address after the workspace names what shows:

| Address | What shows |
| ------- | ---------- |
| `files` | The Files tab of a phone, with the list of the saved view |
| `files/all`, `files/changes`, `files/checks` | That list |
| `files/preview/<path>`, `files/source/<path>` | The file tab, in that mode |
| `files/diff/<path>` | The diff tab |

Each folder of a path is a part of the address. Another address under
`files` shows the list of the saved view.

- The workspace screen connects the kept files of the workspace once,
  through `KeptFilesConnection`, on desktop and on each tab of a phone. So
  the pull request bar knows the local work, also while a phone shows the
  chat. The Files part, the file page of the centre, the labels of the file
  tabs, the list of `@` and the file chips, and the bar only read the same
  store. An archived workspace leaves the store stopped.
- The kept chat loads and saves the workspace view. The shell reads the
  tabs and the list from the chat, and changes them only through the
  chat's `updateView`, so the view has one writer. A read-only workspace
  changes its view in the browser only, and saves nothing. Its temporary
  tab follows the same rules in that copy, also a keep.
- While the chat has not read the view, as during its load or after a
  failed load, the shell saves nothing, so the saved tabs stay. The file
  page still reads its file.
- A click on a file or a diff saves its tab as the open and active tab,
  then moves the address. A page that shows from an address, such as a
  link or the browser history, saves its tab too.
- A file or a diff with no tab opens in the temporary tab, as
  [Temporary tabs](../../../docs/protocol/temporary-tabs.md) says. It takes
  the place of the tab that the mark of the saved view names. Without that
  tab, it opens at the end of the row. The mark then names it. A file or a
  diff that has a tab shows that tab, and the mark stays. After a click,
  the address finds the tab open, so it saves nothing more.
- A double-click on a file row of All files or Changes, or on the
  temporary tab, clears the mark. The tab then stays in its place as a kept
  tab. The second click of the double-click opens nothing again, and the
  double-click selects no text. A switch between the preview and the
  source keeps the mark, because the mark names no mode. While the chat has
  not read the view, a double-click keeps nothing, as no click saves then.
- A click on a list saves the list. On desktop the list belongs to the
  right column, so the address keeps the tab of the centre. On a phone a
  list is a page with its own address. An address that names a list saves
  that list.
- On a phone, a file or a diff shows as a page of the Files tab, with a
  link back to All files or Changes. A press there opens the temporary tab
  of the saved view too, though the row of a phone shows no file tabs.
- The lists show while the sandbox is stopped or failed, from the copy
  that the workspace keeps. While the sandbox starts, and while the app
  refuses its start, the sandbox panel shows in place of All files and
  Changes, and Checks stays. A refused panel has the words of its cause,
  as [A refused start](refused-start.md) says. An archived workspace has no
  file lists, and its right column shows the archived panel.
- While the sandbox does not run, a file or diff page reads nothing, on
  desktop and on a phone. So an open tab waits until the sandbox is ready,
  as [Start steps](../../../docs/protocol/workspace-life.md#start-steps)
  says. The page reads when the sandbox runs again.
- A stopped sandbox, and one whose later start failed, keep the file that
  a page already shows, as they keep the lists. Otherwise the sandbox panel
  takes the place of the content. The page hides the bar of the chat, so
  its panel has Resume or Try again, and the words of a refusal. The
  header keeps the name of the file, and a diff keeps its changed lines.
- Each visit that opens a file or diff tab resumes a stopped sandbox, as
  [Stop and resume](../../../docs/protocol/workspace-life.md#stop-and-resume)
  says. `ResumeOnTabOpen` listens to each visit of the app navigation:
  each click, link, and move back or forward. A visit opens a tab when it
  moves to another tab, or when it visits the address of the tab again, as
  a second click on the tab or on its file does.
- A switch between the preview and the source keeps the tab, so it starts
  nothing. The address of the screen at its first show starts nothing
  there either, because the open of the workspace resumes the sandbox.
- A Restore moves no address, so it starts nothing, also while the address
  names a file or diff tab. The next visit that opens a tab resumes the
  sandbox.
- The kept files, Copy, and Download use the services of the org, as
  [the Files screens](../../files/README.md#integration) say.
- The tabs of All files, Changes, and Checks name the keys of Go to All
  files, Go to Changes, and Go to Checks in their tooltips and in
  `aria-keyshortcuts`, as the palette's Go to rows run them. The shell
  gives the keys to `FilesPanel` as plain props.

## The tools part

The shell gives its own Terminal and Preview tools, with the
[terminal](../../terminal/README.md) and the
[previews](../../previews/README.md). It keeps the
[Desktop tool](../../desktop/README.md) hidden, as
[Desktop](../../../docs/protocol/workspace-tools.md#desktop) says. A
`tools` part of the host takes their place. An archived workspace has no
tools.

- While the sandbox does not run, the tools show its state: starting,
  stopped, failed, or refused. On desktop the panel keeps its tabs around
  the state. A phone shows the state on the tool page. No tool mounts then,
  so no tool reads its route or opens the terminal.
- A `tools` part of the host shows only while the sandbox runs. The shell
  shows the state of the sandbox in its place.

| Address | What shows |
| ------- | ---------- |
| `terminal` | The Terminal tool |
| `preview`, `preview/<previewId>` | The Preview tool, with that preview |
| `desktop` | The Terminal tool, because Desktop is hidden |

- An address that names a tool shows it and saves it as `tool` of the
  view. Without one, the saved view names the tool.
- The `desktop` address and a saved `desktop` tool show Terminal. Neither
  mounts Desktop or saves Terminal in place of the saved tool. The view
  keeps `desktop` as a valid tool.
- On desktop the panel has a tab for each tool that the app offers. A
  click saves the tool,
  and the address keeps the tab of the centre. Only a tool address follows
  the new tool. A preview tab changes the address only from a preview
  address, and otherwise picks the preview in the panel.
- On a phone each tool that the app offers is a page of the tab bar, with
  its own address.
- The terminal mounts at its first show, then stays mounted and hidden
  while another tool shows, so its connection stays. Its socket opens at
  the `socketPath` of the terminal state through `openSocket` of the app's
  event source, so the Mac app reaches its own Worker.
- The mount of the Desktop tool stays for its return. It mounts at each
  show, so it reads a new desktop URL.
- The tools part marks the xterm.js screen of the terminal for the
  [shortcut layer](../shortcuts/README.md), through the `screenRef` of
  `TerminalTool`. So the screen keeps the keys that its shell reads, such
  as Ctrl+K on Windows and Linux, as
  [Where a key goes](../../../docs/protocol/keyboard-shortcuts.md#where-a-key-goes)
  says. The buttons of the tool, such as Reconnect, keep no key.
- The tabs of the tools panel name the keys of Go to Terminal and Go to
  Preview in their tooltips, as the palette's Go to rows run them.
- Each tool reads its routes with the `fetch` of the org's `ApiClient`,
  and the events of the kept `ToolEvents`.

## The GitHub part

The workspace screen keeps one GitHub store, through `useGitHubState` of
[the GitHub screens](../../github/README.md), for the pull request bar or
row and the Checks tab of the Files part. It reads with the `fetch` of
the org, waits with the timer of the app, and takes the GitHub events of
the ordered stream of the workspace.

- The screen keeps one action state for the bar on desktop and the top of
  the Checks tab on a phone, as
  [The actions of the bar](../../github/actions.md) says. It reads the
  member's own GitHub access, the local work of the kept files, and the
  turns of each session of the kept chat. A new branch of the workspace
  makes a new action state.
- A GitHub state of another branch than the workspace's, such as the merged
  state just after Continue, shows as loading. The store then reads the
  state of the branch once.
- On desktop, the bar tops the right column, with its main action and the
  line of a refusal or a stop under it. The number of a pull request links
  to it on GitHub. After a merge, its Archive archives
  the workspace at once, with one request, and stays busy while that
  request runs. It shows only when `WorkspaceContext.archive` offers
  Archive, so a suspended org shows none.
- The tooltip and `aria-keyshortcuts` of each button that takes a click,
  and of each link to the pull request, name the key of its command. The
  keys of the bar run while the right column shows the bar, and on a
  phone while the top of the Checks tab shows its actions, as
  [The actions of the bar](../../github/actions.md#keys) says.
- An agent action sends its prompt through `WorkspaceContext.chat`. A prompt
  that did not go out shows the chat of its session, where the composer
  names the cause: the chat in place of a file on desktop, and the chat tab
  on a phone.
- `ContinueDialog` asks the question of Continue, after its check found
  local work. `LocalWorkList` of the mockups lists that work, as in the
  mockup of the question.
- On a phone, the row sits under the header on every tab. It is one link to
  the Checks tab, whose top holds the actions, the line under the bar, and
  the links to GitHub. A branch without a pull request opens that tab when
  the bar has an action or a link.
- An archived workspace keeps the bar on desktop, with its links only. On a
  phone it shows only its chat, so the screen reads no GitHub state there.

## The Mac bar and the owner

- The owner picker of the header is the shell's own `owner` part,
  `WorkspaceOwner`. It mounts `OwnerPicker` of the
  [members UI](../../members/README.md). An admin picks another owner,
  except in a suspended org, where everyone sees the owner only.
- In the Mac app, `WorkspaceMacBar` tops the main area above the whole
  workspace, also while a file shows in place of the chat. It mounts
  `AllowAllBar`, the bar of the 15 minutes, of the
  [Mac commands](../../chat/device/README.md). A browser draws nothing
  there.
- Each part sends through the services of the org, from `useOrgServices`
  of `../context.ts`. Their client and fetch mark the org on
  `org_suspended`, so a page with an old org list turns read-only at once.
