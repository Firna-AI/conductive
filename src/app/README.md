# Web app: data and composition

The web app is the React app under `src/`. `src/app/` holds its data: the
typed API client, the models that screens read, the router, the event
stream, and the services that the app gets from outside. `src/shell/` holds
the screens of the app shell.
The workspace screen mounts the chat, the Files screens, the tools, the
pull request bar, and the owner picker. A host can give its own parts, as
[Composition](#composition) says.

## Run it

- `npm run dev` serves the app at `http://127.0.0.1:5173` with the fake API
  of `src/test-support/`. Development only: `main.tsx` loads it behind
  `import.meta.env.DEV`, so the production build never bundles it.
- The local Worker serves the page. The
  [Get started steps](../../README.md#get-started) give its local setup.
- [The development fake](dev-fake.md) gives the query options of the dev
  wiring in `dev/`, such as `?operator=1`. It also covers its fake routes:
  the uploads and their copies, Create org, feedback, the operator
  section, the waitlist, the automations, the skill reads, and the
  workspace numbers.
- The workspace screen shows the real chat over the dev fake. The fake
  sends no chat event, so a sent message stays pending, and a new session
  adds no tab. It answers each chat write with a recorded reply and
  changes no state, except a send of uploaded files. That reply gives the
  message its own text and files. In a workspace that runs, the sent chips
  of those files open copies of their bytes in the file tab, as
  [The development fake](dev-fake.md) says.
- The dev fake numbers the events of each workspace separately. The
  workspace read gives the seed and cutoff for that workspace. Each socket
  takes its history from the same log and starts after the caller's cursor.
  Use `npm run dev` for the chat load and the kept chat. The
  [chat development page](../chat/dev/README.md) has a fake with state for
  live events and writes.
- The production build uses `createLiveServices` of `live-services.ts`.
  It requires an app origin and a credential mode. A browser gives
  the origin of its page and `same-origin`, the default credential mode of
  `fetch`. The Mac app gives its configured Worker origin and `include`,
  as the [Mac app README](../../desktop/README.md) says. The API requests,
  the event and terminal sockets, the paths that `leave` opens, and
  `AppServices.appOrigin` use that origin. Each raw part of an upload is
  an `XMLHttpRequest` to the same origin, which measures the bytes that
  the browser sent.

## Composition

`App` in `src/App.tsx` takes three props:

| Prop         | What it gives                                                                  |
| ------------ | ------------------------------------------------------------------------------ |
| `services`   | `AppServices` from `services.ts`: the API, the events, the clock, the storage  |
| `navigation` | The address bar: `browserNavigation(window)`, or `memoryNavigation` in tests   |
| `features`   | `WorkspaceFeatures` from `../shell/workspace/features.ts`: the workspace parts |

`App` also mounts `useFileDropGuard` of `file-drags.ts`, so a drop of files
outside each message box and the chat around it does nothing, as
[Drops](../../docs/protocol/message-attachments.md#drops) says. The guard
hears each drag last, on the window. It leaves each drag that a part took,
such as a message box or the Feedback dialog, and it never stops an event.
A drag of text or of a link keeps the action of the browser.

`App` also mounts `useKeyboardViewport` of `keyboard-viewport.ts`. Safari
on iOS keeps the page at its full height under an on-screen keyboard, and
scrolls the page up to show the focused field. While the keyboard shows,
the hook sets `--ui-screen-height` to the height of the visible part and
keeps the page at its top. So the header stays in view, and the app ends
at the keyboard. While the page is zoomed, the hook changes nothing, so a
pinch zoom keeps the behaviour of the browser. On
Android, the viewport tag of `index.html` asks Chrome to resize the page
for the keyboard, with `interactive-widget=resizes-content`.

On iOS 26 and later, a Home Screen web app gets a blur over the top edge
of the page, and the blur reaches the header. WebKit skips the blur when
a fixed box with a solid background covers the top edge. So `index.html`
holds the band `.top-edge`, only in a Home Screen app on iOS. The band is
12px tall, full width, and in the colour of `--ui-bar`. It paints nothing,
because `background-clip: text` clips its background to its text, and it
has no text. It takes no taps.

The workspace screen draws the frame, the header, the start steps, and the
states of the sandbox, with Restore on the bar of an archived workspace
until its last day. The real chat fills the
centre by default. The `tabs`, `transcript`, and `composer` slots replace it
with the shell's own chat column, as
[The chat of the workspace](../shell/workspace/README.md#the-chat-of-the-workspace)
says. Each feature is a function
of `WorkspaceContext`, which gives the org, the workspace, the viewer, the
sandbox state, whether the workspace is read-only, what a part shows while
the sandbox does not run, the layout, the address after the workspace, the
ordered event stream, the saved view of the kept chat, the events of the
tools, the Archive and Restore actions, and the one of them that runs. The
feature clients send through the
services of the org, from `useOrgServices`, whose client and fetch mark the
org on `org_suspended`. The shell gives
its own `files`, `tools`, `pullRequest`, and `owner` parts, as
[the workspace screen](../shell/workspace/README.md#the-files-part) says. A
part of the host takes the place of the shell's own part. A missing
feature leaves its place empty.

| Feature       | Place |
| ------------- | ----- |
| `tabs`        | The tabs of the shell's own chat column, in place of the chat |
| `transcript`  | The history of that column, before the start steps |
| `composer`    | The composer of that column while the sandbox runs or starts |
| `center`      | A part in place of the whole chat. Without it, the chat shows the file or diff tab of the address |
| `files`       | All files, Changes, and Checks. The shell gives its own |
| `tools`       | Terminal and Preview. The shell gives its own |
| `pullRequest` | The pull request bar, or the row on a phone. The shell gives its own |
| `owner`       | The owner picker that reassigns a workspace. The shell gives its own |

The org settings mount the members UI of `../members/`: `MembersSettings`
for the Members tab, Delete org in the General tab of an admin, the restore
page at the address of a deleted org, and the read-only Repositories and Cloud computer
tabs of a member. The Cloud computer tab of a member gets the live builds,
log, settings, and skills lookup of `ComputerModel`. The Repositories tab of a member gets
the live builds of `OrgModel`, for its repository notice.
`useMembersApi(orgId)` in
`../shell/settings/members-api.ts` gives one members client for each org,
over the fetch of the org's client, so a refusal of a suspended org marks
the org. In a suspended org every person gets the read-only tabs, and the
restore page offers no Restore. A removal reads the list and the members
of the org again. Delete org and Restore give their answers to
`AppModel.putOrg`.

## Data lifecycle

[Data lifecycle](data-lifecycle.md) gives the rules of the data that the
screens read and write. It covers the org parts, the saves, the creates,
the invitations, the kept workspace models, the build log, the read marks,
the workspace stores, the raw event streams of feature stores, and the
feedback draft.

For an existing workspace, `OrgModel.putWorkspace` keeps the listed parent,
section, and order together. A record with a different parent requests a
fresh list read through `Refresher.reread`, after any current read finishes.

## Screens

[Screens](screens.md) gives the rules of the screens of the app shell: the
account and Get started, sign-in, invitations, orgs, panels and layers, the
trees of the workspace list, the focus, saved drafts, New workspace as a
page or a dialog, with its attached files and the send key that every
composer shares, and the waitlist.
[Start from a branch](start-branch.md) covers the branch of New workspace.
[Command palette and keys](palette-and-keys.md) gives the rules of the
command palette and of the keyboard shortcuts.
[Feedback](palette-screens.md) gives the rules of the Feedback dialog that
the Help row of the palette opens.

## Rules for this code

- A screen reads data only through a model and `useStore`. A model sends the
  request, parses the answer with the readers in `api/`, and keeps the
  result. An answer of an unknown shape is an `ApiError`. A missing or
  unknown `github` summary reads as null, as the
  [shared contracts](../shared/README.md) say. An absent or unreadable seed
  keeps the workspace detail and uses the stream's replay.
- A screen never sets a value of an org. The stores of `OrgModel` are
  read-only for screens, and writes go through the actions and models.
- A secret goes out once, through `SecretForm`, and the field is empty after
  the save. No answer brings a stored secret back, except Reveal on the
  Secrets tab: an admin gets the value of one secret of the org, which the
  Worker records. Only the row of that secret shows it, until Hide, another
  reveal, a Replace of its value, or its Delete.
- The browser keeps only the panel sizes (`panels.ts` and
  `column-split.ts`) and the last workspaces (`last-workspaces.ts`). The
  panel sizes are the widths of the sidebar and the right column, and the
  split of the right column. The last workspaces hold the address of the
  last workspace page that the person opened in each org, under a key of
  the person. A browser that refuses its storage keeps them until the page
  closes.
- The open of a workspace and the settings reads of the Cloud computer
  tab count a generation. An answer that arrives after their screen
  closed or the user cancelled starts no stream, writes no older state,
  and schedules no request. `WorkspaceModel.opened` says when the open
  of the current visit ended, with the Resume that it sent. It is false
  before the first open, during each open, and after a close.
- Archive and Restore raise `updatedAt` of the workspace, also at the same
  clock. So a record from the other side of an Archive or a Restore shows
  only when its `updatedAt` is newer, whatever its source: a read, a
  Resume reply, an event, a reply of Archive or Restore, or the list. A
  record below the `updatedAt` of the newest Archive or Restore that shows
  changes nothing, also on the same side. A reply of Archive or Restore
  changes only its own fields. An Archive or a Restore while the first
  read of an open waits makes that open resume nothing, because Restore
  starts nothing.
- A control that ends at a time, such as Restore until its last day, ends
  at that time through `usePassedDeadlines` in `deadlines.ts`, with the
  clock and the timers of `AppServices`, and with no other event.
- An archived workspace leaves the list at the end of its Restore, 14 days
  after its Archive, as
  [Removed workspaces](../../docs/protocol/workspace-life.md#removed-workspaces)
  says. The list of the org keeps it, so its links still resolve.
  `groupWorkspaces` in `sections.ts` leaves it out of the sections, the
  Archived group, the keys, and the groups of the palette, through
  `isListed` in `workspace-removal.ts`. The counts of the org page, of
  Leave org, and of the Members tab leave it out too. `useListTime` in
  `deadlines.ts` renders each such screen again at that time, also without
  a kept cloud computer. No code reads `restoreUntil` to find the removal,
  because that value is null whenever no cloud computer is kept.
- A read mark counts no generation, because one request serves every
  visit of its kept model. An answer after a close still sets the
  confirmed number, which a later open uses. While the model stays closed,
  that answer changes no detail and schedules no request. After a new
  open, it can schedule the next mark of the new visit.
- One follower owns the requests and the timer of a build log. After it
  stops, an answer changes nothing and schedules nothing.
- [Login data](login-data.md) gives the rules of the agent logins of the
  account: the ChatGPT sign-in, the logins that can run turns, the default
  logins that the server names, and the reads after each change.
- Timers, the focus, the visibility, the input, and the keys of the page
  come from `AppServices` (`delay`, `onFocus`, `visible`, `onInput`, and
  `onKey`), so that no unit test runs a real timer or needs a browser
  page. The browser hears the input and the keys in the capture phase,
  before a field can stop them. An open workspace counts the input
  anywhere on the page as activity, at most once a minute. `onKey` is not
  passive, so the shortcut listener stops the browser's own action of a
  key that runs a command.
  `AppServices.platform` chooses the shortcut defaults and their key text.
  It never says whether the page runs in the Mac app: the caller of
  `FeedbackModel.open` gives that `desktop` flag.
  `AppServices.host` identifies the Mac app, an installed Chromium app,
  or a browser tab with its browser and system. `KeyPress.code` identifies
  the physical key. `KeyPress.stopPropagation` can stop delivery to a
  field or terminal after a shortcut consumes the press.
  `KeyPress.layoutModifiers` carries the modifiers taken by held layout
  switch keys. `onKey.layoutModifiers()` gives a recorder the same state
  for its own event. `KeyPress.firstPressConsumed` is true on a repeat
  when a listener called `preventDefault` on the first press of the same
  physical key. A first press always has false. The
  [shortcut model](shortcuts/README.md) stops each repeat of such a key.
  `windowKeys` shares both states per window and keeps them between
  listener subscriptions. It resets a key on its key-up, and every key on
  blur. `windowLayoutModifiers(window)` reads the same layout modifiers
  for callers with a window.
- `AppServices.appVersion` is the version of the build: the version of the
  root `package.json` and the short commit, as `<version> (<commit>)`.
  `build-version.ts` at the repository root makes it for the web and Mac
  app builds. `version.ts` gives it as `APP_VERSION`, or `development`
  outside Vite. A host without `appVersion` uses `APP_VERSION`. Each
  feedback message carries it.
- An address that people share, such as the invite link, starts with
  `AppServices.appOrigin`: the origin of the page in a browser. The Mac
  app loads the page from its own origin, so it gives the Worker origin of
  its build. `CONDUCTIVE_APP_ORIGIN` selects that origin, as
  [Development](../../desktop/README.md#development) in the Mac app README
  says. So a join link names the deployment that owns its code. Links in
  chat text and the file preview to a page of the app at this origin are
  [links of the app](../../docs/protocol/chat-links.md#links).
  Each opens its page in the same window.
- The shell reuses the design tokens, the parts, and the CSS Modules of
  the [shared UI](../ui/README.md) in `src/ui/`. The
  [mockups](../../docs/mockups/README.md) draw the same parts. The shell
  imports nothing from `docs/mockups/`: no mockup screen, no fixture, no
  `paths.ts`, and no `ScreenLink`. A lint rule rejects such an import
  outside development code and tests. The shell never imports Mokly.
- Components give refs and callbacks to their owners. Product code does
  not find an element that another component owns by a selector. The focus
  helpers of a menu, a sheet, and a dialog look only inside their own layer.

## Tests

[Web app tests](tests.md) gives the test environment of Vitest, the shared
test helpers, and what the tests of the device sign-in, the drops, the
uploads, and the secret requests check.

## Key code

[Key code](key-code.md) names the files, the types, and the functions to
open first. It covers the dev fake, the API client, the clipboard, the
models, and the waitlist and its codes. It also covers the event streams,
the drag, and the operator section.
[Key code: the workspace list and the workspace models](key-code-workspaces.md)
covers the workspace list with its menus, Archive and Restore, and the
models of an open workspace and of New workspace.
The list's merge queue controls use the saved GitHub facts and filtered
branch labels from the workspace list response.
[Key code: drafts and attached files](key-code-drafts.md) covers the draft
text, the attached files, and their uploads, which the chat and New
workspace share.
[Key code: automations](key-code-automations.md) covers the readers, the
models, the drafts, and the pages of the automations.
[Key code: the palette, the layers, and the dialogs](key-code-layers.md)
covers the command palette, the layers, the frames, New workspace as a
dialog, and feedback with its screenshots.

- `tab-places.ts`: `TabPlaces`, the places of the tabs of one workspace in
  memory, by tab and view, such as the reader's place in a session tab and
  the scroll offset of a file tab. `useFollowTabs` gives it each known list
  of the open tabs, and a tab that leaves the list forgets its places. The
  [tab row](../chat/tab-row.md) and the
  [Files README](../files/README.md#kept-scroll-offsets) say how the chat
  and the files use it.
- [Login data](login-data.md#key-code) names the files of the agent
  logins, the default logins, and the model lists.
