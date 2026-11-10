# Conductive for Mac

This package bundles the web app in a small Electron shell.
It targets macOS arm64 and x64.
Agents still run in cloud computers.
The desktop renderer composes the shared React app shell with desktop services.

The shell uses `conductive-app://desktop`.
It has no preload script or privileged renderer bridge.
Only the bundled main frame can use a sanitized clipboard write.
All other permissions are denied.

The Download action fetches an authorized file response before it creates a memory blob.
The main process permits that blob only from the active app window's exact main frame.
It checks Electron's native frame, window contents, initiator origin, and blob address.
It cancels downloads from child frames, preview frames, and other windows.
It also cancels non-blob downloads and downloads with no native source frame.
The file flow adds no renderer bridge.

The desktop entry supplies the configured Worker origin to the app's API and event services.
API calls use `credentials: include`, so Chromium sends the HttpOnly desktop session cookie.
File uploads go to the same origin as one raw `XMLHttpRequest` with credentials, so they send the same cookie and report their progress.
Workspace sockets use the same Worker origin.
The renderer keeps its normal `fetch` function and has no OS bridge.

## Development

Use Node 24 from the repository root.

```sh
npm ci
npm --prefix desktop ci
npm --prefix desktop run build
npm --prefix desktop start
```

`CONDUCTIVE_APP_ORIGIN` selects the API origin at build time.
It defaults to `https://app.conductive.build`.
Local development can use an HTTP localhost origin.
`CONDUCTIVE_FRAME_SOURCES` lists space-separated HTTPS frame origins.
Set the same frame sources in the web policy.
Include the preview domain, `https://*.conductive.page`, and the desktop stream hosts, `https://*.on.boat.dev`, as [Frame sources](../docs/deployment.md#frame-sources) says.
The Mac check and signing workflows set both origins when they build the app.
Packaged apps use their bundled configuration.
They ignore runtime environment overrides.

The application menu starts GitHub sign-in in the browser.
The `conductive://` callback carries an expiring, one-use handoff.
The main process holds its verifier and installs a separate desktop session cookie.
The renderer never receives that cookie or verifier.
The browser keeps its existing session cookie.
The Worker accepts desktop exchanges and credentials from the desktop origin.
Sign-in from an invite link keeps its `invite_code` in the browser sign-in.
After the handoff, the window loads that code's join address.
A working code opens the app. A failed code shows its reason on the waitlist.
The handoff and exchange carry only their existing code and verifier.

Other web addresses open in the browser.
The bundled main page opens its app popups in the same window.
A link or popup from that page to a port preview launch address opens the preview in the browser instead.
The main process requires the bundled main frame as the navigation initiator.
It never trusts a referrer.
It gets `PreviewLaunchResponse` with its own session, the desktop Origin, and `Accept: application/json`.
It opens only an authorizer URL on a preview domain that a configured frame source covers.
The browser gets a 60-second preview grant in the URL fragment, and no sign-in session.
The window policy adds the app origin to its frame sources, so a preview frame can load its launch page.
Child frames cannot load the main page, open app addresses outside the frame, or start sign-in.

Window bounds and the Chromium session persist across launches.
The app has one instance.
Closing the last window leaves the Mac app in the Dock.
The Dock can reopen the window.

## Device commands

The main process connects the signed-in, awake Mac to the Worker.
It reads the desktop cookie from the Chromium session.
Its authenticated session read checks app access before opening the device socket.
While the user waits, it repeats that read with the existing backoff:
1, 2, 4, 8, 16, then at most 30 seconds between attempts.
It connects after access arrives with the same cookie and no new launch.
Sleep, sign-out, cookie expiry, and app exit cancel the pending attempt.
Unauthorized and replaced sockets keep their existing stop behavior.
The renderer sends approval and settings choices through the Worker relay.
It receives no cookie or local command bridge.

Local permissions belong to the signed-in account on this Mac.
The app keeps exact allowed commands and workspace deadlines under its private user-data directory.
The settings name comes from the OS hostname.
The connection sends that hostname as display metadata for command requests.
Remove and Stop revoke permissions in memory even when saving fails.
The revocation stays in force for the rest of the app run, including reconnects.
A failed save can restore the old permission after a full app restart.
Settings replies report whether the change was saved.
A settings reply that is too large fails its own operation and keeps commands connected.

Always allow has a budget of 900,000 UTF-8 bytes for the JSON-encoded list of always-allowed commands.
A save above the budget fails.
The saved list stays unchanged in memory and on disk.
A new request for the same command can then use Allow.
Allow runs the command once and saves no rule.
Permission files that already hold a larger list still load.

Commands run in the user's shell with bounded output and time.
Folders `~` and `~/...` use the local OS account's home directory.
Other folder values stay exact. The app does not expand shell variables in them.
Sleep, sign-out, cookie replacement, connection loss, and app exit cancel the command process groups.
A replacement connection stops automatic retries on the old Mac.
Wake or a cookie change can connect it again.

Background requests show a native notification.
A click restores the window and opens the request's workspace.
It does not approve the request.
See the [Mac app protocol](../docs/protocol/desktop-commands.md) for the device requirements.

Focused device checks use these commands:

```sh
npm --prefix desktop run test:logic -- src/device
npm --prefix desktop run test:electron -- tests/device-command.spec.ts
npm --prefix desktop run test:electron -- tests/approval-region.spec.ts
```

Build the desktop app before the Electron check.
That check uses an isolated relay and the real main process, cookie store, shell, and power-event hooks.
It checks command results and process-group cancellation on sleep and sign-out.
The existing shell check continues to check renderer isolation and session persistence.
The [Mac notification test](tests/device-notification.spec.ts) reopens a closed window and keeps its request after Dock activation.
Native notification display and click behavior also need a Mac smoke check.

The main-process socket uses `ws` because the native WebSocket API cannot set authenticated upgrade headers.
`@types/ws` supplies its TypeScript types.

## Import from Conductor

The main process lists the Conductor workspaces of this Mac that are not archived.
It uploads the workspaces that the person selects.
No page of the app starts an import operation yet.
The [import README](src/import/README.md) gives the consent, the operations, the scan, the upload, the old documents, the focused checks, and the key code.
[Import on the Mac](../docs/protocol/desktop-import.md) states the requirements.

## Window integration

The window has no title bar of its own.
macOS draws the native red, yellow, and green window buttons at x=14 and y=11.
This centres them in the height of the 34px top bars.

The desktop renderer wraps the shared App in the `MacApp` provider of the app shell.
It gives that provider a `MacWindow` that uses only standard web APIs.
Window Controls Overlay tells the `MacWindow` when full screen hides the window buttons.
Back and Forward use the browser history.
The [web entry](../src/main.tsx) renders no `MacApp`.
In a browser, the app shows no window controls and no drag regions.

The app shell draws one 34px `Window controls` bar on the usual pages of the Mac app.
The waitlist page uses its own header with space for the window buttons and has no controls strip.
In a normal window, the bar keeps 64px free for the window buttons.
In full screen, it gives that space back.
The sidebar toggle sits beside that space.
It hides the sidebar and shows it again.
Back and Forward sit at the right of the bar.

The left panel holds the org rail and the sidebar.
While the sidebar shows, the bar is the top of the left panel.
It then follows the width of the rail and the sidebar.
The sidebar does not show after the toggle hides it, in a window narrower than 900px, or on a page without one.
Then the bar keeps its own width at the top left of the window.
The top bar of the main area starts after the bar.

The app disables the toggle in a window narrower than 900px and on a page without a sidebar.
Other pages without the org rail, such as sign-in, show the bar in a 34px strip.
That strip has no sidebar toggle.
On the account page, the Mac app shows the sidebar of the last org that the user opened.
The app does not save the toggle state or that org.

The element that holds the bar has `data-desktop-chrome-slot`.
The sidebar toggle sits in `data-desktop-panel-slot`.
The space of the window buttons has `data-desktop-window-space`.
The bar, the strip, and the top bars of the main area move the window.
Their buttons, links, fields, and other controls do not.
A top bar of the main area gets its drag region from `useMacBar()`.

[The window](../docs/protocol/desktop-app.md#the-window) states the requirements.
The [Mac app mockups](../docs/mockups/README.md#the-mac-app) draw the layout.

## Checks and packages

```sh
npm --prefix desktop run typecheck
npm --prefix desktop run lint
npm --prefix desktop run format:check
npm --prefix desktop run test:logic
npm --prefix desktop run test:electron
```

The shell test runs under Xvfb on Linux.
It also runs on macOS.
The smoke tests wait for the bundled page title.
They read the product name from the [shared brand file](../docs/mockups/src/brand.ts).
This wait does not depend on the sign-in state.
Linux is a test host, not a release target.

The [window-space test](tests/window-space.spec.ts) runs only on macOS.
It checks 64px of rendered window-button space in a normal window.
It checks 0px in full screen and 64px after leaving full screen.
It waits for the native full-screen events before checking the layout.
At each step, it also checks the bar and the place of the sidebar toggle.
Other hosts skip this test.

The [window controls test](tests/window-controls.spec.ts) checks the bar, the left panel, and the drag regions in a workspace.
It also checks the sidebar toggle, the toggle of the right column, Back and Forward, and the layout after a sidebar resize and a window resize.
The [browser window test](tests/browser-window.spec.ts) opens a fresh web build in a plain Electron window.
There, the workspace shows no window controls.

The `test:logic` command uses the repository's Vitest runner with the desktop configuration.
It runs the unit tests under `src/` and `renderer/`.
The typecheck checks main and scripts with NodeNext, then renderer and Electron tests with the app's bundler resolution.
The root gate runs these unit tests once, in its `npm run test` step.
It also runs desktop typecheck, lint, and formatting checks.
It does not build, launch, or package Electron.

Playwright runs the shell test in the real Electron window.
That test starts sign-in through the native menu and receives the handoff in the main process.
It checks the real Chromium session cookie on an API call before and after a restart.

The [download test](tests/downloads.spec.ts) runs the real main-process policy.
It calls the production browser download module and checks the saved response bytes.
It also checks a refused response, child and preview frames, another window, and a data address.
Run it after the desktop build with `npm --prefix desktop run test:electron -- tests/downloads.spec.ts`.

Mac CI runs the source and packaged tests on an Apple silicon runner and on an Intel runner.
It runs them for each pull request, and for each push to `main` and to the primary branch of the plan.
It builds DMG and ZIP files with publishing disabled.
Mac jobs run only when changed files match these paths:

- `desktop/**`
- `worker/security/desktop-*`
- `src/**`
- `.github/workflows/desktop-ci.yml`
- `.github/workflows/desktop-mac-checks.yml`

The Linux gate installs desktop dependencies without downloading the Electron binary.

On a Mac, run these commands after the build:

```sh
npm --prefix desktop run package
npm --prefix desktop run test:packaged
```

`iconutil` compiles the unchanged [approved iconset](../docs/brand/conductive.iconset/).
The build copies the [1024px PNG master](../docs/brand/conductive-icon-1024.png) unchanged for the Dock.
electron-builder makes DMG and ZIP packages for both Mac architectures.
The `package` command uses an ad-hoc signature.
PR builds force this same ad-hoc signing mode without certificate credentials.
The package command verifies both app bundles with `codesign --verify --deep --strict`.
It also requires `Signature=adhoc` in the signature display.
CI logs and `.context/boat-native-remote-workspaces/desktop-signatures.json` keep the signature evidence.
Generated bundles, icons, packages, and test output stay ignored.
All generated files live under `dist/`.
Compiled app code lives in `dist/app/`.
Web assets, configuration, and brand assets live in `dist/bundle/`.
Packages live in `dist/release/`.
Playwright output lives in `dist/test-results/`.
The package includes only `dist/app/` and `dist/bundle/`.
The import worker thread loads its compiled code from `app.asar.unpacked`, so the package unpacks the import code and the shared modules.

### Releases and updates

[RELEASES.md](RELEASES.md) gives the signed release packages and their secrets, the release steps, and the updater.

### Key code

- [Main process](src/main.ts) composes the protocol, window, session, and updater.
- [Renderer entry](renderer/main.tsx) gives the shared App its desktop services and browser navigation inside `MacApp`.
- [Renderer services](renderer/services.ts) routes credentialed API calls, file uploads, and event sockets to the configured Worker.
- [Window](src/window.ts) owns native controls and saved bounds.
- [Sign-in](src/sign-in.ts) owns the verifier and session exchange.
- [Device composition](src/device/main.ts) connects cookie, power, notification, and app-exit hooks.
- [Device session factory](src/device/session-factory.ts) keeps each account's permission store across connections and disposes all stores at app exit.
- [Device connection](src/device/connection.ts) owns authentication, pairing, heartbeat, and reconnect state.
- [Device session](src/device/session.ts) owns pending requests, scoped approvals, settings operations, and cancellation.
- [Device settings](src/device/settings.ts) reports change outcomes and checks settings replies against the device message budget.
- [Local permissions](src/device/permissions.ts) owns exact command rules, the Always allow budget, and workspace deadlines.
- [Command runner](src/device/runner.ts) owns time and output limits through injected process and clock boundaries.
- [Device contract](../src/shared/device.ts) supplies shared message types, routes, and wire limits.
- [Desktop contract](../worker/security/desktop-contract.ts) shares the desktop origin and session cookie format without Worker dependencies.
- [Import from Conductor](src/import/README.md) lists the import entry points and their hooks in the main process and the device session.
- [Navigation](src/navigation.ts) keeps remote pages outside the main frame.
- [Downloads](src/downloads.ts) allows file response blobs from the bundled main frame only.
- [Preview launch](src/preview.ts) exchanges an authenticated launcher for a short browser handoff.
- [Permissions](src/permissions.ts) denies unapproved browser access.
- [Bundle server](src/export-handler.ts) serves only admitted local files.
- [Chrome](renderer/chrome.ts) makes the `MacWindow` from Window Controls Overlay, the Navigation API, and the browser history.
- [Shell window controls](../src/shell/mac/) hold `MacApp`, the bar, the strip, and the drag styles.
- [Brand assets](../docs/brand/README.md) define the approved icon.
- [Preview Electron test](tests/previews.spec.ts) checks the Mac frame and a separate browser session.
