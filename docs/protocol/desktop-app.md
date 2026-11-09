# Mac app

This doc holds the requirements and the decisions in force for the Mac
app. The Mac app is a small Electron shell for macOS. It shows the web app
in its own window. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

With Mac commands, an agent can ask to run a command on the Mac of the
person who sent its turn (decision 62).
[Mac commands](#mac-commands) states the side of the Mac app.
[Agent tools](agent-tools.md#mac-commands) states the requests, their
limits, their results, and what the chat shows.

## Scope

- The Mac app runs on macOS, on Apple silicon and on Intel Macs
  (decision 62).
- Builds for other systems were left out for now. Linux can follow,
  because the setup of Mokly Cloud already covers it.
- The Mac app follows the desktop app of Mokly Cloud: an Electron shell
  around the build of the web app (decision 62).
- The Mac app has no product screens of its own. It shows the screens of
  the web app, and adds the controls of [The window](#the-window) and of
  [Mac commands](#mac-commands).
- Agents never run on the Mac. Each agent runs in the sandbox of its
  workspace, as it does for the web app in a browser.
- An agent can ask to run a command on the Mac. The command runs only with
  the permission of the user, as [Mac commands](#mac-commands) says.

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
  policy also names `app.conductive.build` for the API, the sockets, and
  the frames.
- Reason: in the Mac app, the API, the sockets, and the launch address of
  each port preview are on another origin than the page.

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
- The launch address of a port preview follows the rules of
  [Port previews](#port-previews).
- An address with another scheme, such as `file:`, goes nowhere.
- A frame in the page, such as a port preview or the live desktop of a
  sandbox, can load its own pages. It cannot replace the main frame, and it
  cannot open a `conductive://` address.
- A frame cannot open an address of the app hostname or of the desktop
  origin outside the frame. Such a request goes nowhere.

## Port previews

- A port preview shows in a frame of the page, as in a browser. The frame
  loads the launch address of the preview from `app.conductive.build`, as
  [Port previews](access-and-security.md#port-previews) says.
- A link or a request for a new window from the main page to a launch
  address opens the preview in the user's default browser. The window
  keeps its page.
- The Mac app accepts that request only when the main frame on the desktop
  origin starts it. A referrer does not identify the frame that starts a
  request, so the Mac app never trusts one.
- To open the preview, the Mac app gets a browser launch from the launch
  address. It sends its own sign-in session, the desktop origin, and
  `Accept: application/json`.
- A browser launch is a JSON reply with an authorizer address and the
  expiry of its grant. The address carries the preview hostname and a new
  grant only in its fragment.
- The Mac app opens only an authorizer address on a preview domain that
  the configured frame origins include. It opens no other address from a
  browser launch.
- The browser gets the grant of that one preview, and no sign-in session.
  Reason: the launch address needs a sign-in session, and the browser may
  hold none.

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

## GitHub App install

- Install the GitHub App opens GitHub in the user's default browser, as
  each other web address does.
- After the install, the browser shows a page that tells the user to go
  back to the Mac app. When an owner of the GitHub account must approve
  the install, the page says so.
- The Mac app reads the installs and the steps of Get started again when
  its window gets the focus.
- A `conductive://` address that opens the Mac app after the install was
  rejected. Reason: the Mac app accepts only the address of its sign-in.

## The sign-in session

- The Mac app has its own sign-in session, with its own session cookie.
  Only the cookie store of the Mac app holds that cookie.
- The cookie is HttpOnly, Secure, and SameSite=None. Reason: the page calls
  the API from the desktop origin, so a SameSite=Lax cookie does not go
  with those calls.
- The session cookie of the browser keeps SameSite=Lax, as
  [Access and security](access-and-security.md#sign-in) says.
- The Worker reads the cookie of the Mac app on a request whose `Origin`
  header is the desktop origin.
- It also reads that cookie on a GET of the exact launch address of a port
  preview without an `Origin` or an `Upgrade` header. When such a GET
  carries the cookie of the Mac app, the Worker reads no other session
  cookie.
- Reason: the window loads the launch address in a frame, and a navigation
  sends no `Origin` header. Such a GET returns only the launch page or a
  browser launch. No other origin can read either reply.
- Every other request uses only the session cookie of the browser. Reason:
  a frame in the window, such as a port preview, then cannot use the
  session of the Mac app for the API.
- The sign-in session stays across launches of the Mac app, until it
  expires or the user signs out. A suspension of the user ends it too, as
  [Operator actions](operator-actions.md#sessions-and-sign-in) says.
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
- Mac commands add no bridge and no permission to the page. The page has
  no direct access to the commands of the Mac.
- The page can only answer a request that waits. The answer goes through
  the Worker to the Mac app on the Mac that got the request.
- Only the main frame on the desktop origin can use a sanitized clipboard
  write. Reason: the copy actions of the web app need it.
- The Mac app denies every other permission to the page and its frames.
  This includes clipboard reads, notifications, the camera, the microphone,
  screen capture, and devices.

## Mac commands

This section states the side of the Mac app.
[Agent tools](agent-tools.md#mac-commands) states the requests, their
limits, their results, and what the chat shows.

### The device

- While the Mac app runs and is signed in, it registers its Mac as a
  device of its signed-in user (decision 62).
- The Mac app holds one device connection to the Worker, on
  `app.conductive.build`. The connection proves its user with the sign-in
  session of the Mac app.
- The Mac is available only while that connection is open. When the Mac
  sleeps, when the Mac app closes or signs out, or when the connection
  ends, the Mac is not available.
- Each user has one device connection at a time. A new connection replaces
  the older one. The requests of the older one end as not available.

### The request on the Mac

- On the Mac that got the request, the compact message in the chat offers
  Deny and Allow (decision 62). A menu beside Allow offers Always allow
  and Allow all commands for 15 minutes.
- A dialog over the app was rejected. Reason: the user chose a compact
  message in the chat, with the command and its actions.
- While a request waits, the row of its workspace shows needs input on
  every page of the Mac app. A click on that row opens the request
  (decision 68).
- When the Mac app is in the background, a notification of macOS tells of
  the request. The notification opens the workspace of the request.
- The notification comes from the Mac app. The page still gets no
  permission for notifications, as [Permissions](#permissions) says.

### The choices

- Deny: the command does not run.
- Allow: the command runs once.
- Always allow: the command runs. A later request with the exact same
  command text then runs on that Mac without asking (decision 62).
- Allow all commands for 15 minutes: the command runs. For 15 minutes,
  every later request from the same workspace then runs on that Mac
  without asking (decision 62).
- Reason: the user asked that each command needs permission, with these
  four choices.
- While the 15 minutes run, the Mac app shows a bar on that workspace with
  the time left and Stop. Stop ends the 15 minutes at once.
- The command runs with the permissions of the user on the Mac, in the
  folder of the request.
- Risk: Always allow does not cover the folder. So an always-allowed
  command runs in any folder that a later request names.

### Saved choices

- The always-allowed commands and the 15 minutes stay only on the Mac. The
  Mac app decides from them. The Worker never stores them.
- Reason: the Mac then decides what runs on it, and no record on the
  server can allow a command.
- The account page of the Mac app has a This Mac section. It shows the
  name of the Mac, whether the Mac is available, and each always-allowed
  command by its exact text, with Remove.
- After Remove, the next request with that command text asks again.
- Remove and Stop revoke their permission in the current Mac app even if
  saving the change fails.
- The revocation stays in force for the rest of the app run, including a
  reconnect. A failed save can still restore an earlier permission after
  a full app restart.
- A failed save does not keep the revoked permission active in memory.
  Reason: a disk error must not leave a permission active after the user
  revokes it.
- The web app in a browser has no This Mac section.

### Settings results

- Each settings result identifies its operation and includes the current
  effective settings.
- Each settings change reports one outcome: done, done but not saved, or
  failed.
- Done means the change took effect and was saved. Done but not saved
  means the change took effect in memory and the save failed.
- Failed means the change did not take effect. Both failure outcomes
  explain the failure.
- A successful settings read reports done.
- This Mac shows the result of each control. The bar shows the result of
  Stop even when the grant no longer runs.
- A failure stays until the next change of that control, also after a
  read or a new device connection.
- When the original control is gone, Try again can repeat that change.
  The current Mac gets this new explicit action.
- A change that waited for an older connection reports failure after a
  reconnect. It never goes to another connection by itself.
- Reason: the user must see whether a permission changed and can try the
  same action again without restarting the app.
- If a full settings result exceeds the device message budget, the Mac
  returns a small failure with the same operation ID and the size cause.
- That failure keeps the connection, saved commands, and running commands
  active. It adds no limit to saved settings.
- Reason: a large settings list must not interrupt command execution or
  cancel a command.

## Packages and updates

### Packages

- The electron-builder tool packages a DMG and a ZIP for each processor
  type, arm64 and x64 (decision 62).
- Each package carries the app icon of the [brand files](../brand/README.md).
- Development and pull request packages have an ad-hoc signature and no
  notarization. They need no Apple signing credentials.
- Release packages use a Developer ID Application signature and Hardened
  Runtime. Apple notarizes the app before ZIP packaging. Each DMG is also
  signed and notarized. Each app and DMG has a stapled notarization ticket.
- Release packaging fails if credentials are missing, the signing team is
  wrong, or signature, ticket, or Gatekeeper verification fails.
- A release package runs on macOS 13 or later. Its app has
  `LSMinimumSystemVersion` 13.0, so macOS 12 and older refuse to open it.
- Risk: macOS refuses to open a downloaded ad-hoc build until
  the user allows it.

### Releases

- The update feed is the GitHub releases of this repository,
  `Firna-AI/remote-code`, which is public.
- A separate feed repository was rejected. Reason: releases here need no
  stored credential and no second repository.
- One version covers the whole product. Reason: the Mac app bundles the
  web app, so each product change changes the Mac app.
- Versions have the form `0.x.y`.
- Each release comes from a release pull request into `main`. Each push to
  `main` updates its next version and its changelog from the Conventional
  Commit messages.
- The merge of the release pull request creates the tag `vX.Y.Z` on the
  merge commit, and a draft GitHub release.
- A version from a pushed tag or from a hand edit was rejected. Reason: one
  merge then sets the version, writes the changelog, and starts the
  release.
- After the merge, the release workflow runs the Mac checks. It then signs
  and notarizes both architectures, runs the packaged tests, and uploads
  the files to the draft.
- Before it signs, the release workflow checks that the tag `vX.Y.Z` points
  to the merge commit of the release pull request. A branch with the same
  name does not count. The release stops before signing when the check
  cannot find the tag on that commit.
- Reason: the release page, its source archives, and the start of the next
  changelog follow the tag. A tag that someone pushes before the merge can
  point to code that the release was not built from.
- A person then moves the tag to the merge commit and runs the failed jobs
  again. The release workflow never moves a tag. Reason: a workflow that
  moves a tag by itself rewrites a tag that a person pushed, without review.
- When a step fails, the release workflow publishes nothing.
- The draft becomes a published release only after GitHub lists every file
  with its full size. Reason: the updater reads only published releases,
  so no installed copy sees a partial release.
- A published release is never changed or deleted.
- Releases are full GitHub releases, not prereleases. Reason: the updater
  reads GitHub's latest release, which is never a prerelease.
- Every release of this repository holds the files of the Mac app. Reason:
  the updater reads the newest release of the whole repository, so a
  release without them stops all updates. The files are:
  - a ZIP file for arm64 and one for x64, which the updater installs
  - the block map of each ZIP file
  - a stapled DMG file for arm64 and one for x64, which people install
  - `latest-mac.yml`, which gives the updater the version and the ZIP files
- `latest-mac.yml` lists no DMG file. Reason: stapling changes each DMG
  after the build records its size and hash.
- Each DMG of a release has a fixed name, without the version:
  `Conductive-mac-arm64.dmg` for arm64 and `Conductive-mac-x64.dmg` for
  x64. So the address
  `https://github.com/Firna-AI/remote-code/releases/latest/download/<name>`
  always gives the DMG of the latest release for that processor type.
- Reason: the marketing site runs no script, so it needs one address that
  always gives the newest DMG. A link to the release page was rejected,
  because the visitor must then choose from nine files. A Worker route that
  finds the newest version was rejected, because it adds a GitHub request
  to each download.
- Each ZIP file and its block map keep the version in their names. Reason:
  the updater finds each ZIP file through `latest-mac.yml`, so a ZIP file
  needs no fixed name.
- The releases before the fixed names, such as `v0.2.0`, keep the version
  in their DMG names. Reason: a published release never changes.
- From the second update after a DMG install, the block maps let the
  updater download only the changed blocks.
- Only workflow runs on `main` sign. The protected `desktop-release`
  environment holds the signing credentials, and it admits only `main`.
- Signing in tag runs was rejected. Reason: a tag can point to a commit
  that never merged. Any workflow run can create a release here, so the
  signing credentials decide which builds can install as an update.
- Each runner uses a temporary Keychain and removes its temporary
  credentials.
- A manual run of the release workflow from `main` checks and signs both
  architectures. It publishes nothing.
- The job that publishes installs no dependencies and runs no build. The
  job that signs cannot write releases. Reason: no dependency script then
  runs beside a token that can write releases.
- The first release is `0.1.0`. The signed `0.1.0-alpha.1` build has the
  updater off, so its users install a newer version by hand once.

### Updates in the app

- The Mac app updates itself with electron-updater, from the releases of
  this repository.
- Only the packages that a release publishes have the updater on. Manual
  signing runs, pull request builds, and local builds keep it off. Reason:
  a test build with the updater on could install a published version over
  itself.
- The updater never runs in development.
- Risk: an update installs in place only into a build with a Developer ID
  signature. A build with an ad-hoc signature cannot update itself.
- The app checks for a new version at launch and every 4 hours. It
  downloads a new version automatically, as Mokly does.
- The app shows "The update is ready." with Restart now and Later only
  after the macOS update framework accepts the downloaded version. Reason:
  macOS can still refuse it, and Restart now would then wait forever.
- Without a manual check, the app offers each downloaded version once.
- Restart now restarts the app into the new version. Later installs it at
  the next quit.
- A failed check, download, or install does not stop the app. Only a
  failed manual check shows an error.
- Help → Check for updates answers each manual check with a dialog:
  - No new version: "Conductive is up to date."
  - A failed check: "Conductive could not check for updates. Try again
    later."
  - A new version: "Downloading the new version. Conductive tells you when
    it is ready." Then "The update is ready." follows, as above.
  - A downloaded version that waits: "The update is ready." with Restart
    now and Later again.
- A manual check during a running check waits for the result of that
  check.
- A notification or a label in the Help menu was rejected as the answer.
  Reason: the person who asks could miss either one.
- Risk: a copy that runs from a read-only volume cannot update itself, and
  the app shows no error. This holds for a copy that runs from its mounted
  DMG. It also holds for a downloaded copy that macOS runs from a hidden
  read-only place until the user moves it.
- A later change adds an offer to move such a copy into Applications.
