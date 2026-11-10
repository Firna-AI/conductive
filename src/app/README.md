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
  `?login=none`, `?deleted=1`, `?suspended=1`, `?operator=1`,
  `?waiting=1`, `?paused=1`, or
  `?paths=masked`. `dev/options.ts` lists them. `dev/attachment-routes.ts`
  keeps the uploaded files of both composers. With `?upload=wait` each
  upload keeps running, and with `?upload=fail` the first upload of the
  page fails once, so Try again works. `?sent=<percent>` makes the dev
  fixture `dev/progress-fixture.ts` report that share of each file as
  sent, so `?upload=wait&sent=64` shows the measured state. Create org of the dev fake
  requires at least one repository and starts a simulated build. Its
  repository catalogue keeps the saved choices, and its custom initials
  stay through rename, delete, and restore. Settings changes during the
  first good build start one added build. The fake compares settings
  revisions with builds as the Worker does.
- `?operator=1` makes the dev user an operator, so the rail and the org
  switcher show Operator. The [operator section](../shell/operator/README.md)
  then shows the sample orgs, users, people who wait, and codes of the
  mockups. Suspend, Lift, Approve, New code, Disable, and the pause of
  sign-ups change them. A suspension of Acme, Futex, or Firna also
  suspends that org in the state of the fake, so the fake refuses each
  write of that org with `org_suspended`. The open app does not read its orgs again, so its pages
  of that org show the suspension only after such a refusal. Without the
  option, each operator request gets `operator_required`, as the Worker
  does.
- `?waiting=1` signs in Sam Okafor of the waitlist mockups, who waits for
  app access with a verified email, so the app shows only the
  [waitlist](screens.md#the-waitlist). `?waiting=no-email` gives the same
  account without a verified email. Sam starts as a new account, as
  `?firstRun=github-app` does. With `?operator=1` nobody waits, because
  an operator gets app access. With `?waiting`, `?invited=1` adds an
  invitation of Acme, whose Accept makes Sam a member with app access. A
  join link, such as `/join/V7MKC-2QDXH?waiting=1`, uses its code at once.
  `?paused=1` pauses
  sign-ups: each use of a code, and the Accept of a person who waits, get
  `signups_paused`. The Account page shows the pause, and the operator
  section shows its notice.
  `?inviteCode=used-up` or `?inviteCode=disabled` sets the state of the
  invite code of a user with app access, also on the page of that user in
  the operator section.
- The waitlist and the operator section share one pause and one set of
  codes, as they share the database of the Worker. The codes are those of
  the operator mockups, with a referral code for each sample user with
  app access. For example, `V7MKC-2QDXH` works, `M4QTX-7HKWD` is the
  referral code of Mira Santos, `9PTXC-4WHMN` is used up, `HM3PE-7KWQT`
  is disabled, and a code that the mockups do not list is not found. A
  code that works counts its use, and gives app access and a new invite
  code, so Get started opens. With `?operator=1`, a pause or a Disable in
  the operator section shows on the Account page of the operator.
- The fake keeps its state in the page. A reload starts again from the
  options, so Sam waits again, and the codes and the pause are those of
  the options. An operator never waits, so a pause or a new code of the
  operator section cannot reach the waitlist screen.
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
  the page, its event socket, and an `XMLHttpRequest` for each raw file
  upload, which measures the bytes that the browser sent.

The development fake keeps each org's workspace number counter.
A create gets the next number and a web link on the fake API origin.
Workspace readers keep the number and link that the Worker supplies.

## Composition

`App` in `src/App.tsx` takes three props:

| Prop         | What it gives                                                                  |
| ------------ | ------------------------------------------------------------------------------ |
| `services`   | `AppServices` from `services.ts`: the API, the events, the clock, the storage  |
| `navigation` | The address bar: `browserNavigation(window)`, or `memoryNavigation` in tests   |
| `features`   | `WorkspaceFeatures` from `../shell/workspace/features.ts`: the workspace parts |

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
the workspace stores, and the raw event streams of feature stores.

## Screens

[Screens](screens.md) gives the rules of the screens of the app shell:
the account and Get started, sign-in, invitations, orgs, panels and
layers, the command palette, the focus, saved drafts, New workspace as a page or a dialog,
with the send key that every composer shares, and the waitlist.

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
- The open of a workspace and the settings reads of the Cloud computer
  tab count a generation. An answer that arrives after their screen
  closed or the user cancelled starts no stream, writes no older state,
  and schedules no request.
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
- Timers, the focus, the visibility, the input, and the keys of the page
  come from `AppServices` (`delay`, `onFocus`, `visible`, `onInput`, and
  `onKey`), so that no unit test runs a real timer or needs a browser
  page. The browser hears the input and the keys in the capture phase,
  before a field can stop them. An open workspace counts the input
  anywhere on the page as activity, at most once a minute. `onKey` is not
  passive, so the palette key stops the browser's own action.
  `AppServices.platform` says whether the keyboard is a Mac, which
  chooses the palette key and its hint.
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

## Key code

[Key code](key-code.md) names the files, the types, and the functions to
open first. It covers the dev fake, the API client, the file uploads, the
models, the waitlist and its codes, and the workspace list. It also covers
the event streams, the drag, the operator section, the command palette, the
layers, the frames, and New workspace.
