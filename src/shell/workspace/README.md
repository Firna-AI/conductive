# Workspace screen

The workspace screen shows one open workspace: its header, the start
steps, the states of its cloud computer, and its chat. On desktop the chat
column sits beside the right column. A phone shows one view at a time,
with a tab bar. The chat fills the centre by default, as
[The chat of the workspace](#the-chat-of-the-workspace) says.
The shell gives its own parts: the Files screens, the tools, the pull
request bar, and the owner picker, as [The Files part](#the-files-part),
[The tools part](#the-tools-part), and [The GitHub part](#the-github-part)
say. A host can give its own parts instead, as
[Composition](../../app/README.md#composition) says. The visual spec is the
`app` page of the [mockup catalogue](../../../docs/mockups/README.md). The
states of the cloud computer are in `app/shell`, and the notices are in
`app/chat/lost-updates`. A workspace from Conductor before its first
activation is in `app/imported`.

The workspace list offers Archive over the time of each permitted row on
hover only, and Restore over the time of each row of the Archived group
until its last day. Selection and keyboard focus alone keep the time
visible. The header has no Archive button. The shortcut and the menu of a
row, the command palette, and the pull request bar archive in the same
way, at once and with one request, as
[Archive](../../../docs/protocol/workspace-life.md#archive) says. Before a
successful activation, a workspace from Conductor asks its question first,
as [Archive before the activation](../../../docs/protocol/imported-workspaces.md#archive-before-the-activation)
says. A toast then offers Restore while the cloud computer is kept. The archived bar, the row of the Archived group, and
the palette offer Restore to each member until the last day, as
[Restore](../../../docs/protocol/workspace-life.md#restore) says.

## The kept workspace

[The kept workspace](kept-workspace.md) gives the parts that the tab keeps
for each workspace that it showed, and what a return reads again, with its
key code.

## The chat of the workspace

[The chat of the workspace](screen-parts.md#the-chat-of-the-workspace)
gives how `ChatArea` draws the kept chat in the centre, with its file
tabs at their places in the tab row.

## The Files part

[The Files part](screen-parts.md#the-files-part) gives the Files screens
of the shell, their addresses, and the saved view.

## The tools part

[The tools part](screen-parts.md#the-tools-part) gives the Terminal and
Preview tools of the shell, the hidden Desktop tool, and their addresses.

## The GitHub part

[The GitHub part](screen-parts.md#the-github-part) gives the one GitHub
store of the screen, and the pull request bar or row.

## The Mac bar and the owner

[The Mac bar and the owner](screen-parts.md#the-mac-bar-and-the-owner)
gives the owner picker, the Mac bar, and the services of the org.

## Notices of a failed repair

After a failed repair, a bar below the header names the workspace data
that is out of date. [Notices of a failed repair](repair-notices.md) says
where to place the bars, and how they show, clear, and hide.

## Integration

The screen gets a view of its kept workspace through `useWorkspaceStore`
of [the web app](../../app/README.md#data-lifecycle). The stable `create`
calls `ShownWorkspaces.view`, and the stable `connect` is the module
function `connectView`:

```tsx
function connectView(view: WorkspaceView): () => void {
  return view.connect()
}

const app = useApp()
const create = useCallback(
  (workspace: WorkspaceIdentity) =>
    shownWorkspaces(app, viewer).view(workspace),
  [app, viewer],
)
const { store: shown, snapshot: detail } = useWorkspaceStore(
  { orgId, workspaceId },
  { create, connect: connectView },
)
const { model, notices, chat, toolEvents } = shown
```

A new `create` makes a new view, so keep `app` and `viewer` stable.

- `view` gives a `WorkspaceView` over the kept model, notices, chat, and
  tool events. The first view of a workspace makes these parts. `create`
  starts no read and no subscription, and stops nothing, so a render can
  call it.
- The snapshot is the `detail` of the model, or `loading` while a kept
  failure waits for the open of this view.
- The hook connects the view after the render. The first connect of a
  workspace reads the members when they are not ready. The first connect
  in the tab makes the memory follow the sign-in.
- Each connect calls `notices.newView()`, makes the notices and the tool
  events follow the stream of the model, and calls `model.open()` and
  `chat.show()`, in this order. The follows come before the open. So at a
  first show, the notices and the tool events get the stored history of
  the workspace from its first event, then the live events, in event
  order.
- The stop of a connect calls `model.close()`, ends both follows, and
  calls `chat.hide()`. A connect starts nothing for a workspace that the
  tab no longer keeps.

The context of the features gives the kept chat as `savedView` and as
`chat`, and the tool events as `toolEvents`. `KeptFilesConnection`
connects the kept files of the tab through `useWorkspaceStore`, as
[the Files screens](../../files/README.md#integration) show, and the parts
that show files read the same store.

## A refused start

[A refused start](refused-start.md) gives the refused bar and panels, the
refusal of a suspended org, and the context that each part gets.

## Development page

[Development page](development-page.md) says how to run the page over the
fake API, with its address options, its controls, and the test command.

## Key code

- `WorkspaceScreen.tsx`: the screen of one open workspace. It takes a view
  of the kept workspace through `useWorkspaceStore`, and places the header,
  the notices, the columns, and the features. Its `Unavailable` view, in
  `Unavailable.tsx`, shows a 404. A failed first start keeps the screen, and
  `failedFirstStart` marks its sandbox view.
- `ChatArea.tsx`: the chat of the centre, with the start steps and the
  sandbox bar of the shell, the open file tabs, and the file page in place
  of the chat of the session, or the shell's own column for the chat slots.
  An old session from Conductor at the address shows there too, and a
  phone shows it in place of the whole chat.
- `documents/`: the old sessions of a workspace from Conductor, at
  `conductor/<document ID>`, apart from the Files screens: their page,
  tabs, links in place of an empty chat, history entries, and the first
  line of a continued session. They read the routes of the app in each
  state, and start nothing. `imported/`: the flag in the header, and the
  question of Archive before a successful activation.
- `files/files-features.tsx`: the Files part, which reads the kept files
  that the screen connects, and the file or diff page of the centre.
- `files/tab-open-resume.tsx`: `ResumeOnTabOpen`, which resumes a stopped
  sandbox at each visit that opens a file or diff tab, also a second click
  on the tab that shows. The screen draws it in each layout. A workspace
  from Conductor that waits for its activation starts nothing there, and
  its Files part connects no files.
- `session-address.tsx`: `OpenSessionAddress`, which shows the session of a
  session address once the chat loads, then replaces the address with the
  workspace address. A move to another address stops its lookup. The
  screen draws it beside `ResumeOnTabOpen`. `SessionAddress.test.tsx` and
  `SessionChips.test.tsx` mount the whole app for the address and the chips.
- `files/chat-files.tsx`: the file tabs of the kept chat, named by the
  labels of the kept files, at their places in the tab row with the props
  that the row gives each tab, the diff links, and the way back to the chat
  when a session becomes active.
- `files/files-navigation.ts`: the navigation of the Files screens, and
  the changes of the saved view that the address and the pages make.
- `files/files-address.ts` and `files/view-tabs.ts`: the addresses of the
  Files screens, and the tabs and the list of a view.
- `files/files-store.ts` and `files/workspace-files.ts`: the store of one
  workspace over the transport of the app, its connection, and Copy and
  Download.
- `files/FilesWiring.test.tsx`: mounts the whole app over the fake API. It
  opens a file beside the sessions, goes back by a session tab, and checks
  the saved view. It also checks a failed chat load, the diff of a turn on
  a phone, a stopped, starting, and refused sandbox, and an archived
  workspace.
- `files/StartingPages.test.tsx`: mounts the whole app over the fake API at
  a file address and at a diff address while the sandbox starts. It checks
  the sandbox panel in place of the page, with no read, and the read once
  the workspace is ready.
- `files/TabOpenResume.test.tsx`: mounts the whole app over the fake API. It
  checks the resume when a diff of a stopped workspace opens, also at a
  second click on the diff that shows, and no second resume at the first
  address. It checks the file that a tab keeps when the sandbox stops, no
  start at a switch of its view, and no start in a ready or a refused
  workspace.
- `app-features.tsx`: the shell's own files, pull request, and owner
  parts, which `useFeatures` puts under the parts of the host. The screen
  draws its own tools panel when the host gives no `tools` part.
- `WorkspaceOwner.tsx` and `WorkspaceMacBar.tsx`: the owner picker of the
  members UI, and the bar of the 15 minutes in the Mac app.
- `saved-view.ts`: the saved view of the kept chat, `saveView`, which
  writes a change only once the chat read the view, and `useRunRoutine`,
  the routine of a run workspace, which the chat reads with the view.
- `tools/ToolsPart.tsx`, `tools/tool-navigation.ts`, and
  `tools/tool-address.ts`: the tools panel and its `placeholder`, which
  takes the place of the tools inside the tabs, the tool and preview of the
  address or the saved view, and their addresses. `useToolSelect` is the
  select of a tool tab, which the Go to rows of the command palette share.
- `WorkspacePaletteActions.tsx`: the actions that the screen offers to the
  command palette, as `workspaceActionIds` chooses them. Each one runs the
  control of the screen: +, the clock of the history, a tab of the right
  column, Archive, or Restore.
- `tools/tool-events.ts`: `ToolEvents`, the events of the tools from the
  ordered stream. It keeps the revokes of previews, the latest report of the
  listening ports, and the first failed repair of that report since it. A
  tool that shows later gets them first, in event order.
- `github/WorkspaceGitHub.tsx` and `github/github-events.ts`: the one
  GitHub store of the screen, the bar or the row, and the GitHub events of
  the ordered stream. `github/bar-controls.ts` gives the one action state of
  the bar and its controls, and `github/bar-feed.ts` shows a GitHub state of
  another branch as loading.
- `files/kept-files.tsx`: `KeptFilesConnection`, the one connection of the
  kept files for the whole screen.
- `ContinueDialog.tsx`: the question of Continue with the local work, which
  `LocalWorkList` of the mockups lists.
- `github/BarMerge.test.tsx`, `github/BarAgent.test.tsx`,
  `github/BarContinue.test.tsx`, and `files/KeptFiles.test.tsx`: mount the
  whole app over the fake API. They check Merge and its refusals, the
  phone Checks top, the prompts from a file and a phone, a prompt that did
  not send, Continue with its question, a stop, the wait for a turn, the
  new branch and its note, and the local work of a phone on the chat tab.
- `tools/ToolsWiring.test.tsx` and `github/GitHubWiring.test.tsx`: mount
  the whole app over the fake API. They check the terminal socket across
  tool switches, the saved tool, the tabs and the state of a stopped
  sandbox with no tool mounted, a revoke before the Preview tool shows, a
  preview address on a phone, one GitHub read for the bar and Checks with a
  live event, the Checks row of a phone, and an archived phone.
  `wiring-test-kit.tsx` holds their helpers.
- `header-notices.ts`: `HeaderNotices`, the failed repairs of the name and
  the start steps. `follow` reads a stream, `dismiss` hides a notice in
  this view, `newView` shows each notice again, and `shown` gives the
  notices to draw.
- `HeaderNoticeBars.tsx`: the bars below the header, with Dismiss.
- `HeaderNotices.test.tsx`: mounts the screen in happy-dom over the fake
  API and its event stream, and checks the notices.
- `features.ts`: `WorkspaceFeatures`, the parts that plug in,
  `WorkspaceContext`, what each part gets, and `useFeatures`, the parts of
  the host over the app's own parts.
- `WorkspaceHeader.tsx` and `WorkspaceColumns.tsx`: the header, the
  columns, the toggle of the right column, and the tab bar of a phone.
  `RightColumnToggle.test.tsx` mounts the whole app over the fake API. It
  hides the right column, opens the workspace again, and shows the column.
- `CopyLink.tsx`: the label of the number, such as `W-395`, as the Copy
  link button of the header, as
  [Copy link](../../../docs/protocol/workspace-links.md#copy-link) says.
  It copies `workspace.link` through `AppServices.copy`, so the copy holds
  no tab path. "Link copied" shows for 2 seconds through
  `AppServices.delay`. A failed copy asks to try again until the next
  press, as the file page does. On desktop the button follows the name,
  and the repository fills the `.metas` group. On a phone
  it leads the line under the name. `CopyLink.test.tsx` mounts the whole
  app and presses the button for a copy and for a failed copy.
- `RunLine.tsx`: the line under the header of a run workspace, which links to its routine and the pull request of a pull request run. `RunLine.test.tsx` checks the line and its links.
- `SandboxNotice.tsx`, `notice-copy.ts`, and `StartingCard.tsx`: the
  states of the cloud computer, their words, and the start steps. The bar
  of an archived workspace offers Restore until its last day, then says
  when Restore ended. `useArchiveActions.tsx` runs Archive and Restore for
  each control, with their toasts, and gives the question of a workspace
  from Conductor before a successful activation, which the screen and the
  list draw. Archive from the row of the open
  workspace, by its shortcut or its menu, acts once, also during the first
  read, as [Archive](../../../docs/protocol/workspace-menu.md#archive)
  says. An Archive and a Restore during the first read resume nothing.
  `refusedStart` in `SandboxNotice.tsx` turns a refused start error into
  the refused notice. `sandbox-view.ts` chooses the bar and the panels,
  also for a suspended org, for the saved message of a failed start, and
  for the end of Restore. `ArchivedRestore.test.tsx` mounts the whole app
  for Restore by a member and for its end at the last day.
  Before the first activation of a workspace from Conductor, the bar asks
  Activate this workspace in place of the composer, and the panels show
  Not active in place of the lists. Its Activate runs `resume`, which
  sends Activate. A failed or stopped activation keeps the composer under
  its words and Try again. An Archive with no kept cloud computer says that
  the sessions from Conductor stay readable.
- `dev/`: the development page, with its options in `dev-options.ts` and
  its controls in `DevControls.tsx`.

## Related docs

- [Lost workspace updates](../../../docs/protocol/agent-runner.md#lost-workspace-updates):
  the repair, and the notice of a failed repair.
- [Start steps](../../../docs/protocol/workspace-life.md#start-steps)
  and [Workspace states](../../../docs/protocol/workspace-life.md#workspace-states).
- [Archive](../../../docs/protocol/workspace-life.md#archive) and
  [Restore](../../../docs/protocol/workspace-life.md#restore).
- [Workspace numbers and links](../../../docs/protocol/workspaces-and-sandboxes.md#workspace-numbers-and-links)
  and [Workspace links](../../../docs/protocol/workspace-links.md): the
  number, the link, and Copy link.
- [Workspace menu](../../../docs/protocol/workspace-menu.md): the menu of
  a workspace row, which can also rename, reassign, or archive the open
  workspace.
- [Web app: data and composition](../../app/README.md): the models, the
  event stream, and the features.
- [The chat](../../chat/README.md): the chat that fills the centre.
- [The Files screens](../../files/README.md) and
  [the browser fakes](../../test-support/README.md).
- [The web app in the architecture](../../../docs/architecture/components.md#web-app).
