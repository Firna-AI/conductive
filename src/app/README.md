# Web app: data and composition

The web app is the React app under `src/`. `src/app/` holds its data: the
typed API client, the models that screens read, the router, the event
stream, and the services that the app gets from outside. `src/shell/` holds
the screens of the app shell, which Milestone 6 built against the fake API.
The chat, the files, the tools, and the pull request bar plug into the shell
as features, as [Composition](#composition) says.

## Run it

- `npm run dev` serves the app at `http://127.0.0.1:5173` with the fake API
  of `src/test-support/`. Development only: `main.tsx` loads it behind
  `import.meta.env.DEV`, so the production build never bundles it.
- The local Worker serves the page, so the ignored `.dev.vars` needs
  `APP_ORIGIN="http://127.0.0.1:5173"`, as the
  [Get started steps](../../README.md#get-started) say.
- The dev wiring in `dev/` keeps an in-memory state, so that an edit in the
  browser shows on the next read. Query options choose a preview state, for
  example `?role=member`, `?workspace=starting`, `?firstRun=boat-key`,
  `?boatKey=none`, `?login=none`, or `?deleted=1`. `dev/options.ts` lists
  them.
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
Archive question, and the states of the sandbox. Each feature is a function
of `WorkspaceContext`, which gives the org, the workspace, the viewer, the
sandbox state, the layout, the address after the workspace, the ordered
event stream, and the Archive action. A missing feature leaves its place
empty.

| Feature       | Place                                         | Milestone |
| ------------- | --------------------------------------------- | --------- |
| `tabs`        | The session and file tabs of the centre       | 8         |
| `transcript`  | The chat history, before the start steps      | 8         |
| `composer`    | The composer while the sandbox runs or starts | 8         |
| `center`      | A file or diff tab in place of the chat       | 10        |
| `files`       | All files, Changes, and Checks                | 10 and 14 |
| `tools`       | Terminal, Preview, and Desktop                | 12        |
| `pullRequest` | The pull request bar, or the row on a phone   | 14        |
| `owner`       | The owner picker that reassigns a workspace   | 15c       |

The Members tab of the org settings is `MembersTab` in
`../shell/settings/`. It shows the members read-only, and Milestone 15c adds
the invite, the roles, and the removal there.

## Data lifecycle

- A screen asks for the org parts that it shows, as in
  `useEffect(() => org.watch('repositories', 'list'), [org])`. A part
  reads when its first screen mounts, each time that the user comes back
  to the page, and on a timer while a screen shows it. The last screen
  that leaves stops the timer. Screens that show a part share its reads.
- The timer is short while a row works, needs input, or starts, or while a
  build runs. Otherwise it is slow, so that changes from other tabs and
  other people show. Repositories, the Boat key, and the members read at
  entry and at focus only. The waits are choices of the app, not product
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
- A save whose answer holds the whole value, such as the Boat key, the
  repositories, or the computer settings, counts as an answer from the time
  that it arrives. A read that started before it changes nothing.
- The saves of one value go out one at a time. The next save starts after
  the answer of the one before, because an answer carries no order of its
  own. A failed save rejects only its own caller, and the next save goes.
  List writes do not wait for each other.
- The settings of the cloud computer are one value of the org in
  `OrgModel`. Every opening of the Cloud computer tab shares them, so a
  save from a closed tab shows in the reopened tab.
- The Cloud computer tab follows the builds while it shows. When the newest
  build ends, by any path, the tab reads the settings again, because the
  server changes them at a build, such as `needsBuild`.
- The read mark of an open workspace follows the applied state, the
  number of the newest event, and the visibility of the page, so their
  order does not count. A hidden page sends no read mark. When the page
  shows again, the mark goes through the newest event that arrived. A page
  without the focus still shows its output, so the focus does not count.

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
- The open of a workspace, its read mark, the Archive check, the poll of a
  build log, and the settings reads of the Cloud computer tab count a
  generation. An answer that arrives after their screen closed or the user
  cancelled starts no stream, writes no older state, opens no question,
  and schedules no request.
- Timers, the focus, and the visibility of the page come from
  `AppServices` (`delay`, `onFocus`, and `visible`), so that no unit test
  runs a real timer or needs a browser page.
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
focus and visibility, and a recording event source. `../shell/test-render.tsx` draws a screen with
every provider through server rendering, after the test loads its data.

## Key code

- `api/client.ts`: the JSON client and `ApiError`. `api/read-*.ts`: the readers.
- `app-model.ts`: the session, the orgs, the models list, and Get started.
- `org-model.ts`: the sections, workspaces, repositories, builds, Boat key,
  members, and computer settings of one org, with `watch` and the wait of
  each part.
- `resource.ts`: `Resource`, a server value with its confirmed changes and
  its waiting writes. `refresh.ts`: `Refresher`, the shared reads of a part
  while screens show it.
- `section-actions.ts`, `list-changes.ts`, and `sections.ts`: the list
  writes, their changes, moves, and the Archived group.
- `workspace-model.ts` and `archive-model.ts`: an open workspace and Archive.
- `new-workspace-model.ts`: the first message that creates a workspace.
- `computer-model.ts`: the scripts, the env vars, the builds, and the log.
- `events.ts`: the ordered event stream and the event socket.
- `router.ts` and `navigation.ts`: the addresses of the screens.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
