# Mac app

This doc holds the requirements and the decisions in force for the Mac
app. The Mac app is a small Electron shell for macOS. It shows the web app
in its own window. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

Device commands are a separate part of decision 62. With them, an agent
can ask to run a command on the Mac of its sender. This doc does not state
them yet.

## Scope

- The Mac app runs on macOS, on Apple silicon and on Intel Macs
  (decision 62).
- Builds for other systems were left out for now. Linux can follow,
  because the setup of Mokly Cloud already covers it.
- The Mac app follows the desktop app of Mokly Cloud: an Electron shell
  around the build of the web app (decision 62).
- The Mac app has no product screens of its own. It shows the screens of
  the web app, and adds the controls of [The window](#the-window).
- Agents never run on the Mac. Each agent runs in the sandbox of its
  workspace, as it does for the web app in a browser.

## The page

- The Mac app bundles the built web app. It serves these files from its
  own origin, `conductive-app://desktop`, the desktop origin.
- The page opens from the package, also without the network. The window
  never loads the page from a server.
- The desktop origin serves only the files of the package. A path outside
  the package gets no file.
- An address that names no file and has no file extension gets the start
  page of the web app.
- The page calls the API and opens its sockets on `app.conductive.build`,
  as in a browser.
- Each file carries the same content security policy as the web app. That
  policy also names `app.conductive.build` for the API and the sockets.
- Reason: in the Mac app, the API and the sockets are on another origin
  than the page.

## The window

- The window has no title bar of its own. The native red, yellow, and
  green window buttons sit inset at the top left, in the top bar of the
  app (decision 62).
- Reason: the user asked for the window buttons in the app's own top bar,
  as in Conductor's Mac app. Without them, the app does not look like a
  serious desktop app.
- The sidebar toggle sits beside the window buttons. Back and Forward sit
  at the right of the top bar of the left panel.
- These controls sit where the [mockups](../mockups/README.md#the-mac-app)
  draw them. Back and Forward move through the pages of the window.
- The top bars of the app move the window when the user drags them. Their
  buttons and other controls do not move the window.
- In a window, the page keeps the space of the window buttons free. In full
  screen, macOS hides the window buttons, and the page gives their space
  back.
- The page learns whether the window buttons show from a standard web
  feature. A preload script that tells the page was rejected, because it
  is a bridge into the page.
- In a browser, the web app shows none of these window controls.
- The Mac app keeps the size and the position of the window across
  launches. When no screen shows the saved position, the window opens at
  its default size.
- One instance of the Mac app runs at a time. A second launch passes its
  address to the running app, and brings its window to the front.

## Navigation

- The main frame of the window shows only the desktop origin.
- A link to a page of the app hostname opens that page in the window, from
  the desktop origin.
- Every other web address opens in the user's default browser.
- A request for a new window follows the same rules. The Mac app opens no
  second window.
- An address with another scheme, such as `file:`, goes nowhere.
- A frame in the page, such as a port preview or the live desktop of a
  sandbox, can load its own pages. It cannot replace the main frame, and it
  cannot open a `conductive://` address.

## Sign-in

- In the Mac app, GitHub sign-in opens in the user's default browser
  (decision 62). The browser then hands the sign-in to the Mac app through
  a `conductive://` address.
- A sign-in inside the app window was rejected. Reason: the browser already
  holds the user's GitHub sign-in and passkeys, and the window opens other
  sites in the browser.
- A sign-in that starts in the Mac app gives the browser no sign-in
  session.
- The `conductive://` address carries a handoff code. It never carries a
  sign-in session or a GitHub token.
- A handoff code works once, and only for 60 seconds.
- A handoff code works only with a secret that the Mac app made when it
  started that sign-in. Only the exchange with the Worker carries that
  secret.
- Reason: another app on the Mac can claim the `conductive://` scheme. A
  code that such an app catches is of no use without the secret.
- The Mac app accepts only its exact handoff address, and only while a
  sign-in that it started waits. It ignores every other `conductive://`
  address.
- The Mac app exchanges the code with the Worker for its own sign-in
  session. The scripts of the page never get the code or a session token.
- After a failed exchange, the user can start sign-in again.
- The Mac app writes no handoff code and no session token to its logs.

## The sign-in session

- The Mac app has its own sign-in session, with its own session cookie.
  Only the cookie store of the Mac app holds that cookie.
- The cookie is HttpOnly, Secure, and SameSite=None. Reason: the page calls
  the API from the desktop origin, so a SameSite=Lax cookie does not go
  with those calls.
- The session cookie of the browser keeps SameSite=Lax, as
  [Access and security](access-and-security.md#sign-in) says.
- The Worker reads the cookie of the Mac app only on a request whose
  `Origin` header is the desktop origin. Reason: a frame in the window,
  such as a port preview, then cannot use that session.
- The sign-in session stays across launches of the Mac app, until it
  expires or the user signs out.
- Sign out ends the sign-in session of the Mac app, and removes its
  cookie.

## The Worker and the desktop origin

- The gate of `app.conductive.build` accepts the desktop origin wherever
  it accepts the app origin.
  [Access and security](access-and-security.md#hostnames-and-gates) states
  that gate.
- The API uses CORS to allow requests with credentials from the desktop
  origin. Its CORS headers name only the desktop origin, and never another
  origin.
- Every API response carries `Vary: Origin`.
- A preflight from the desktop origin needs no sign-in, and it gives no
  access. It allows only JSON requests with the methods of the API.
- The hostname for machines, `api.conductive.build`, and the preview
  domain, `conductive.page`, never accept the desktop origin.

## Permissions

- The page runs in a sandbox, with context isolation and without Node. It
  has no preload script and no bridge to the main process (decision 62).
- Reason: a script in the page then has no more power than in a browser
  tab.
- Only the main frame on the desktop origin can use a sanitized clipboard
  write. Reason: the copy actions of the web app need it.
- The Mac app denies every other permission to the page and its frames.
  This includes clipboard reads, notifications, the camera, the microphone,
  screen capture, and devices.

## Packages and updates

- The electron-builder tool packages a DMG and a ZIP for each processor
  type, arm64 and x64 (decision 62).
- Each package carries the app icon of the [brand files](../brand/README.md).
- Each build has an ad-hoc signature and no notarization, because no Apple
  Developer ID exists yet. A Developer ID signature and notarization follow
  when the user has one.
- Risk: macOS refuses to open a downloaded build without notarization until
  the user allows it.
- The Mac app updates itself with electron-updater, from the GitHub
  releases of a public repository. Reason: this repository is private, and
  the updater needs a public feed.
- No release is published yet. Until the first release, each build keeps
  the updater off.
- The updater never runs in development.
- When the feed is enabled, the Mac app downloads new versions
  automatically, as Mokly does.
- Each downloaded version offers Restart now or Later once.
- The update installs when the app quits, also after Later.
- A failed update check does not stop the app, and it shows no error.
- Risk: an update installs in place only into a build with a Developer ID
  signature. A build with an ad-hoc signature cannot update itself.
