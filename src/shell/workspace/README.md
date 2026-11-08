# Workspace screen

The workspace screen shows one open workspace: its header, the start
steps, the states of its cloud computer, the Archive question, and its
chat. On desktop the chat column sits beside the right column. A phone
shows one view at a time, with a tab bar. The chat fills the centre by
default, as [The chat of the workspace](#the-chat-of-the-workspace) says.
The files, the tools, and the pull request bar plug in as features, as
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
  the unavailable view. It says "This workspace is not available" and the
  message that the start saved, or "Its sandbox didn't start." when it has
  none, with All workspaces. It offers no Resume, and the list drops its
  row.
- A create that started keeps its start record. So a later error of its
  sandbox shows the sandbox bar with Try again, as a failed resume does.
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
- The shell gives the chat no `onOpenDiff` or `extraTabs` yet. So a file
  of a finished turn opens no diff, and the chat shows no file tabs.
- A `center` part takes the place of the chat.
- When the features give the `tabs`, `transcript`, or `composer` slot, the
  shell draws its own chat column with those slots, in place of the chat.

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
const { model, notices, chat } = shown
```

A new `create` makes a new view, so keep `app` and `viewer` stable.

- `view` gives a `WorkspaceView` over the kept model, notices, and chat.
  The first view of a workspace makes these parts. `create` starts no read
  and no subscription, and stops nothing, so a render can call it.
- The snapshot is the `detail` of the model, or `loading` while a kept
  failure waits for the open of this view.
- The hook connects the view after the render. The first connect of a
  workspace reads the members when they are not ready. It also starts the
  subscriptions between the kept parts and the creates of the org. They
  stay until the tab forgets the workspace. The first connect in the tab
  makes the memory follow the sign-in.
- Each connect calls `notices.newView()`, makes the notices follow the
  stream of the model, and calls `model.open()` and `chat.show()`, in this
  order. The follow comes before the open. So at a first show, the notices
  get the stored history of the workspace from its first event, then the
  live events, in event order.
- The stop of a connect calls `model.close()`, ends the follow, and calls
  `chat.hide()`. A connect starts nothing for a workspace that the tab no
  longer keeps.

Place `<HeaderNoticeBars notices={notices} />` directly after the
header. It draws `notices.shown` with the CSS module of the
mockups' `LostUpdateBar` and the words of `lostCopy.ts`. Its Dismiss is the
shell's `IconButton`. The ages use the clock of `AppServices`, and they
move on every 30 seconds.

## A refused start

`WorkspaceScreen` reads `model.startError`. While the sandbox is stopped or
failed, a start error whose code is in `refusalCodes` of `SandboxNotice.tsx`
shows the refused bar and panels: "The sandbox can't start", with the
reason of the error and no action. The codes are `user_suspended` and
`org_suspended`. Other start errors keep the stopped and error notices.
The header, the history, and the owner control stay. The Resume action and
its failure toast stay as they were.

A suspended org refuses each start, so its workspace shows the refused bar
of the org in any state but archived, also while the stop of its cloud
computer runs. The bar has the same words for the org list's suspension
and for an `org_suspended` refusal. An archived workspace keeps its bar,
and `ChatArea` puts the notice of the org above it. `sandbox-view.ts` holds
these rules. `WorkspaceContext.readOnly` tells each part that the
workspace takes no write: it is archived, or its org is suspended.
`ChatArea` gives it to the kept chat, which then shows its history
read-only. [A suspended org](../../app/suspended-org.md) gives the other
screens.

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

The page gives only the Files feature, so the real chat fills the centre.
It has no tools panel and no pull request row, so on desktop the notices
of the file lists sit at the end of the right column.

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
  sandbox bar of the shell, or the shell's own column for the chat slots.
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
- `features.ts`: `WorkspaceFeatures`, the parts that plug in, and
  `WorkspaceContext`, what each part gets.
- `WorkspaceHeader.tsx` and `WorkspaceColumns.tsx`: the header, the
  columns, and the tab bar of a phone.
- `SandboxNotice.tsx`, `StartingCard.tsx`, and `ArchiveDialog.tsx`: the
  states of the cloud computer, the start steps, and the Archive question.
  `refusedStart` in `SandboxNotice.tsx` turns a refused start error into
  the refused notice. `sandbox-view.ts` chooses the bar and the panels,
  also for a suspended org and for the saved message of a failed start.
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
