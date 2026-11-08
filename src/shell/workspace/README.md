# Workspace screen

The workspace screen shows one open workspace: its header, the start
steps, the states of its cloud computer, the Archive question, and its
chat. On desktop the chat column sits beside the right column. A phone
shows one view at a time, with a tab bar. The chat fills the centre by
default, as [The chat of the workspace](#the-chat-of-the-workspace) says.
The shell gives its own parts: the Files screens, the tools, the pull
request bar, and the owner picker, as [The Files part](#the-files-part),
[The tools part](#the-tools-part), and [The GitHub part](#the-github-part)
say. A host can give its own parts instead, as
[Composition](../../app/README.md#composition) says. The visual spec is the
`app` page of the [mockup catalogue](../../../docs/mockups/README.md). The
states of the cloud computer are in `app/shell`, and the notices are in
`app/chat/lost-updates`.

## The kept workspace

The tab keeps a `ShownWorkspace` for each workspace that it showed: its
`WorkspaceModel`, its `HeaderNotices`, and its `ChatController`.
`shownWorkspaces(app, user)` in `shown-workspaces.ts` gives the memory of
the `AppModel` of the tab, for the signed-in user.

- Each mount of the screen shows the kept parts through a new
  `WorkspaceView`, after the render, as [Integration](#integration) says.
- An unmount closes the socket of the model and the socket of the chat.
  Each stream keeps its last event number.
- A return draws the kept header, notices, and chat at once. Then each
  socket asks only for the events after its own last event number.
- On a return, the model reads the workspace again, as at each open. The
  chat reads nothing again: no history, no session list, and no view.
- Each kept chat takes the account, the models, its org, and the members of
  the org from the app models, as its `sources`. So a login that the
  account screen saves, a new default model, or a new org name shows in
  the kept chat at once.
- A first show reads the members of the org when they are not ready, such
  as when no screen read them yet or an earlier read failed. A return reads
  no members.
- A kept detail that failed waits for the open of this view, with the
  spinner. So a return never shows an old failure.
- A chat load that ends while the screen is away opens no socket until the
  next mount.
- A sign-out, or a sign-in of another user, stops every kept workspace and
  forgets it.
- Each kept workspace gives the events of its stream and a 404 of its open
  to the creates of its org, as
  [Creation recovery](../../app/creation-recovery.md) says. A failed create
  of this tab forgets its kept model, notices, and chat, so its streams
  never open again.
- In a tab without its form, a workspace whose create start failed shows
  the unavailable view. It says "This workspace is not available" and "Its
  sandbox didn't start.", with All workspaces. It offers no Resume, and the
  list drops its row.
- A create that started keeps its start record. So a later error of its
  sandbox shows the sandbox bar with Try again, as a failed resume does.
- The tab also keeps the `ToolEvents` of each workspace. Each show makes
  them follow the stream of the model before it opens, as the notices do.
  They keep the revokes of previews, and give each tool the kept revokes
  first, then the live events.
- The tab also keeps the `WorkspaceFiles` of each workspace whose Files
  part showed. The Files part connects it while it shows, so a return
  shows the lists at once, and its socket asks only for the events after
  its last event number. A sign-out and a failed create stop and forget it
  with the other kept parts.
- Nothing goes to browser storage. So a reload or a new tab starts empty,
  and reads the stored history again.
- The memory has no size limit. It keeps each workspace that the tab
  showed until a reload or a sign-out.

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
  after the session tabs. The file or diff tab of the address shows in
  place of the chat of the session, and the tabs stay. No session tab is
  the current one then.
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
  chat's `updateView`, so the view has one writer.
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
  Changes, and Checks stays. An archived workspace has no file lists, and
  its right column shows the archived panel.
- Copy and Download use the services of the app, as
  [the Files screens](../../files/README.md#integration) say.

## The tools part

The shell gives the Terminal, Preview, and Desktop tools as its own
`tools` part, with the [terminal](../../terminal/README.md), the
[previews](../../previews/README.md), and the
[desktop](../../desktop/README.md). A `tools` part of the host takes its
place. The tools show only while the sandbox runs, and an archived
workspace has none.

| Address | What shows |
| ------- | ---------- |
| `terminal`, `desktop` | That tool |
| `preview`, `preview/<previewId>` | The Preview tool, with that preview |

- An address that names a tool shows it and saves it as `tool` of the
  view. Without one, the saved view names the tool.
- On desktop the panel has a tab for each tool. A click saves the tool,
  and the address keeps the tab of the centre. Only a tool address follows
  the new tool. A preview tab changes the address only from a preview
  address, and otherwise picks the preview in the panel.
- On a phone each tool is a page of the tab bar, with its own address.
- The terminal mounts at its first show, then stays mounted and hidden
  while another tool shows, so its connection stays. Its socket opens at
  the `socketPath` of the terminal state through `openSocket` of the app's
  event source, so the Mac app reaches its own Worker.
- The Desktop tool mounts at each show, so it reads a new desktop URL.
- Each tool reads its routes with the `fetch` of the app's `ApiClient`,
  and the events of the kept `ToolEvents`.

## The GitHub part

The workspace screen keeps one GitHub store, through `useGitHubState` of
[the GitHub screens](../../github/README.md), for the pull request bar or
row and the Checks tab of the Files part. It reads with the `fetch` of
the app, waits with the timer of the app, and takes the GitHub events of
the ordered stream of the workspace.

- On desktop, the bar tops the right column. After a merge, its Archive
  opens the Archive question of the screen.
- On a phone, the row sits under the header on every tab. A pull request
  opens the Checks tab at its address.
- An archived workspace keeps the bar on desktop. On a phone it shows only
  its chat, so the screen reads no GitHub state there.

## The Mac bar and the owner

- The owner picker of the header is the shell's own `owner` part,
  `WorkspaceOwner`. It mounts `OwnerPicker` of the
  [members UI](../../members/README.md).
- In the Mac app, `WorkspaceMacBar` tops the main area above the whole
  workspace, also while a file shows in place of the chat. It mounts
  `AllowAllBar`, the bar of the 15 minutes, of the
  [Mac commands](../../chat/device/README.md). A browser draws nothing
  there.

## Notices of a failed repair

The workspace name and the start steps belong to no chat session. The
workspace can refuse an update of one of them. After such a first loss, it
asks the runner for a fresh full report, and the screen shows nothing.
When the workspace refuses that report too, the repair failed. Then a bar
below the header names the data that is out of date, with the time since
the repair failed.
[Lost workspace updates](../../../docs/protocol/chat-and-events.md#lost-workspace-updates)
gives the rules. The Files panel shows the notices of the file lists, as
[the Files screens](../../files/README.md#integration) say.

- `HeaderNotices` keeps these failed repairs. It is a store of its own,
  apart from `WorkspaceModel`. The tab keeps one for each workspace that it
  showed, as [The kept workspace](#the-kept-workspace) says.
- Only a marker with `repairFailed: true` and no session adds a failed
  repair. A first loss adds nothing. The chat owns the markers of a session.
- Only a later full report of the same kind in the stream clears a failed
  repair: `workspace.title` for the name, and `start.updated` for the start
  steps. A report of another kind and `workspace.updated` clear nothing.
- A reply of a route clears nothing, such as the reply of Resume. Only the
  order of the stream shows that a report is newer than the failure.
- The notice of the start steps stays after the start ends, until a full
  report of the start steps.
- A further failure of a failed kind keeps the time of the first one.
- The bar of the name comes first, then the bar of the start steps. On
  desktop they sit above the session tabs. On a phone they sit above the
  pull request row, on every tab.

Dismiss hides a bar in the mounted view only:

- It sends nothing to the Worker, and the failed repair stays.
- A further failure of the same kind stays hidden.
- Each mount of the screen starts a new view with `newView`, so a return
  shows the bar again. A new tab reads the stored history, so it shows the
  bar too.
- A full report of that kind clears the failed repair. A failure after
  that report shows again, also in the view where Dismiss hid the bar.

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
  workspace reads the members when they are not ready. It also starts the
  subscriptions between the kept parts and the creates of the org. They
  stay until the tab forgets the workspace. The first connect in the tab
  makes the memory follow the sign-in.
- Each connect calls `notices.newView()`, makes the notices and the tool
  events follow the stream of the model, and calls `model.open()` and
  `chat.show()`, in this order. The follows come before the open. So at a
  first show, the notices and the tool events get the stored history of
  the workspace from its first event, then the live events, in event
  order.
- The stop of a connect calls `model.close()`, ends both follows, and
  calls `chat.hide()`. A connect starts nothing for a workspace that the
  tab no longer keeps.

The context of the features gives the kept chat as `savedView`, and the
tool events as `toolEvents`. The Files part takes the kept files of the tab
through `useWorkspaceStore`, as
[the Files screens](../../files/README.md#integration) show.

Place `<HeaderNoticeBars notices={notices} />` directly after the
header. It draws `notices.shown` with the CSS module of the
mockups' `LostUpdateBar` and the words of `lostCopy.ts`. Its Dismiss is the
shell's `IconButton`. The ages use the clock of `AppServices`, and they
move on every 30 seconds.

## A refused start

`WorkspaceScreen` reads `model.startError`. While the sandbox is stopped or
failed, a start error whose code is in `refusalCodes` of `SandboxNotice.tsx`
shows the refused bar and panels: "The sandbox can't start", with the
reason of the error and no action. Today the only such code is
`user_suspended`. Other start errors keep the stopped and error notices.
The header, the history, and the owner control stay. The Resume action and
its failure toast stay as they were.

`WorkspaceContext.onReassigned(workspace)` passes a confirmed new owner to
`model.reassigned`. A feature that composes the owner slot must call it
from the `onReassigned` of the owner picker.
[Starts, stops, and builds](../../../docs/protocol/operator-actions.md#starts-stops-and-builds)
states the refusal.

## Development page

The development page runs the app shell with this workspace, its chat, and
its Files panel over the [fake API](../../test-support/README.md). It uses
React alone, with no Worker. The clock of the page stands still at
`FAKE_TIME`, so each stored age stays as drawn. The product build does not
include the page. From the repository root:

```sh
npx vite --config src/shell/workspace/dev/vite.config.js --port 5182
```

Then open `http://localhost:5182/src/shell/workspace/dev/`. The root of
this server is the repository root, so it also serves the
[Files development page](../../files/README.md#development) at
`/src/files/dev.html`. The address holds the state of the page:

| Parameter  | Values |
| ---------- | ------ |
| `repair`   | The failed repairs of the stored history: `name`, `start`, `all-files`, and `changes`, joined by commas. The default, `name,changes`, is the picture of `app/chat/lost-updates`. `none` stores none. |
| `viewport` | `desktop`, or `phone`. The default follows the window. |
| `scheme`   | `dark`, or `light`. The default follows the system. |
| `view`     | The tab of a phone: `files`, the default, or `chat`, `terminal`, `preview`, or `desktop`. |
| `list`     | The list of the Files panel: `changes`, the default, or `all`, or `checks`. |
| `controls` | `off` hides the controls, as for a picture. |

For example, `?viewport=phone&view=terminal&repair=name,start,all-files,changes`
draws the bars of the name and the start steps on the Terminal tab of a
phone. The Files tab shows the notices of the two lists.

The controls have a row for each kind: Name, Start steps, All files, and
Changes.

- "Lose an update" sends the marker of a first loss, and nothing shows.
- "Lose its fresh report" sends the marker of a failed repair, and the
  notice shows.
- "Send a full report" clears the notice of that kind only.
- "Send a tree update" sends a tree delta, which leaves the notice of All
  files.
- "Open the workspace again" mounts a new workspace screen in the same
  tab. The kept notices start a new view, so a bar that Dismiss hid shows
  again, with no new read of the stored history.

The page gives its own Files part, so the real chat fills the centre.
`dev/main.tsx` makes the store of that part in a stable `create`, and
`DevPage` connects it through `useWorkspaceStore`. The other parts are the
app's own: the tools, the pull request bar, and the owner picker. The fake
has no terminal socket, so the terminal shows Disconnected.

Run the tests with `npm run test -- src/shell/workspace`.

## Key code

- `WorkspaceScreen.tsx`: the screen of one open workspace. It takes a view
  of the kept workspace through `useWorkspaceStore`, and places the header,
  the notices, the columns, and the features. Its `Unavailable` view shows
  a 404 and a failed create.
- `shown-workspaces.ts`: `ShownWorkspaces`, the kept workspaces of one tab
  and one user, and `shownWorkspaces`, which clears them at a sign-out or a
  sign-in of another user. It gives the events and a 404 of each kept
  workspace to the creates of its org, and forgets a failed create.
  `ShownWorkspaces.view` gives a view of a workspace, and makes its parts
  at the first view.
- `workspace-view.ts`: `WorkspaceView`, the store of one mounted view over
  the kept parts. Its snapshot is the detail of the model. `connect` shows
  the parts, and its result hides them.
- `ChatArea.tsx`: the chat of the centre, with the start steps and the
  sandbox bar of the shell, the open file tabs, and the file page in place
  of the chat of the session, or the shell's own column for the chat slots.
- `files/files-features.tsx`: the Files part, which connects the kept
  files, and the file or diff page of the centre.
- `files/chat-files.tsx`: the file tabs and the diff links of the kept
  chat, and the way back to the chat when a session becomes active.
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
- `app-features.tsx`: the shell's own parts, which `useFeatures` puts under
  the parts of the host.
- `WorkspaceOwner.tsx` and `WorkspaceMacBar.tsx`: the owner picker of the
  members UI, and the bar of the 15 minutes in the Mac app.
- `saved-view.ts`: the saved view of the kept chat, and `saveView`, which
  writes a change only once the chat read the view.
- `tools/ToolsPart.tsx`, `tools/tool-navigation.ts`, and
  `tools/tool-address.ts`: the tools panel, the tool and preview of the
  address or the saved view, and their addresses.
- `tools/tool-events.ts`: `ToolEvents`, the events of the tools from the
  ordered stream, with the kept revokes of previews.
- `github/WorkspaceGitHub.tsx` and `github/github-events.ts`: the one
  GitHub store of the screen, the bar or the row, and the GitHub events of
  the ordered stream.
- `tools/ToolsWiring.test.tsx` and `github/GitHubWiring.test.tsx`: mount
  the whole app over the fake API. They check the terminal socket across
  tool switches, the saved tool, a revoke before the Preview tool shows, a
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
- `KeptWorkspace.test.tsx`: mounts the whole app over the fake API. It
  checks a return, the event number of each socket, a new tab, the clear at
  a sign-out, and the app values that change while the tab is away.
  `kept-test-kit.tsx` holds its helpers.
- `features.ts`: `WorkspaceFeatures`, the parts that plug in,
  `WorkspaceContext`, what each part gets, and `useFeatures`, the parts of
  the host over the app's own parts.
- `WorkspaceHeader.tsx` and `WorkspaceColumns.tsx`: the header, the
  columns, and the tab bar of a phone.
- `SandboxNotice.tsx`, `StartingCard.tsx`, and `ArchiveDialog.tsx`: the
  states of the cloud computer, the start steps, and the Archive question.
  `refusedStart` in `SandboxNotice.tsx` turns a refused start error into
  the refused notice.
- `dev/`: the development page, with its options in `dev-options.ts` and
  its controls in `DevControls.tsx`.

## Related docs

- [Lost workspace updates](../../../docs/protocol/chat-and-events.md#lost-workspace-updates):
  the repair, and the notice of a failed repair.
- [Start steps](../../../docs/protocol/workspaces-and-sandboxes.md#start-steps)
  and [Workspace states](../../../docs/protocol/workspaces-and-sandboxes.md#workspace-states).
- [Web app: data and composition](../../app/README.md): the models, the
  event stream, and the features.
- [The chat](../../chat/README.md): the chat that fills the centre.
- [The Files screens](../../files/README.md) and
  [the browser fakes](../../test-support/README.md).
- [The web app in the architecture](../../../docs/architecture.md#web-app).
