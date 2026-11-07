# Conducting for Mac

This package bundles the web app in a small Electron shell.
It targets macOS arm64 and x64.
Agents still run in cloud computers.
The desktop renderer composes the shared React app shell with desktop services.

The shell uses `conducting-app://desktop`.
It has no preload script or privileged renderer bridge.
Only the bundled main frame can use a sanitized clipboard write.
All other permissions are denied.

The desktop entry supplies the configured Worker origin to the app's API and event services.
API calls use `credentials: include`, so Chromium sends the HttpOnly desktop session cookie.
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

`CONDUCTING_APP_ORIGIN` selects the API origin at build time.
It defaults to `https://app.conducting.build`.
Local development can use an HTTP localhost origin.
`CONDUCTING_FRAME_SOURCES` lists space-separated HTTPS frame origins.
Set the same frame sources in the web policy.
Include the preview domain and cloud desktop stream origin when those tools exist.
Packaged apps use their bundled configuration.
They ignore runtime environment overrides.

The application menu starts GitHub sign-in in the browser.
The `conducting://` callback carries an expiring, one-use handoff.
The main process holds its verifier and installs a separate desktop session cookie.
The renderer never receives that cookie or verifier.
The browser keeps its existing session cookie.
The Worker accepts desktop exchanges and credentials from the desktop origin.

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
The renderer sends approval and settings choices through the Worker relay.
It receives no cookie or local command bridge.

Local permissions belong to the signed-in account on this Mac.
The app keeps exact allowed commands and workspace deadlines under its private user-data directory.
The settings name comes from the OS hostname.
The connection sends that hostname as display metadata for command requests.
Remove and Stop revoke permissions in memory even when saving fails.
Settings replies report whether the change was saved.
A settings reply that is too large fails its own operation and keeps commands connected.
Commands run in the user's shell with bounded output and time.
Folders `~` and `~/...` use the local OS account's home directory.
Other folder values stay exact. The app does not expand shell variables in them.
Sleep, sign-out, cookie replacement, connection loss, and app exit cancel the command process groups.
A replacement connection stops automatic retries on the old Mac.
Wake or a cookie change can connect it again.

Background requests show a native notification.
A click restores the window and opens the request's workspace.
It does not approve the request.
See the [Mac app protocol](../docs/protocol/desktop-app.md) for the device requirements.

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

## Window integration

The hidden native title bar places the traffic lights at x=14 and y=11.
The controls fit the mockup's 34px top bar.
The desktop build supplies an owned `data-desktop-chrome-slot`.
Its controls reserve 64px for the traffic lights.
They use standard browser history for Back and Forward.
Window Controls Overlay removes the reserve in full screen without a bridge.
The bar moves the window.
Its buttons use `no-drag`.

The shared app shell supplies the sidebar and product pages.
The desktop chrome strip remains separate from the app's panels.
The product UI must place the chrome slot inside its left panel.
It must add its working sidebar control in `data-desktop-panel-slot`.
It must mark its other top bars as drag regions and their controls as no-drag.
The product must not add another native title bar.

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
Other hosts skip this test.
The `test:logic` command uses the repository's Vitest runner with the desktop configuration.
The typecheck checks main and scripts with NodeNext, then renderer and Electron tests with the app's bundler resolution.
The root gate includes these unit tests once.
It also runs desktop typecheck, lint, and formatting checks.
It does not build, launch, or package Electron.
Playwright runs the real Electron window test.
That test starts sign-in through the native menu and receives the handoff in the main process.
It checks the real Chromium session cookie on an API call before and after a restart.

Mac CI runs the source and packaged tests on an Apple silicon runner for each pull request.
Pushes to `main` and to the primary branch of the plan, and release tags that start with `v`, also run them on an Intel runner.
It builds DMG and ZIP files with publishing disabled.
Mac jobs run only when changed files match these paths:

- `desktop/**`
- `worker/security/desktop-*`
- `src/**`
- `.github/workflows/desktop-ci.yml`

The orchestrator chose these filters because private Mac runner minutes cost about ten times Linux minutes.
The Linux gate installs desktop dependencies without downloading the Electron binary.

On a Mac, run these commands after the build:

```sh
npm --prefix desktop run package
npm --prefix desktop run test:packaged
```

`iconutil` compiles the unchanged [approved iconset](../docs/brand/conducting.iconset/).
The build copies the [1024px PNG master](../docs/brand/conducting-icon-1024.png) unchanged for the Dock.
electron-builder makes DMG and ZIP packages for both Mac architectures.
It uses an ad-hoc signature.
It does not notarize or publish.
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

electron-updater uses the public `Firna-AI/conducting-desktop` GitHub feed.
The feed is unpublished and off by default.
Development builds always keep it off.
A published build can enable it with `CONDUCTING_DESKTOP_UPDATES=enabled`.
It downloads updates automatically and installs them when the app quits.
It offers Restart now or Later once for each downloaded version.

### Key code

- [Main process](src/main.ts) composes the protocol, window, session, and updater.
- [Renderer entry](renderer/main.tsx) gives the shared App its desktop services and browser navigation.
- [Renderer services](renderer/services.ts) routes credentialed API calls and event sockets to the configured Worker.
- [Window](src/window.ts) owns native controls and saved bounds.
- [Sign-in](src/sign-in.ts) owns the verifier and session exchange.
- [Device composition](src/device/main.ts) connects cookie, power, notification, and app-exit hooks.
- [Device connection](src/device/connection.ts) owns authentication, pairing, heartbeat, and reconnect state.
- [Device session](src/device/session.ts) owns pending requests, scoped approvals, settings operations, and cancellation.
- [Device settings](src/device/settings.ts) reports change outcomes and checks settings replies against the device message budget.
- [Local permissions](src/device/permissions.ts) owns exact command rules and workspace deadlines.
- [Command runner](src/device/runner.ts) owns time and output limits through injected process and clock boundaries.
- [Device contract](../src/shared/device.ts) supplies shared message types, routes, and wire limits.
- [Desktop contract](../worker/security/desktop-contract.ts) shares the desktop origin and session cookie format without Worker dependencies.
- [Navigation](src/navigation.ts) keeps remote pages outside the main frame.
- [Preview launch](src/preview.ts) exchanges an authenticated launcher for a short browser handoff.
- [Permissions](src/permissions.ts) denies unapproved browser access.
- [Bundle server](src/export-handler.ts) serves only admitted local files.
- [Chrome](renderer/chrome.ts) uses browser APIs for window layout and history.
- [Brand assets](../docs/brand/README.md) define the approved icon.
- [Preview Electron test](tests/previews.spec.ts) checks the Mac frame and a separate browser session.
