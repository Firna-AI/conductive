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
- The shell also gives the composer the Capabilities tool of the
  workspace, from `../capabilities/WorkspaceCapabilities.tsx` (secrets
  decision 8 B). The chat reads the secrets of the org and the
  capabilities of the workspace when the workspace first shows, and the
  app keeps them while it is open. So the control shows them at once. Each
  open reads them again behind the shown values. Every member
  changes the pre-approved secrets there, and removes each
  approval of a session, which names its session by the title that the
  chat holds, and each value that a member gave for the workspace. The control shows only where the composer shows.
- In the Mac app, that control ends with the switch of Mac access of this
  Mac, from `../capabilities/mac-switch.ts`. It starts or stops the grant
  until Stop of the workspace on this Mac, and saves nothing in the
  workspace. A browser shows no Mac access part. The shell gives the chat
  `host.notice`, from `../capabilities/StartFailedNotice.tsx`: the notice
  over the composer of a new workspace whose grant of this Mac did not
  start after the create, with Try again. A read-only workspace shows no
  such notice.
- An open reads and shows the workspace. A new model applies the seed
  before it starts the stream after the read's cutoff. Only then
  does a stopped or failed workspace resume. A Resume answers when the
  server queued the start, with the state `starting`. The stored chat
  shows during the start, and the stream brings the start steps and the
  result. A failed resume keeps the workspace and its chat, with Try
  again.
- Connect, on the notice of a missing agent login, opens the Connect form
  of the account.
- A plain click on a workspace row of the sidebar puts a request in
  `AppModel.composerFocus`, and so does Add to chat of the Files panel on
  desktop. `ChatArea` gives the request of its workspace to the chat as
  `composerFocus`, so the message field takes the focus when it shows, as
  [Chat integration](../../chat/integration.md) says. A phone gets no
  request, so no keyboard opens on its own.
