# The Mac app

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The Mac app is the web app in a window of macOS, from decision 62. Its
screens live under `mac-app`, and their parts in `src/components/mac/`.

- `MacScreen` lays the screen of a Mac out at 1440 × 900 and scales it to
  the width of its box in steps of `--mac-scale`, because a view runs no
  script. The box is a size container, as the app frame is, so a picture
  of the marketing site shows the screen at its own size. The app has no
  phone layout, so a phone view shows the same screen, smaller.
- The Mac app section of [the marketing site](marketing-site.md) shows a
  picture of `mac-app/commands`. A change to that screen needs a new
  capture, with the
  [capture steps](../../src/marketing/README.md#pictures).
- The window has no title bar. The red, yellow, and green window buttons
  sit inset at the top left of the left panel, above every layer of the
  app, as macOS draws them. `WindowControls` keeps their space, then shows
  the sidebar toggle, and back and forward at the right. In full screen
  the buttons are gone, and the toggle takes their space.
- `MacApp` marks the screens inside it as the Mac app, so that `AppFrame`
  draws the window controls and a banner of the Mac app. The account of
  the Mac app keeps the sidebar of the org and adds the This Mac section.
- A person without app access sees the waitlist in the window, as
  `mac-app/waitlist` shows. The page has no top bar of its own, so in the
  Mac app the header of `SignInFrame` is the top bar of the window. It is
  as high as the other top bars, with a smaller lockup, and it moves the
  window. In a window it keeps the space of the window buttons free, and
  in full screen it gives that space back.
- An agent can ask to run a command on the Mac of the person who sent the
  turn. The request waits as a compact message just above the composer,
  from `PendingCommand` in `src/components/chat/`: the exact command, the
  time limit, Deny, and Allow. A longer time limit shows its reason.
  Details opens the folder, the reason, the workspace, and the sender. The
  arrow beside Allow opens Always allow and Allow all commands for 15
  minutes. A view runs no script, so Details is a native disclosure, the
  arrow opens a native popover in the top layer, and each choice is a
  link. The header and the workspace list mark the workspace with Needs
  input, so the request shows from every page. A notification of macOS
  opens the workspace when the app is in the background. The 15 minutes
  show as an amber bar with the time left and Stop.
- The requests that wait share one region above the composer, from
  `ChatPane.module.css`. It takes at most 40% of the window, so a long
  command or many requests scroll inside it, and an edge that cuts a
  request fades. `mac-app/requests` draws four requests with a long script.
  A view cannot open a popover, so the chat draws an open menu with
  `DrawnChoices` outside the region, at the actions of its request, and the
  region keeps its bound.
- Each change of the Mac's settings shows its result until the next change
  of the same control: done, done but not saved, or failed, from
  `ChangeOutcome` in `src/components/mac/`. This Mac lists the results of
  Remove under its list, and the bar of the 15 minutes names the result of
  Stop, also after the 15 minutes end. A change that the Mac made but did
  not save took its row or its 15 minutes away, so its result offers Try
  again. `mac-app/this-mac` and `mac-app/stop` draw them.
- The web app shows a waiting request without the choices, because only
  the Mac app can allow a command on the Mac. Once answered, the command
  shows as a card at its place in the chat: denied, done with its output,
  or Mac not available. When its turn ends, the card folds with the work
  of the turn at its place, from decision 151, as
  `app/chat/work/mac-command` shows.

## The import from Conductor

Only the Mac app imports the local workspaces of Conductor, also the ones
that a person moved there from Conductor Cloud. Its pages live under
`mac-app/import`, and their parts in `src/components/conductor-import/`.
`ConductorImportScreen` in `src/screens/` draws them in the window of
`MacScreen`. A phone view shows the same screen, smaller, and it does not
mean that the web app imports.

- When the Mac app finds the data of Conductor, `ImportOffer` offers the
  import once, as a bar of the Mac app at the top of the main area, as
  `mac-app/import/offer` shows. Import is the neutral button of the bar,
  as Stop is in the bar of the 15 minutes. The close button dismisses it.
- The account of the Mac app has the section Import from Conductor under
  This Mac, from `ImportSection`, as `mac-app/import/settings` shows.
- The command palette of the Mac app lists Import from Conductor with the
  actions of Acme, in the All and Actions tabs, as
  `mac-app/import/palette` shows. The palette of a browser never shows
  it.
- Before its first read of the data of Conductor, the Mac app asks in an
  alert of macOS of its own, from `ConsentAlert`, as
  `mac-app/import/consent` shows. The page cannot answer it, because the
  page has no bridge to the Mac app. Its `reading` and `denied` variants
  have the read and the answer Don't Allow.
- `ImportList` draws the list on the page of the import: Select all with
  the size of the selection, which shows the mixed mark while only some
  rows are selected, and a row for each workspace with its name,
  repository, branch, sessions, and the size of its upload. A row whose
  repository the org did not choose has its box off and says why. A row
  that an earlier import brought in links to its workspace with a chip.
  `mac-app/import` and `mac-app/import/list` draw them.
- `ImportProgress` draws the upload, as `mac-app/import/progress` shows.
  A workspace appears in the org only when its own upload ends. So only a
  complete row shows the chip of its workspace, and a row whose upload
  runs or waits shows its name as plain text. The sidebar shows Import
  from Conductor with the complete workspaces only. Its `start` variant
  has the upload before any workspace is complete, so the sidebar has no
  import section yet.
- `ImportResult` draws the end of the import, as the `done` variant of
  `mac-app/import/progress` shows. Each row counts the sessions that came
  along. `ImportReportLists` then names what stayed out, in two lists,
  each with its reason. Stayed on this Mac lists each changed or untracked
  file over 100 MiB, with its path, its workspace, and its size. Sessions
  not imported names each session whose memory file is no longer on the
  Mac, with its workspace. Such a session has no source, so its workspace
  gets no document for it.
- An upload that stops keeps its reservation and its stored parts, as
  `mac-app/import/unfinished` shows. `ImportList` shows its row as
  unfinished, without a box, with how far it got, how long its parts
  stay, and Try again. Its `retry` variant has Try again, which sends only
  the missing parts. Nothing tries again by itself. After 7 days the
  reservation and its parts expire, as the `expired` variant shows: the
  row has its box again, and Import sends all of it again from the Mac. An
  unfinished row is never a workspace, so the sidebar never shows it.

The links of the flow come from its full state, which
`src/screens/conductorImportState.ts` declares. A control that opens a
step, such as Import, Choose workspaces, Allow, Don't Allow, and Ask
again, links only from a state that equals `mac-app/import` in every field
apart from the step, as every saved step does. Import opens the start of
the upload. Try again links only from a state that equals
`mac-app/import/unfinished` apart from the step. So no link changes the
selection, the rows, or the person signed in. Another state of the serve
controls, such as a member with two selected rows, keeps the control
static. The chip and the sidebar row of Coupon totals at checkout, and
the tile of Acme, open `app/imported` and `app/imported/list` only where
the sidebar shows both imported workspaces, as those entries do, and only
for their viewer, an admin. While only one workspace exists, such as
during the upload and after it stopped, they stay static. Before any
workspace exists, the tile of Acme opens the list of Acme as it is.

The imported workspace itself shows in the web app and in the Mac app, as
`app/imported` shows in [the catalogue](catalogue-import.md).
