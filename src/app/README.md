# Web app: data and composition

The web app is the React app under `src/`. `src/app/` holds its data: the
typed API client, the models that screens read, the router, the event
stream, and the services that the app gets from outside. `src/shell/` holds
the screens of the app shell.
The workspace screen mounts the chat, the Files screens, the tools, the
pull request bar, and the owner picker. A host can give its own parts, as
[Composition](#composition) says.

## Run it

[Run it](run-it.md) gives how the app runs in development, with the fake
API and its preview options, and in the production build.

## Composition

[Composition](composition.md) gives the props of `App`, the parts that a
host gives to the workspace screen, and the members UI of the org settings.

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
with the send key that every composer shares, and the waitlist.
[The command palette and Feedback](palette-screens.md) gives the rules of
the palette and of the Feedback dialog.

## Error reporting

[Error reporting](error-reporting.md) gives the browser error reporter that
the web app and the Mac app window share: when it starts, what it keeps, its
two privacy rebuilds, its entry points, and its focused checks.

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
  chooses the palette key and its hint. It never says whether the page
  runs in the Mac app: the caller of `FeedbackModel.open` gives that
  `desktop` flag.
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

Vitest runs in Node without a DOM. `test-kit.ts` gives services over the
fake API, with raw file uploads through its fetch, requests or answers that
wait for the test (also two at one path), a manual timer with the wait of
each pending timer, a manual page focus, visibility, input, and keys, and a
recording event source.
`../shell/test-render.tsx` draws a screen with every provider through
server rendering, after the test loads its data. A test that needs focus
and keys opts into happy-dom with `// @vitest-environment happy-dom`, and
mounts the screen with `../shell/test-mount.tsx`, which also presses keys,
clicks, types, and lets the answers of the fake API settle.
`../shell/new-workspace/dialog-test-kit.tsx` mounts the whole app in a tab
for the tests of New workspace as a page or a dialog, and of its send key.

## Key code

- `clipboard.ts`: `copyText`, the clipboard write for plain or pending text.
  It starts a pending `ClipboardItem` write during the user press when the
  browser supports it. The fallback waits for the text and calls `writeText`.
  Both paths propagate failures. `AppServices.copy` accepts a string or a
  promise of a string. Live services and development hosts use this owner.

[Key code](key-code.md) names the files, the types, and the functions to
open first. It covers the dev fake, the API client, the file uploads, the
models, the error reporter, the waitlist and its codes, the routines, and the workspace list.
It also covers the event streams, the drag, and the operator section.
[Key code: the palette, the layers, and the dialogs](key-code-layers.md)
covers the command palette, the layers, the frames, New workspace as a
dialog, and feedback with its screenshots.
