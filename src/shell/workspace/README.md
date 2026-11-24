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
`app/chat/lost-updates`.

The workspace list offers Archive over the time of each permitted row on
hover only, and Restore over the time of each row of the Archived group
until its last day. Selection and keyboard focus alone keep the time
visible. The header has no Archive button. The shortcut and the menu of a
row, the command palette, and the pull request bar archive in the same
way, at once and with one request, as
[Archive](../../../docs/protocol/workspace-life.md#archive) says. The
Archive shows as done before its reply: the row moves to the Archived
group, and the open workspace shows as archived. A failed Archive brings
both back and names the failure in a toast, as
[Archive](../../../docs/protocol/workspace-menu.md#archive) says. The
toast after the reply gives the day when the workspace leaves the list,
and offers Restore. The archived bar, the row of the Archived group, and
the palette offer Restore to each member until the last day, as
[Restore](../../../docs/protocol/workspace-life.md#restore) says. On that
day the workspace leaves the list. A link still opens its read-only chat,
whose bar has the title "Removed on" and the day, as
[Removed workspaces](../../../docs/protocol/workspace-life.md#removed-workspaces)
says.

The state in the header is a menu button while the software of the cloud
computer runs: Ready, Working, Needs input, and Done, unread.
[`HeaderState`](HeaderState.tsx) offers Restart there to each member of an
org that is not suspended. It shows Starting from the press, asks first
while an agent works, and names a failed update check or a failed restart
in a toast, as
[Restart the software](../../../docs/protocol/workspace-life.md#restart-the-software)
says. The mockups are at `app/restart`.

A press on the name in the header opens the workspace menu of the list
for the open workspace, below the name.
[`useHeaderMenu`](useHeaderMenu.tsx) reuses the menus of the list, so the
two menus have the same actions for the same people. Rename puts its field
in place of the name in the header, as
[The menu in the header](../../../docs/protocol/workspace-menu.md#the-menu-in-the-header)
says. The mockups are at `app/workspace-menu/header`.

## The repository in the header

[`RepositoryControl`](repository/RepositoryControl.tsx) draws the
repository of the header as a button, on desktop and in the line under the
name of a phone, as
[The menu](../../../docs/protocol/repository-change.md#the-menu) says. The
mockups are at `app/repository-change`. The button and the words come from
the shared `RepositoryButton`, `RepositoryPicker.module.css`, and
`repositoryMoveCopy`.

- Its menu lists the repositories of the org that the cloud computer
  holds, in the order of New workspace, with a check on the current one.
  The chat reads `heldRepositoryIds` with the view, and
  `useHeldRepositories` gives it. Without a record of the folders, only
  the current repository shows. Desktop opens the menu below the button,
  and a phone opens a sheet. Every member may pick (repository change
  decision 2 B).
- The repository shows as text when the menu has no other repository, in
  an archived workspace, and in a suspended org.
- A pick of another repository starts the change at once, through
  `RepositoryChange` of `repository/repository-change.ts`. It reads a
  pending job again each second, as Continue does. While it runs, the
  button shows a spinner and the new repository. It ends when the stream
  shows the new repository.
- Work that the workspace stops following ends the run with the question
  of `RepositoryQuestion`. Its text is the shared `RepositoryChangeText`.
  Change repository asks again with `allowWork`, and Cancel sends
  nothing. The question names each changed file of both lists by its
  label, or by its real path when the reply has no label. The requests
  keep the real names.
- A refused or failed change shows the toast "The repository didn't
  change." with the message of the Worker.
- After the change, the chat closes the file and diff tabs of the old
  repository and saves the view, the address leaves a file page, and the
  Files store reads the changes again, as
  [The chat of the workspace](screen-parts.md#the-chat-of-the-workspace)
  and [The Files part](screen-parts.md#the-files-part) say. The chat draws
  the note of each session, as
  [the transcript](../../chat/transcript.md) says.

## The kept workspace

[The kept workspace](kept-workspace.md) gives the parts that the tab keeps
for each workspace that it showed, and what a return reads again.

## The chat of the workspace

[The chat of the workspace](screen-parts.md#the-chat-of-the-workspace)
gives how `ChatArea` draws the kept chat in the centre, with its file
tabs at their places in the tab row.

## The Files part

[The Files part](screen-parts.md#the-files-part) gives the Files screens
of the shell, their addresses, and the saved view.
[The tabs of HTML files](html-tabs.md) gives the files preview of the
workspace, which shows the page of an HTML file in its tab, and the frames
that the chat keeps.

`files/chat-mentions.ts` builds the mentions of the kept chat. It gives
`ChatMentions.pictures` only while the sandbox runs, with no sandbox panel
and no resume at open. The reader stays the same while the tab keeps its
files store, so a return, stop, or resume keeps its cached results. Picture
reads call only the file client and cannot start or resume the sandbox.

## The skill tabs

[The skill tabs](skill-tabs.md) gives the skill tabs of the centre: their
place in the saved view, their address, the page of a skill and its read,
and the skill chips that open them.

## The tools part

[The tools part](tools-part.md) gives the Terminal and Preview tools of
the shell, the hidden Desktop tool, their addresses, and the Preview tabs
of the centre row. On desktop it keeps the terminals of the workspace
while the sandbox runs, so the command palette offers New terminal after
the Go to rows while the + of the terminal tabs takes a press. The row
runs that +, as [New terminal](tools-part.md#new-terminal) says.

## The GitHub part

[The GitHub part](screen-parts.md#the-github-part) gives the one GitHub
store of the screen, and the pull request bar or row.

## The Mac bar and the owner

[The Mac bar and the owner](screen-parts.md#the-mac-bar-and-the-owner)
gives the owner picker, the Mac bar, and the services of the org.

## Notices of a failed repair

After a failed repair, a bar below the header names the workspace data
that is out of date. [Notices of a failed repair](repair-notices.md) says
how the bars show, clear, and hide.

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
const { model, notices, chat, toolEvents, skills } = shown
```

A new `create` makes a new view, so keep `app` and `viewer` stable.

- `view` gives a `WorkspaceView` over the kept model, notices, chat,
  tool events, and skill lists. The first view makes these parts. `create`
  starts no read and no subscription, and stops nothing, so a render can
  call it.
- The snapshot is the `detail` of the model, or `loading` while a kept
  failure waits for the open of this view.
- The hook connects the view after the render. The first connect of a
  workspace reads the members when they are not ready. The first connect
  in the tab makes the memory follow the sign-in.
- Each connect calls `notices.newView()`. The notices, tool events, and
  skill lists follow the model's stream before `model.open()` and
  `chat.show()`. On a first show they get the workspace seed, or the
  stored history if the read gave no seed. They then take newer events in
  order.
- The stop of a connect calls `model.close()`, ends the follows, and
  calls `chat.hide()`. A connect starts nothing for a workspace that the
  tab no longer keeps.

The context of the features gives the kept chat as `savedView` and as
`chat`, and the tool events as `toolEvents`. `KeptConnections`
connects the kept files of the tab through `useWorkspaceStore`, as
[the Files screens](../../files/README.md#integration) show, and the parts
that show files read the same store.

Place `<HeaderNoticeBars notices={notices} />` directly after the
header. It draws `notices.shown` with the CSS module of the
shared `LostUpdateBar` and the words of `lostCopy.ts`. Its Dismiss is the
shell's `IconButton`. The ages use the clock of `AppServices`, and they
move on every 30 seconds.

## A refused start

[A refused start](refused-start.md) gives the refused bar and panels, the
refusal of a suspended org, and the context that each part gets.

## Development page

[Development page](development-page.md) says how to run the page over the
fake API, with its address options, its controls, and the test command.

## Key code

[Workspace key code](key-code.md) names the files, the types, and the
functions of the workspace screen that a reader opens first.

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
