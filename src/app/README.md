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

## Rules for this code

- A screen reads data only through a model and `useStore`. A model sends the
  request, parses the answer with the readers in `api/`, and keeps the
  result. An answer of an unknown shape is an `ApiError`, not a guess.
- A change to the list shows at once, and the list goes back when its write
  fails. Other writes show their answer.
- A secret goes out once, through `SecretForm`, and the field is empty after
  the save. No answer brings a stored secret back.
- The browser keeps only the panel widths (`panels.ts`). A browser that
  refuses its storage keeps them until the page closes.
- The open of a workspace, its read mark, the Archive check, and the poll
  of a build log count a generation. An answer that arrives after their
  screen closed or the user cancelled starts no stream, writes no older
  state, opens no question, and schedules no request.
- The shell reuses the design tokens, the pure parts, and the CSS modules of
  the [mockups](../../docs/mockups/README.md). It never imports a mockup
  screen, a fixture, `paths.ts`, `ScreenLink`, or Mokly.
- Components give refs and callbacks to their owners. Product code does
  not find an element that another component owns by a selector. The focus
  helpers of a menu, a sheet, and a dialog look only inside their own layer.

## Tests

Vitest runs in Node without a DOM. `test-kit.ts` gives services over the
fake API, requests that wait for the test, a manual timer, and a recording
event source. `../shell/test-render.tsx` draws a screen with every provider
through server rendering, after the test loads its data.

## Key code

- `api/client.ts`: the JSON client and `ApiError`. `api/read-*.ts`: the readers.
- `app-model.ts`: the session, the orgs, the models list, and Get started.
- `org-model.ts`: the sections, workspaces, repositories, builds, Boat key,
  and members of one org.
- `section-actions.ts` and `sections.ts`: sections, moves, and the Archived group.
- `workspace-model.ts` and `archive-model.ts`: an open workspace and Archive.
- `new-workspace-model.ts`: the first message that creates a workspace.
- `computer-model.ts`: the scripts, the env vars, the builds, and the log.
- `events.ts`: the ordered event stream and the event socket.
- `router.ts` and `navigation.ts`: the addresses of the screens.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
