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
- The dev wiring in `dev/` keeps an in-memory state, so that an edit in the
  browser shows on the next read. Query options choose a preview state, for
  example `?role=member`, `?workspace=starting`, `?firstRun=org`,
  `?login=none`, `?deleted=1`, `?suspended=1`, `?operator=1`, or
  `?paths=masked`. `dev/options.ts` lists them. Create org of the dev fake
  requires at least one repository and starts a simulated build. Its
  repository catalogue keeps the saved choices, and its custom initials
  stay through rename, delete, and restore. Settings changes during the
  first good build start one added build. The fake compares settings
  revisions with builds as the Worker does.
- `?operator=1` makes the dev user an operator, so the rail and the org
  switcher show Operator. The [operator section](../shell/operator/README.md)
  then shows the sample orgs and users of the mockups, and Suspend and Lift
  change them. A suspension of Acme, Futex, or Firna also suspends that org
  in the state of the fake, so the fake refuses each write of that org with
  `org_suspended`. The open app does not read its orgs again, so its pages
  of that org show the suspension only after such a refusal. Without the
  option, each operator request gets `operator_required`, as the Worker
  does.
- The workspace screen shows the real chat over the dev fake. The fake
  answers each chat write with a recorded reply, changes no state, and
  sends no event. So a sent message stays pending, and a new session adds
  no tab.
- One counter numbers the events of all workspaces of the dev fake, and its
  event source ignores the workspace. So an event of another workspace
  leaves a gap in the event numbers of the chat. At the next event of the
  open workspace, the chat opens its stream again, and the history fills
  the gap. Each such event costs one more connection, and the chat still
  applies the later events. Use `npm run dev` for the chat load and the
  kept chat. The
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
sandbox state, whether the workspace is read-only, what a part shows while
the sandbox does not run, the layout, the address after the workspace, the
ordered event stream, the saved view of the kept chat, the events of the
tools, and the Archive action. The feature clients send through the
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
| `tools`       | Terminal, Preview, and Desktop. The shell gives its own |
| `pullRequest` | The pull request bar, or the row on a phone. The shell gives its own |
| `owner`       | The owner picker that reassigns a workspace. The shell gives its own |

The org settings mount the members UI of `../members/`: `MembersSettings`
for the Members tab, Delete org in the General tab of an admin, the restore
page of a deleted org, and the read-only Repositories and Cloud computer
tabs of a member. The Cloud computer tab of a member gets the live builds,
log, and settings of `ComputerModel`. `useMembersApi(orgId)` in
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
the workspace stores, and the raw event streams of feature stores.

## Screens

[Screens](screens.md) gives the rules of the screens of the app shell:
the account and Get started, sign-in, invitations, orgs, panels and
layers, the command palette, the focus, saved drafts, and New workspace as a page or a dialog,
with the send key that every composer shares.

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
- The open of a workspace, the Archive check, and the settings reads of
  the Cloud computer tab count a generation. An answer that arrives after
  their screen closed or the user cancelled starts no stream, writes no
  older state, opens no question, and schedules no request.
- A read mark counts no generation, because one request serves every
  visit of its kept model. An answer after a close still sets the
  confirmed number, which a later open uses. While the model stays closed,
  that answer changes no detail and schedules no request. After a new
  open, it can schedule the next mark of the new visit.
- One follower owns the requests and the timer of a build log. After it
  stops, an answer changes nothing and schedules nothing.
- Timers, the focus, the visibility, the input, and the keys of the page
  come from `AppServices` (`delay`, `onFocus`, `visible`, `onInput`, and
  `onKey`), so that no unit test runs a real timer or needs a browser
  page. The browser hears the input and the keys in the capture phase,
  before a field can stop them. An open workspace counts the input
  anywhere on the page as activity, at most once a minute. `onKey` is not
  passive, so the palette key stops the browser's own action.
  `AppServices.platform` says whether the keyboard is a Mac, which
  chooses the palette key and its hint.
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
focus, visibility, input, and keys, and a recording event source.
`../shell/test-render.tsx` draws a screen with every provider through
server rendering, after the test loads its data. A test that needs focus
and keys opts into happy-dom with `// @vitest-environment happy-dom`, and
mounts the screen with `../shell/test-mount.tsx`, which also presses keys,
clicks, types, and lets the answers of the fake API settle.
`../shell/new-workspace/dialog-test-kit.tsx` mounts the whole app in a tab
for the tests of New workspace as a page or a dialog, and of its send key.

