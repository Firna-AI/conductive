# Web app: data and composition

The web app is the React app under `src/`. `src/app/` holds its data: the
typed API client, the models that screens read, the router, the event
stream, and the services that the app gets from outside. `src/shell/` holds
the screens of the app shell.
The workspace screen mounts the chat. The files, the tools, and the pull
request bar plug into the shell as features, as [Composition](#composition)
says.

## Run it

- `npm run dev` serves the app at `http://127.0.0.1:5173` with the fake API
  of `src/test-support/`. Development only: `main.tsx` loads it behind
  `import.meta.env.DEV`, so the production build never bundles it.
- The local Worker serves the page. The
  [Get started steps](../../README.md#get-started) give its local setup.
- The dev wiring in `dev/` keeps an in-memory state, so that an edit in the
  browser shows on the next read. Query options choose a preview state, for
  example `?role=member`, `?workspace=starting`, `?firstRun=org`,
  `?login=none`, `?deleted=1`, or `?suspended=1`. `dev/options.ts` lists
  them. A new org
  of the dev fake gets every repository of the account's list, and keeps
  its custom initials through rename, delete, and restore.
- The workspace screen shows the real chat over the dev fake. The fake
  answers each chat write with a recorded reply, changes no state, and
  sends no event. So a sent message stays pending, and a new session adds
  no tab.
- One counter numbers the events of all workspaces of the dev fake, and its
  event source ignores the workspace. So after the first event of another
  workspace, the chat applies no more live events. Use `npm run dev` for
  the chat load and the kept chat. The
  [chat development page](../chat/dev/README.md) has a fake with state for
  live events and writes.
- The production build uses `live-services.ts`: the Worker on the origin of
  the page, and its event socket.

## Composition

`App` in `src/App.tsx` takes three props:

| Prop         | What it gives                                                                  |
| ------------ | ------------------------------------------------------------------------------ |
| `services`   | `AppServices` from `services.ts`: the API, the events, the clock, the storage  |
| `navigation` | The address bar: `browserNavigation(window)`, or `memoryNavigation` in tests   |
| `features`   | `WorkspaceFeatures` from `../shell/workspace/features.ts`: the workspace parts |

The workspace screen draws the frame, the header, the start steps, the
Archive question, and the states of the sandbox. The real chat fills the
centre by default. The `tabs`, `transcript`, and `composer` slots replace it
with the shell's own chat column, as
[The chat of the workspace](../shell/workspace/README.md#the-chat-of-the-workspace)
says. Each feature is a function
of `WorkspaceContext`, which gives the org, the workspace, the viewer, the
sandbox state, the layout, the address after the workspace, the ordered
event stream, and the Archive action. A missing feature leaves its place
empty.

| Feature       | Place |
| ------------- | ----- |
| `tabs`        | The tabs of the shell's own chat column, in place of the chat |
| `transcript`  | The history of that column, before the start steps |
| `composer`    | The composer of that column while the sandbox runs or starts |
| `center`      | A file or diff tab in place of the chat |
| `files`       | All files, Changes, and Checks |
| `tools`       | Terminal, Preview, and Desktop |
| `pullRequest` | The pull request bar, or the row on a phone |
| `owner`       | The owner picker that reassigns a workspace |

The Members tab of the org settings is `MembersTab` in
`../shell/settings/`. It shows the members read-only. Invite, role changes,
and removal are not wired into this tab yet.

## Data lifecycle

- A screen asks for the org parts that it shows, as in
  `useEffect(() => org.watch('repositories', 'list'), [org])`. A part
  reads when its first screen mounts, each time that the user comes back
  to the page, and on a timer while a screen shows it. The last screen
  that leaves stops the timer. Screens that show a part share its reads.
- The timer is short while a row works, needs input, or starts, or while a
  build runs. Otherwise it is slow, so that changes from other tabs and
  other people show. Repositories and the members read at entry and at
  focus only. The waits are choices of the app, not product
  limits.
- Each part is a `Resource`. A screen sees the answer of the newest read,
  then the changes that the server confirmed after that read started, such
  as events, then the waiting writes in the order that they went out. A
  read that started before a change keeps the change. A failed read keeps
  the value that shows.
- A list write shows its change at once, and a failure takes back that
  change only. An answer confirms only the fields of its write: a move
  answer sets the section of the workspace, not its state. A workspace
  record from an event, an open, or Archive keeps the place of its row,
  because only a read of the list and a move change the place.
- A save can answer with the whole value, such as the repositories or
  computer settings. Its answer counts from its arrival. A read that
  started before it changes nothing.
- The saves of one value go out one at a time. The next save starts after
  the answer of the one before, because an answer carries no order of its
  own. A failed save rejects only its own caller, and the next save goes.
  List writes do not wait for each other.
- A repository save adds or removes that repository only. It keeps the
  choices from other saves and other clients. The save queue keeps an add
  before a later remove of the same repository.
- A Resume reply keeps each newer field change that arrived while its
  request ran. A reply after close changes no workspace state.
- An admitted create stays in `OrgModel.creations` until its start ends.
  A failed start takes the workspace out of the list, and gives the first
  message back in a form of its own. A sign-out, or a sign-in of another
  person, forgets every create.
  [Creation recovery](creation-recovery.md) gives the rules.
- The tab keeps the `WorkspaceModel` of each workspace that it showed, for
  the signed-in user, as
  [The kept workspace](../shell/workspace/README.md#the-kept-workspace)
  says. A return opens the model again, and its stream starts after its
  last event number. A sign-out, or a sign-in of another user, closes and
  forgets every kept model.
- An open reads the workspace detail, shows it, and starts the event
  stream. Only then does a stopped or failed workspace get its Resume. So
  a refused or failed start keeps the detail and the stream, and
  `startError` of `WorkspaceModel` holds the error. A manual Resume still
  rejects for its caller.
- A `user_suspended` refusal holds only while the owner stays the same. A
  new owner in the detail, or from `reassigned(workspace)`, clears it. A
  late refusal for a former owner sets nothing.
- A suspended org takes no write except a leave. [A suspended
  org](suspended-org.md) gives how the app learns of it, from the org list
  or from an `org_suspended` refusal, and what its screens show.
- The settings of the cloud computer are one value of the org in
  `OrgModel`. Every opening of the Cloud computer tab shares them, so a
  save from a closed tab shows in the reopened tab.
- The Cloud computer tab follows the builds while it shows. When the newest
  build ends, by any path, the tab reads the settings again, because the
  server changes them at a build, such as `needsBuild`.
- While the tab shows, `ComputerModel` owns one `BuildLogFollower` for the
  log of the newest build that runs or failed. A newer build replaces the
  follower, so an answer for an older build changes neither the log nor
  the timer. When the builds show the end of the build before the log
  does, the follower reads the final log. When this update arrives during
  an active read, the follower keeps it. After that read, the follower
  reads again, unless that answer already shows the new state.
- Each read of the follower gets the build details at `buildPath`: the
  build with its full log, in one answer. The follower takes the state and
  the lines from the same answer, never from two reads. The follower sends
  this read at the start, on its timer, for Try again, and when the builds
  show a new state. While a read runs, a new read waits for its answer and
  sends nothing. The Worker also serves an event stream of each build, as
  the [lifecycle routes](../../worker/lifecycle/README.md#browser-routes)
  say. The app does not read it.
- The read mark of an open workspace follows the applied state, the
  number of the newest event, and the visibility of the page, so their
  order does not count. A hidden page sends no read mark. When the page
  shows again, the mark goes through the newest event that arrived. A page
  without the focus still shows its output, so the focus does not count.
- The chat, the GitHub views, the terminal tool, the preview tool, and the
  workspace screen keep one store for each workspace through
  `useWorkspaceStore`. The hook makes the store, connects it after the
  render, and follows its snapshot. It stops the store at unmount. A switch
  of workspace stops the old store and makes a new one. The
  [tool README](../terminal/README.md#workspace-events) gives the rules of
  the tool store. The store of `WorkspaceScreen` is a view of the kept
  workspace, so its stop keeps the parts, as the
  [workspace integration](../shell/workspace/README.md#integration) shows.
- The other workspace stores do not use the hook yet. The files
  development pages start and stop their `WorkspaceFiles` in their own
  effects. The [files integration](../files/README.md#integration) shows
  the hook for a new files owner.

## Screens

[Screens](screens.md) gives the rules of the screens of the app shell:
the account and Get started, sign-in, orgs, panels and layers, the
focus, saved drafts, and New workspace.

## Rules for this code

- A screen reads data only through a model and `useStore`. A model sends the
  request, parses the answer with the readers in `api/`, and keeps the
  result. An answer of an unknown shape is an `ApiError`, not a guess.
- A screen never sets a value of an org. The stores of `OrgModel` are
  read-only for screens, and writes go through the actions and models.
- A secret goes out once, through `SecretForm`, and the field is empty after
  the save. No answer brings a stored secret back.
- The browser keeps only the panel widths (`panels.ts`). A browser that
  refuses its storage keeps them until the page closes.
- The open of a workspace, its read mark, the Archive check, and the
  settings reads of the Cloud computer tab count a generation. An answer
  that arrives after their screen closed or the user cancelled starts no
  stream, writes no older state, opens no question, and schedules no
  request. One follower owns the requests and the timer of a build log.
  After it stops, an answer changes nothing and schedules nothing.
- Timers, the focus, the visibility, and the input of the page come from
  `AppServices` (`delay`, `onFocus`, `visible`, and `onInput`), so that no
  unit test runs a real timer or needs a browser page. The browser hears
  the input in the capture phase, before a field can stop it. An open
  workspace counts the input anywhere on the page as activity, at most
  once a minute.
- The shell reuses the design tokens, the pure parts, and the CSS modules of
  the [mockups](../../docs/mockups/README.md). It never imports a mockup
  screen, a fixture, `paths.ts`, `ScreenLink`, or Mokly.
- Components give refs and callbacks to their owners. Product code does
  not find an element that another component owns by a selector. The focus
  helpers of a menu, a sheet, and a dialog look only inside their own layer.

## Tests

Vitest runs in Node without a DOM. `test-kit.ts` gives services over the
fake API, requests or answers that wait for the test (also two at one
path), a manual timer with the wait of each pending timer, a manual page
focus, visibility, and input, and a recording event source.
`../shell/test-render.tsx` draws a screen with every provider through
server rendering, after the test loads its data. A test that needs focus
and keys opts into happy-dom with `// @vitest-environment happy-dom`, and
mounts the screen with `../shell/test-mount.tsx`, which also presses keys,
clicks, types, and lets the answers of the fake API settle.

## Key code

- `api/client.ts`: the JSON client and `ApiError`. `api/read-*.ts`: the readers.
- `app-model.ts`: the session, the orgs, the models list, and Get started.
- `org-model.ts`: the sections, workspaces, repositories, builds, members,
  and computer settings of one org, with `watch` and the wait of each part.
- `account-model.ts`: the agent logins, the default model, the GitHub App
  installations, and the repositories that Create org offers.
- `panels.ts`: `PanelWidths`, the widths of the panels, and `next`, the
  one rule of their steps.
- `resource.ts`: `Resource`, a server value with its confirmed changes and
  its waiting writes. `refresh.ts`: `Refresher`, the shared reads of a part
  while screens show it.
- `section-actions.ts`, `list-changes.ts`, and `sections.ts`: the list
  writes, their changes, moves, and the Archived group.
- `workspace-model.ts` and `archive-model.ts`: an open workspace, its
  `startError` and `reassigned`, and Archive.
- `suspension.ts` and `permissions.ts`: the suspension of an org, the
  client that reports its refusals, and the rules of what a person may
  change.
- `new-workspace-model.ts`: the first message that creates a workspace.
  `creations.ts`: `Creations`, the admitted creates of an org in this tab,
  and `failedCreate`, which tells a create whose start failed.
- `computer-model.ts`: the scripts, the env vars, the builds, and the log.
- `build-log-follower.ts`: `BuildLogFollower`, the reads and the timer of
  the log of one build.
- `events.ts`: the ordered event stream and the event socket.
- `workspace-store.ts`: `useWorkspaceStore`, which gives a connected view
  the store of its workspace, and the `create` and `connect` functions that
  the view supplies.
- `workspace-store.test.tsx`: mounts the real hook with logged test stores in
  happy-dom. It checks the connection after the render and the stop at
  unmount. It checks that a switch stops the old store before the new one
  connects, and shows only the new store. It also checks when the hook keeps
  a store, connects it again, or makes a new one.
- `router.ts` and `navigation.ts`: the addresses of the screens.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
- `../shell/ui/Overlay.tsx`: `OverlayHost`, `useLayerFocus`, and
  `useDismiss`, the layer of sheets and dialogs.
- `../shell/ui/useSavedDraft.ts`: the draft of an editor of a saved value.
  `../shell/list/useRowFocus.ts`: the focus of a row after a move by keys.
- `../shell/orgs/`: Create org and the name and initials fields.
  `../shell/settings/RepositorySearch.tsx`: the searchable repository list.
