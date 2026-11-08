# Workspace screen

The workspace screen shows one open workspace: its header, the start
steps, the states of its cloud computer, and the Archive question. On
desktop the chat column sits beside the right column. A phone shows one
view at a time, with a tab bar. The chat, the files, the tools, and the
pull request bar plug in as features, as
[Composition](../../app/README.md#composition) says. The visual spec is the
`app` page of the [mockup catalogue](../../../docs/mockups/README.md). The
states of the cloud computer are in `app/shell`, and the notices are in
`app/chat/lost-updates`.

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
  apart from `WorkspaceModel`. The screen makes one for each mount.
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
- A new view or a new tab reads the stored history, so it shows the bar.
- A full report of that kind clears the failed repair. A failure after
  that report shows again, also in the view where Dismiss hid the bar.

## Integration

The screen makes the store and follows the event stream of its
`WorkspaceModel` before `open` starts that stream:

```tsx
const [notices] = useState(() => new HeaderNotices())
useEffect(() => notices.follow(model.stream), [notices, model])
useEffect(() => {
  void model.open()
  return () => model.close()
}, [model])
```

React runs the effects of a component in their order. So the store gets
the stored history of the workspace from its first event, then the live
events, in event order. `follow` gives the function that ends the
subscription. Place `<HeaderNoticeBars notices={notices} />` directly
after the header. It draws `notices.shown` with the CSS module of the
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

The development page runs the app shell with this workspace and its Files
panel over the [fake API](../../test-support/README.md). It uses React
alone, with no Worker. The clock of the page stands still at `FAKE_TIME`,
so each stored age stays as drawn. The product build does not include the
page. From the repository root:

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
- "Open the workspace again" mounts a new workspace screen. Its header
  notices read the stored history again, so a bar that Dismiss hid shows
  again.

The page mounts only the Files feature. It has no tools panel and no pull
request row, so on desktop the notices of the file lists sit at the end of
the right column.

Run the tests with `npm run test -- src/shell/workspace`.

## Key code

- `WorkspaceScreen.tsx`: the screen of one open workspace. It makes the
  `WorkspaceModel` and the `HeaderNotices` of the mount, and places the
  header, the notices, the columns, and the features.
- `header-notices.ts`: `HeaderNotices`, the failed repairs of the name and
  the start steps. `follow` reads a stream, `dismiss` hides a notice in
  this view, and `shown` gives the notices to draw.
- `HeaderNoticeBars.tsx`: the bars below the header, with Dismiss.
- `HeaderNotices.test.tsx`: mounts the screen in happy-dom over the fake
  API and its event stream, and checks the notices.
- `features.ts`: `WorkspaceFeatures`, the parts that plug in, and
  `WorkspaceContext`, what each part gets.
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
- [The Files screens](../../files/README.md) and
  [the browser fakes](../../test-support/README.md).
- [The web app in the architecture](../../../docs/architecture.md#web-app).
