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
  Its Keyboard shortcuts tab adds the commands and the menu keys that only
  the Mac app has.
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
  show as an amber bar with the time left, Extend, and Stop. Extend sets
  their end to 15 minutes from now, only while they run. It sits between
  the time left and Stop, so Stop keeps its place at the end of the bar.
  Each button of the bar links to the page of its result.
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
- An Extend is done or failed, never done but not saved, because the Mac
  saves the new end first. A done Extend shows no result, because the
  time left shows the change. A failed Extend shows Not extended and its
  cause beside the time left, Extend, and Stop. It has no Try again,
  because Extend stays in the bar. An Extend result shows only while the
  15 minutes run. `mac-app/extend` draws both.
- The web app shows a waiting request without the choices, because only
  the Mac app can allow a command on the Mac. Once answered, the command
  shows as a card at its place in the chat: denied, done with its output,
  or Mac not available. When its turn ends, the card folds with the work
  of the turn at its place, from decision 151, as
  `app/chat/work/mac-command` shows.
- The Mac app gives the page every key, so its Keyboard shortcuts tab,
  from decision 190, dims no key. `mac-app/shortcuts` draws the tab with
  its child pages `search`, `recording`, and `changes`. A search field at
  the top finds a row by its words, from decision 195. The line under it
  says that keys without ⌘ go to the terminal while it has the focus.
  Only the Mac app has Hide or show the sidebar, Back, Forward, Paste and
  match style, and the Mac app group of its menu keys. From decision 193,
  the Workspace group ends with the fixed keys of a focused workspace row
  and a focused divider. Reset all asks first, in a `ConfirmDialog`. A
  browser shows the same tab with the keys of its tab, as
  `app/account/shortcuts` draws.
- In the Mac app, each command row of the palette ends with the first key
  of its command, as `mac-app/command-palette` draws. The Search row shows
  the person's key of the palette, and it opens that page.
