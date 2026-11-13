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
toast after the reply offers Restore. The archived bar, the row of the Archived group, and
the palette offer Restore to each member until the last day, as
[Restore](../../../docs/protocol/workspace-life.md#restore) says.

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

Place `<HeaderNoticeBars notices={notices} />` directly after the
header. It draws `notices.shown` with the CSS module of the
mockups' `LostUpdateBar` and the words of `lostCopy.ts`. Its Dismiss is the
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
