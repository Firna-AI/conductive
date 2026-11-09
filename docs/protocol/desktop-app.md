# Mac app

This doc holds the requirements and the decisions in force for the Mac
app. The Mac app is a small Electron shell for macOS. It shows the web app
in its own window. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

With Mac commands, an agent can ask to run a command on the Mac of the
person who sent its turn (decision 62).
[Mac commands](desktop-commands.md#mac-commands) states the side of the Mac app.
[Agent tools](agent-tools.md#mac-commands) states the requests, their
limits, their results, and what the chat shows.

These docs belong to this doc:

- [Mac app sign-in](desktop-sign-in.md): the sign-in, the sign-in session,
  and the desktop origin at the Worker.
- [Permissions and Mac commands](desktop-commands.md): the permissions of
  the page, and the side of the Mac app in Mac commands.

## Scope

- The Mac app runs on macOS, on Apple silicon and on Intel Macs
  (decision 62).
- Builds for other systems were left out for now. Linux can follow,
  because the setup of Mokly Cloud already covers it.
- The Mac app follows the desktop app of Mokly Cloud: an Electron shell
  around the build of the web app (decision 62).
- The Mac app has no product screens of its own. It shows the screens of
  the web app, and adds the controls of [The window](#the-window) and of
  [Mac commands](desktop-commands.md#mac-commands).
- Agents never run on the Mac. Each agent runs in the sandbox of its
  workspace, as it does for the web app in a browser.
- An agent can ask to run a command on the Mac. The command runs only with
  the permission of the user, as [Mac commands](desktop-commands.md#mac-commands) says.

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
  [Port previews](terminal-previews-and-desktop.md#port-previews) says.
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

## GitHub App install

- [GitHub App install](desktop-sign-in.md#github-app-install) states the
  browser return after an install and the refresh in the Mac app.

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
