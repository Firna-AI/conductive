# The Mac app

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

The Mac app is the web app in a window of macOS, from decision 62. Its
screens live under `mac-app`, and their parts in `src/components/mac/`.

- `MacScreen` lays the screen of a Mac out at 1440 × 900 and scales it to
  the view in steps of `--mac-scale`, because a view runs no script. The
  app has no phone layout, so a phone view shows the same screen, smaller.
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
  or Mac not available.