- On desktop, the chat shows the file, diff, Preview, and skill tabs of
  the saved view among the session tabs, in the one order of the tab row.
  [Preview tabs](tools-part.md#preview-tabs) gives the Preview tabs, and
  [The skill tabs](skill-tabs.md) gives the skill tabs. A
  file or diff tab moves by drag and with its tab menu, as a session tab
  does, as [the chat](../../chat/README.md#rules-for-this-code) says. The
  file or diff tab of the address shows in place of the chat of the
  session, and the tabs stay. No session tab is the current one then, and
  the row keeps the tab of the address in view. The temporary tab of the
  saved view shows its title in italics, and a screen reader hears
  "temporary" after its name.
- A click on a session tab, a new session, or a reopened session makes
  that session the active tab of the view. The address then goes back to
  the chat.
- `RestoreShownTab` of `restore-tab.tsx` shows the active tab of the
  saved view again when the screen opens at the address of the workspace
  alone, as a click on its row in the list does. When that tab is a file,
  diff, or Preview tab, its address replaces the address of the workspace.
  It decides once, when the chat first knows the view, so a later move to
  the address of the workspace, such as a click on a session tab, shows
  the chat. Such a later move, such as a move back in the browser
  history, also saves the shown session as the active tab. An address that names a
  view or a session, a move of the address before the view is known, a
  phone, and an archived workspace keep the address, as
  [The tab row](../../../docs/protocol/tab-row.md#the-shown-tab-at-a-return)
  says. The screen keeps the arrival address in a `TabRestore` for its
  whole show, so a switch between the phone and the desktop layout
  restores nothing again.
- Close on a file tab takes it out of the view. When it shows, the next
  file tab shows, else the one before, else the chat. Close on the
  temporary tab also clears its mark. While the temporary tab shows,
  Escape closes it in the same way, through `usePageEscape` of the
  [shortcut layer](../shortcuts/README.md#escape-on-the-page).
- A file of a finished turn opens its diff tab. A phone shows it in the
  Files tab.
- The chat gets the kept files of the workspace as `mentions`, for the
  list of `@` and the file chips, as
  [File mentions](../../../docs/protocol/file-mentions.md) says. It reads
  them from the one connection of the screen, also on a phone before a
  visit to Files. A file chip opens the file tab, as a
  press in All files does. A folder chip opens the folder in All files and
  shows the right column on desktop, or the Files tab on a phone. A skill
  chip opens the skill tab, as [The skill tabs](skill-tabs.md) says.
- An archived workspace shows no file tabs and no file page, and its chat
  gets no files.
- A record of the workspace with another repository closes each file and
  diff tab of the view, because its path belongs to the old folder, as
  [After the change](../../../docs/protocol/repository-change.md#after-the-change)
  says. The chat then shows the chat of its session, and it saves the
  view. `LeaveMovedFiles` of `files/moved-files.tsx` replaces a file or
  diff address with the chat on desktop, and with the Files tab on a
  phone.
- The screen gives each of its parts one link opener, `WorkspaceLinks` of
  `link-opening.tsx`, through `LinkOpeningProvider` of
  `../ui/text-links.tsx`. So the links of chat text open as
  [Chat links](../../../docs/protocol/chat-links.md) says, and the links
  of the file preview, also in the Files tab of a phone, as
  [Files and changes](../../../docs/protocol/workspace-tools.md#files-and-changes)
  says. A link of the app opens its page in the same window, as an
  `AppLink` does, so a press on a link to the address that shows replaces
  that address. A local address of chat text opens the address of the
  Preview tool with its port, from `previewPortHref`. On desktop the right
  column then shows, as for a folder chip, and a phone shows the Preview
  tab. A read-only workspace gives no port previews, so a local address of
  chat text stays text there. A local address of a file opens a new tab.
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
  through `KeptConnections`, on desktop and on each tab of a phone. So
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
- Keep open in the tab menu of the temporary tab clears the mark in the
  same way: the shell gives only that tab a `keep` for the chat. A move of
  the temporary tab to another place in the row clears the mark too, in
  the chat's save of the new order.
- The row menu of each row of All files and Changes holds Add to chat,
  a line, and Copy path, as
  [File row menu](../../../docs/protocol/file-row-menu.md) says. The shell
  gives them to the Files panel as its `rowMenu`, and gives each file and
  diff tab a `copyPath` for Copy path of its tab menu. Both Copy path
  items copy the real path with the clipboard of the org, so the Mac app
  copies too, and a toast says the result. A copy sends no request and
  starts no sandbox, so it also works from the lists that a stopped
  sandbox keeps. A tab whose label hides a secret value, or is not known
  yet, gets no `copyPath`.
- Add to chat gives the file or the folder of its row to `addToChat` of
  the kept chat, which puts its chip into the message field of the
  session that the member saw last, or of a new session, as
  [Add to chat](../../chat/loads-and-sends.md#add-to-chat) says. On
  desktop, the chat leaves a file or diff tab for that session, as for a
  click on a session tab, and the field takes the focus through the focus
  request of the app. The row menu gives the focus back to the row before
  the item runs, so that request names the row. A phone switches to the
  chat, with no focus request.
- Add to chat shows only on a row whose entry the list of `@` offers, so a
  deleted file of Changes has none. It shows only after the chat loads,
  and not while a bar of the sandbox takes the place of the composer, as
  `barReplacesComposer` of `sandbox-view.ts` says. So the lists that a
  stopped sandbox keeps offer Copy path only. The items follow each
  change of these states, also in a menu that is open.
- A click on a list saves the list. On desktop the list belongs to the
  right column, so the address keeps the tab of the centre. On a phone a
  list is a page with its own address. An address that names a list saves
  that list.
- On a phone, a file or a diff shows as a page of the Files tab, with a
  link back to All files or Changes. A press there opens the temporary tab
  of the saved view too, though the row of a phone shows no file tabs.
- The links of the file preview open through the one link opener of the
  screen, as [The chat of the workspace](#the-chat-of-the-workspace) says.
  The tab of an HTML file shows its page as
  [The tabs of HTML files](html-tabs.md) says.
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
  its panel has Resume or Try again, and the words of a refusal. While a
  Resume of the visit runs, the panel shows the wait of a start instead,
  with no Resume, and the header of the workspace shows Starting. That
  Resume can be the one of the open of the workspace, of the open of the
  tab, or of a press on Resume or Try again. The wait ends with its
  reply, or with a newer state of the sandbox. After a failed Resume, the
  panel shows the state of the sandbox again. The
  header keeps the name of the file, and a diff keeps its changed lines.
- Each visit that opens a file or diff tab resumes a stopped sandbox, as
  [Stop and resume](../../../docs/protocol/workspace-life.md#stop-and-resume)
  says. `ResumeOnTabOpen` listens to each visit of the app navigation:
  each click, link, and move back or forward. A visit opens a tab when it
  moves to another tab, or when it visits the address of the tab again, as
  a second click on the tab or on its file does. A tab that opens while
  the open of the workspace still resumes the sandbox sends no second
  Resume.
- A switch between the preview and the source keeps the tab, so it starts
  nothing. The address of the screen at its first show starts nothing
  there either, because the open of the workspace resumes the sandbox. The
  address of a restored tab counts as that first address, through
  `replaceWithoutVisit` of `tab-visits.ts`, so it starts nothing too.
- A Restore moves no address, so it starts nothing, also while the address
  names a file or diff tab. The next visit that opens a tab resumes the
  sandbox.
- After a repository change, the kept files mark the tree as unavailable,
  drop the changes, and read the changes again, as
  [Store rules](../../files/store.md) says. The reports of the new folder
  then replace both lists.
- The kept files, Copy, and Download use the services of the org, as
  [the Files screens](../../files/README.md#integration) say.
- The tabs of All files, Changes, and Checks name the keys of Go to All
  files, Go to Changes, and Go to Checks in their tooltips and in
  `aria-keyshortcuts`, as the palette's Go to rows run them. The shell
  gives the keys to `FilesPanel` as plain props.

## The tools part

[The tools part](tools-part.md) gives the Terminal and Preview tools of
the shell, the hidden Desktop tool, their addresses, the Preview tabs of
the centre row, and New terminal of the command palette.

## The GitHub part

The workspace screen keeps one GitHub store, through `useGitHubState` of
[the GitHub screens](../../github/README.md), for the pull request bar or
row and the Checks tab of the Files part. It reads with the `fetch` of
the org, waits with the timer of the app, and takes the GitHub events of
the ordered stream of the workspace. Of the old GitHub states that a replay
of the stream holds, it takes only the newest, so the bar does not flicker
through them while the workspace loads. On a seeded stream, a new GitHub
subscription gets one empty history at the stream's current number. Its
own reads give the current state.

- The screen keeps one action state for the bar on desktop and the top of
  the Checks tab on a phone, as
  [The actions of the bar](../../github/actions.md) says. It reads the
  member's own GitHub access, the local work of the kept files, and the
  turns of each session of the kept chat. A new branch of the workspace
  makes a new action state. The org model keeps the last access for each
  repository, so the bar of another workspace of the repository offers
  its actions at once.
- A GitHub state of another branch than the workspace's, such as the merged
  state just after Continue, shows as loading. The store then reads the
  state of the branch once.
- The list mark of the workspace shows the GitHub state of this store
  while the screen shows it, in the list, the palette, and the chips. So
  the mark changes with the bar, and does not wait for the next read of
  the list. `LiveGitHubStates` in `src/app/live-github.ts` puts the state
  over the summary of each list read, because the Worker copies a new
  state to the list only after its event.
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
  on a phone. A failure that arrives after the screen closed, or after the
  branch changed, keeps the view and selects no session, as
  [Agent actions](../../github/actions.md#agent-actions) says.
- `ContinueDialog` asks the question of Continue, after its check found
  local work. The shared `LocalWorkList` lists that work, as in the
  mockup of the question.
- On a phone, the row sits under the header on every tab. It is one link to
  the Checks tab, whose top holds the actions, the line under the bar, and
  the links to GitHub. While the branch has no pull request, that top also
  names the branch and its base above the actions, also when the bar has
  none. A branch without a pull request opens that tab when the bar has an
  action or a link.
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
  [Mac commands](../../chat/device/README.md). It reads the settings of
  this Mac that the window shares, from `../mac/this-mac.ts`, with the
  switch of Mac access of the Capabilities control. A browser draws
  nothing there.
- Each part sends through the services of the org, from `useOrgServices`
  of `../context.ts`. Their client and fetch mark the org on
  `org_suspended`, so a page with an old org list turns read-only at once.
  The settings of this Mac are the one exception: they belong to the
  window, not to an org, so they send through the client of the app.