## Key code

- `dev/org-routes.ts` creates orgs and starts their first simulated build.
  `dev/build-routes.ts` runs builds and the added build after the first image.
  `dev/settings-routes.ts` saves settings and repository choices.
- `api/client.ts`: the JSON client and `ApiError`. The client also gives
  its `fetch`, for a feature client that reads its own replies, so the web
  app and the Mac app keep their transport. `api/read-*.ts`: the readers.
- `replay-socket.ts`: `replaySubscribe`, the raw event stream of a feature
  store over the event source of the app, with the reconnect rules of
  [Data lifecycle](data-lifecycle.md).
- `app-model.ts`: the session, the orgs, the models list, Get started, and
  `putOrg`, which takes a confirmed org record.
- `invitations-model.ts`: `InvitationsModel`, the pending invitations,
  Continue to workspaces, and Accept invitation.
  `api/read-invitations.ts`: their readers.
- `get-started.ts`: the order and the states of the steps of Get started.
  `setup-steps.ts`: `setupSteps`, the steps that the screens show, and
  `setupOrg`, the org of Get started and of the address `/`.
- [getStartedCopy.ts](../../docs/mockups/src/screens/getStartedCopy.ts): the
  setup text that the app and mockups share.
- `org-model.ts`: the sections, workspaces, repositories, builds, members,
  and computer settings of one org, with `watch` and the wait of each part.
  `OrgModel.startBuild` sends Build computer and Try again for each screen
  that offers them.
- `first-build.ts`: `firstBuildOf` and `useFirstBuild`, the state of the
  first build of an org from its builds, which Get started and New
  workspace show until the org has a good image. `changedScriptNotice`
  gives the words of the notice of a changed install script, which the
  Cloud computer tab of an admin and of a member show.
- `account-model.ts`: the agent logins with their share setting, the
  default model, the New workspace view, the GitHub App installations,
  and the repositories that Create org offers.
- `panels.ts`: `PanelLayout`, the widths of the panels, whether the right
  column shows, and `next`, the one rule of their steps.
- `resource.ts`: `Resource`, a server value with its confirmed changes and
  its waiting writes. `refresh.ts`: `Refresher`, the shared reads of a part
  while screens show it.
- `section-actions.ts`, `list-changes.ts`, and `sections.ts`: the list
  writes, their changes, moves, and the Archived group.
- `workspace-model.ts` and `archive-model.ts`: an open workspace, its
  `startError` and `reassigned`, and Archive.
- `suspension.ts` and `permissions.ts`: the suspension of an org, the
  client that reports its refusals, also the replies of its fetch, and the
  rules of what a person may change.
- `workspace-read-marks.ts`: `WorkspaceReadMarks`, the read marks of one
  kept workspace model, with its shown and confirmed numbers.
- `new-workspace-model.ts`: the first message that creates a workspace.
  `creations.ts`: `Creations`, the life of the create requests of an org in
  this tab, which a sign-out ends. `first-start.ts`: `failedFirstStart`,
  which tells a failed first start, and `resumesAtOpen`.
- `computer-model.ts`: the scripts, the env vars with their Secret marks,
  the builds, and the log. `classifyEnvVar` changes only the mark of a
  variable, and sends no value. `replaceEnvVar` changes only the value,
  and sends no mark, so the Worker keeps the stored mark. `setEnvVar`
  sends a value and a mark, for Add variable.
- `../shell/settings/EnvVarsSection.tsx`, `EnvVarForms.tsx`, and
  `EnvVarMark.tsx`: the env var editor of an admin. The Secret switch of a
  row saves its mark at once, and Add variable starts secret. A new value
  sends no mark, so it keeps the stored mark, also a mark that a save of
  the switch changed after its form opened. The switch, Change, and Delete
  of a row wait while one of them saves.
