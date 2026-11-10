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
  `mac-app/import/offer` shows. The close button dismisses it.
- The account of the Mac app has the section Import from Conductor under
  This Mac, from `ImportSection`, as `mac-app/import/settings` shows.
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
- `ImportProgress` draws the upload and its end, as
  `mac-app/import/progress` shows. The import makes each workspace at once,
  so the sidebar shows them from the start of the upload.

The imported workspace itself shows in the web app and in the Mac app, as
`app/imported` shows in [the catalogue](catalogue.md).
