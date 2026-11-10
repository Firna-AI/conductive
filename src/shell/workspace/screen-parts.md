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
  the tab of the address in view.
- A click on a session tab, a new session, or a reopened session makes
  that session the active tab of the view. The address then goes back to
  the chat.
- Close on a file tab takes it out of the view. When it shows, the next
  file tab shows, else the one before, else the chat.
- A file of a finished turn opens its diff tab. A phone shows it in the
  Files tab.
- An archived workspace shows no file tabs and no file page.
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

- The kept chat loads and saves the workspace view. The shell reads the
  tabs and the list from the chat, and changes them only through the
  chat's `updateView`, so the view has one writer. A read-only workspace
  changes its view in the browser only, and saves nothing.
- While the chat has not read the view, as during its load or after a
  failed load, the shell saves nothing, so the saved tabs stay. The file
  page still reads its file.
- A click on a file or a diff saves its tab as the open and active tab,
  then moves the address. A page that shows from an address, such as a
  link or the browser history, saves its tab too.
- A click on a list saves the list. On desktop the list belongs to the
  right column, so the address keeps the tab of the centre. On a phone a
  list is a page with its own address. An address that names a list saves
  that list.
- On a phone, a file or a diff shows as a page of the Files tab, with a
  link back to All files or Changes.
- The lists show while the sandbox is stopped or failed, from the copy
  that the workspace keeps. While the sandbox starts, and while the app
  refuses its start, the sandbox panel shows in place of All files and
  Changes, and Checks stays. A refused panel has the words of its cause,
  as [A refused start](refused-start.md) says. An archived workspace has no
  file lists, and its right column shows the archived panel.
- A file or diff page shows the same sandbox panel in place of its
  content, on desktop and on a phone, and reads nothing. So an open tab
  waits until the sandbox is ready, as
  [Start steps](../../../docs/protocol/workspace-life.md#start-steps) says.
  Its header keeps the name of the file, and a diff keeps its changed
  lines. The page reads when the panel goes.
- The kept files, Copy, and Download use the services of the org, as
  [the Files screens](../../files/README.md#integration) say.

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
- The tools part marks the element of the terminal for the command
  palette. So Ctrl+K in the terminal goes to its shell on Windows and
  Linux, as the
  [command palette protocol](../../../docs/protocol/command-palette.md#where-the-key-goes)
  says.
- Each tool reads its routes with the `fetch` of the org's `ApiClient`,
  and the events of the kept `ToolEvents`.

## The GitHub part

The workspace screen keeps one GitHub store, through `useGitHubState` of
[the GitHub screens](../../github/README.md), for the pull request bar or
row and the Checks tab of the Files part. It reads with the `fetch` of
the org, waits with the timer of the app, and takes the GitHub events of
the ordered stream of the workspace.

- On desktop, the bar tops the right column. After a merge, its Archive
  opens the Archive question of the screen. It shows only when
  `WorkspaceContext.archive` offers Archive, so a suspended org shows none.
- On a phone, the row sits under the header on every tab. A pull request
  opens the Checks tab at its address.
- An archived workspace keeps the bar on desktop. On a phone it shows only
  its chat, so the screen reads no GitHub state there.

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