- `build-log-follower.ts`: `BuildLogFollower`, the reads and the timer of
  the log of one build.
- `events.ts`: the ordered event stream, the event socket, and
  `openSocket`, the terminal socket on the same origin as the events.
- `workspace-store.ts`: `useWorkspaceStore`, which gives a connected view
  the store of its workspace, and the `create` and `connect` functions that
  the view supplies.
- `workspace-store.test.tsx`: mounts the real hook with logged test stores in
  happy-dom. It checks the connection after the render and the stop at
  unmount. It checks that a switch stops the old store before the new one
  connects, and shows only the new store. It also checks when the hook keeps
  a store, connects it again, or makes a new one.
- `operator-read.ts`, `operator-directory.ts`, and `operator-target.ts`:
  the Overview and the pages of the operator section, its searches, and
  Suspend and Lift. A refusal with `operator_required` marks the account
  as not an operator. `api/read-operator.ts` and
  `api/read-operator-pages.ts`: their readers. The
  [operator section](../shell/operator/README.md) gives the screens.
- `router.ts` and `navigation.ts`: the addresses of the screens.
- `kept-org.ts`: `keptOrg`, the org of a page without one: the org that
  the tab opened last, from `AppModel.lastOrg`, or else the first org that
  is not deleted.
- `palette/`: the command palette without React. `palette-results.ts`
  gives the groups and the empty state of each tab for a query, from
  `palette-groups.ts` and the rows of `palette-rows.ts`. `matcher.ts`
  ranks the matches. `commands.ts` holds the labels and the search words.
  `page-actions.ts` gives the offers of the parts of the page and
  `workspaceActionIds`. `palette-org.ts` chooses the org of the palette,
  `palette-keys.ts` the palette key and what it does, and `controller.ts`
  the open state and the offers of one tab, with `show`, the one way to
  open the palette.
- `../shell/palette/`: the layer of the palette. `PaletteProvider.tsx`
  hears the key and closes the palette, `PaletteLayer.tsx` draws it in a
  frame, `palette-context.ts` gives `usePaletteOffer` and
  `usePaletteTerminal`, and `SearchRow.tsx` is the Search row of the list.
- `../shell/ui/layers.ts`: `OpenLayers`, the open menus of every UI kit,
  which say whether they closed, and the modal layers with their owners.
  The palette reads them before it opens.
- `../shell/Shell.tsx` and `../shell/OrgRoutes.tsx`: the screen of each address.
- `../shell/layout/frames.tsx`: the frames: the desktop frame with the
  rail, a desktop page alone, such as Create org, and the phone frame.
  `../shell/layout/DesktopLayers.tsx`: `DesktopLayers`, the layers and the
  main area that every desktop frame shares: sheets and dialogs, the New
  workspace dialog, and the command palette.
- `../shell/ui/Overlay.tsx`: `OverlayHost`, `useLayerFocus`, and
  `useDismiss`, the layer of sheets and dialogs, and `useModalLayer`, which
  every sheet and dialog uses. Escape closes only the newest layer.
  `../shell/ui/screen-focus.ts`: `requestScreenFocus`, the focus of a new
  screen after a layer closes with a move, which the main area of a
  desktop frame takes through `useScreenFocus`.
- `../shell/new-workspace/NewWorkspaceHost.tsx`: `NewWorkspaceHost`, the
  New workspace dialog of a desktop frame, and `useNewWorkspace`, the one
  way that each place opens New workspace as the dialog or the page.
  `NewWorkspaceDialog.tsx`: the dialog.
- `../shell/new-workspace/useNewWorkspaceForm.ts`: the form that the page
  and the dialog share: the repository, the notices, the readiness, and
  the send. `parts.tsx`: their repository menu and files.
- `../chat/components/send-key.ts`: `useSendKey`, the send key of every
  composer.
- `../shell/ui/useSavedDraft.ts`: the draft of an editor of a saved value.
  `../shell/list/useRowFocus.ts`: the focus of a row after a move by keys.
- `../shell/orgs/`: Create org and the name and initials fields.
  `../shell/settings/RepositorySearch.tsx`: the searchable repository list.
