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
  section, the waitlist, the routines, and the workspace numbers.
- The workspace screen shows the real chat over the dev fake. The fake
  sends no chat event, so a sent message stays pending, and a new session
  adds no tab. It answers each chat write with a recorded reply and
  changes no state, except a send of uploaded files. That reply gives the
  message its own text and files. In a workspace that runs, the sent chips
  of those files open copies of their bytes in the file tab, as
  [The development fake](dev-fake.md) says.
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
  the page, its event socket, and an `XMLHttpRequest` for each raw file
  upload, which measures the bytes that the browser sent.

## Composition

`App` in `src/App.tsx` takes three props:

| Prop         | What it gives                                                                  |
| ------------ | ------------------------------------------------------------------------------ |
| `services`   | `AppServices` from `services.ts`: the API, the events, the clock, the storage  |
| `navigation` | The address bar: `browserNavigation(window)`, or `memoryNavigation` in tests   |
| `features`   | `WorkspaceFeatures` from `../shell/workspace/features.ts`: the workspace parts |

`App` also mounts `useFileDropGuard` of `file-drags.ts`, so a drop of files
outside each message box does nothing, as
[Drops](../../docs/protocol/message-attachments.md#drops) says. The guard
hears each drag last, on the window. It leaves each drag that a part took,
such as a message box or the Feedback dialog, and it never stops an event.
A drag of text or of a link keeps the action of the browser.

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
page of a deleted org, and the read-only Repositories and Cloud computer
tabs of a member. The Cloud computer tab of a member gets the live builds,
log, and settings of `ComputerModel`. The Repositories tab of a member gets
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

## Screens

[Screens](screens.md) gives the rules of the screens of the app shell:
the account and Get started, sign-in, invitations, orgs, panels and
layers, the focus, saved drafts, New workspace as a page or a dialog,
with its attached files and the send key that every composer shares, and
the waitlist.
[Command palette and keys](palette-and-keys.md) gives the rules of the
command palette and of the keyboard shortcuts.
[Feedback](palette-screens.md) gives the rules of the Feedback dialog that
the Help row of the palette opens.

## Rules for this code

- A screen reads data only through a model and `useStore`. A model sends the
  request, parses the answer with the readers in `api/`, and keeps the
  result. An answer of an unknown shape is an `ApiError`, not a guess.
  One field is the exception. A missing or unknown `github` summary of a
  workspace reads as null, so an older reply still reads. The
  [shared contracts](../shared/README.md) give that reader.
- A screen never sets a value of an org. The stores of `OrgModel` are
  read-only for screens, and writes go through the actions and models.
- A secret goes out once, through `SecretForm`, and the field is empty after
  the save. No answer brings a stored secret back.
- The browser keeps only the panel sizes (`panels.ts` and
  `column-split.ts`): the widths of the sidebar and the right column, and
  the split of the right column. A browser that refuses its storage keeps
  them until the page closes.
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
- A read mark counts no generation, because one request serves every
  visit of its kept model. An answer after a close still sets the
  confirmed number, which a later open uses. While the model stays closed,
  that answer changes no detail and schedules no request. After a new
  open, it can schedule the next mark of the new visit.
- One follower owns the requests and the timer of a build log. After it
  stops, an answer changes nothing and schedules nothing.
- One ChatGPT sign-in of Codex owns its request for a code, its polls, and
  its timer. Cancel, the other kind in the switch, and the end of its form
  stop it. After that, an answer changes nothing and schedules nothing.
  A connected answer applies the current login status that the Worker returns.
- One rule, `loginUsable` in `api/read-core.ts`, says whether turns can
  run on a login. A connected login with an `unusableCause` cannot. The
  composers and Get started count such a login as missing.
- Each open of the agent list, on the account and in Get started, reads
  the logins again through `AccountModel.refreshLogins`. So a login that
  the Worker stopped after the app opened shows Signed out. The Worker
  gives the logins only in `GET /api/account`, and the read takes only
  the logins of that answer.
  `AgentLogins` in `agent-logins.ts` counts each local change of a login:
  a save, a remove, a connected sign-in, and a share change, at its start
  and when its reply shows. A read shows the login of an agent only while
  that login had no change during the read. An open shares a read that
  runs already, and a failed read keeps what shows.
- `AccountLoginReads` in `account-login-reads.ts` shares those reads with
  each return to the visible page. While the account has an own endpoint
  login, it also reads once a minute while the page shows. Each read merges
  only the logins, with the same guards against local changes. A read across
  a new app start or a sign-out changes nothing. Polling stops without an
  own endpoint login or while the app is not ready. A hidden page cancels
  its timer. When the page shows again, the reader reads once and resumes
  polling.
  The same reader owns the reads after an endpoint save or Refresh.
  Those reads use the caller's mark to preserve later login changes.
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
  for its own event. `windowKeys` shares this state per window and resets
  it on key-up or blur. `windowLayoutModifiers(window)` reads the same
  snapshot for callers with a window.
- `AppServices.appVersion` is the version of the build: the version of the
  root `package.json` and the short commit, as `<version> (<commit>)`.
  `build-version.ts` at the repository root makes it for the web and Mac
  app builds. `version.ts` gives it as `APP_VERSION`, or `development`
  outside Vite. A host without `appVersion` uses `APP_VERSION`. Each
  feedback message carries it.
- An address that people share, such as the invite link, starts with
  `AppServices.appOrigin`: the origin of the page in a browser. The Mac
  app loads the page from its own origin, so it names the app host of the
  brand.
- The shell reuses the design tokens, the pure parts, and the CSS modules of
  the [mockups](../../docs/mockups/README.md). It never imports a mockup
  screen, a fixture, `paths.ts`, `ScreenLink`, or Mokly.
- Components give refs and callbacks to their owners. Product code does
  not find an element that another component owns by a selector. The focus
  helpers of a menu, a sheet, and a dialog look only inside their own layer.

## Tests

The account routes of the development backend keep device sign-ins in a
private route closure. Start returns a fixed display code and a new handle.
The first poll waits. The next poll connects Codex with the normal share
default. Later polls read the current login without saving it again, until the sign-in expires after 15 minutes.
The fake uses the shared device response types. It sends no request to OpenAI.

Vitest runs in Node without a DOM. `test-kit.ts` gives services over the
fake API, with raw file uploads through its fetch, requests or answers that
wait for the test (also two at one path), a manual timer with the wait of
each pending timer, which can run only the timers of one wait, a manual page
focus, visibility, input, and keys, and a recording event source.
`../shell/test-render.tsx` draws a screen with every provider through
server rendering, after the test loads its data. A test that needs focus
and keys opts into happy-dom with `// @vitest-environment happy-dom`, and
mounts the screen with `../shell/test-mount.tsx`, which also presses keys,
clicks, types, and lets the answers of the fake API settle.
`../shell/new-workspace/dialog-test-kit.tsx` mounts the whole app in a tab
for the tests of New workspace as a page or a dialog, and of its send key.
Its `markOf` gives the mark of a file of the draft by the name of the file.

`../shell/new-workspace/NewWorkspaceDrops.test.tsx` drops files on the
page and on the dialog card. A drop on the text of the page puts the files
at the point. While a create runs, the box shows no drop state or drop
caret, also for files that hovered as it began, and takes no drop. Files
over the card show its drop state, and a dropped folder gets its notice in
the dialog. `../App.dom.test.tsx` mounts `App` and checks the guard
outside each box, the browser's own drag of text and links, and the copy
offer of a box. It also checks that the Feedback dialog still takes a
dropped screenshot.

Run `npm run test -- src/app/dev/attachment-files.test.ts src/chat/dev/dev-attachment-files.test.ts`
for the API tests of the uploaded bytes and their copies in both
development fakes. `dev/attachment-test-kit.ts` gives them a stub
`window`, fake timers, a sample image, and a check of the exact bytes.

## Key code

[Key code](key-code.md) names the files, the types, and the functions to
open first. It covers the dev fake, the API client, the clipboard, the
models, the waitlist and its codes, the routines, and the workspace list.
It also covers the event streams, the drag, and the operator section.
[Key code: drafts and attached files](key-code-drafts.md) covers the draft
text, the attached files, and their uploads, which the chat and New
workspace share.
[Key code: the palette, the layers, and the dialogs](key-code-layers.md)
covers the command palette, the layers, the frames, New workspace as a
dialog, and feedback with its screenshots.

- `api/read-core.ts`: `readLogin` reads own endpoint metadata for both agents.
  It keeps the host, kind, share choice, update time, and optional `modelList`.
  The list has missing app model IDs and the last successful read time.
  `dev/agent-login-routes.ts` simulates save and Refresh as successful lists with no missing models.
  It changes neither another login nor the secret-save time.
  `dev/agent-login-routes.ts` uses the shared address rule and keeps no secret
  or full endpoint in development state. Its save uses the same public HTTPS
  address builder and agent-specific normalization as the Worker.
  The builder requires a public host name and refuses every IPv4 and IPv6 address.
  The builder reads the product domain from the shared brand source.
  The fake needs no preview domain configuration.
  `?login=endpoint` seeds shared
  own endpoint logins for both agents. `dev/endpoint-logins.ts` seeds them,
  with the model lists of `?modelList`.
- `endpoint-models.ts`: the one rule of the model lists of own endpoints.
  `unlistedModels` gives the app models that the last list of a login does
  not name, for the account page. `offeredModels` gives the models that a
  picker of the owner offers. Every picker of the owner calls it, as
  [Screens](screens.md) says.
