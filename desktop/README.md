# Conducting for Mac

This package bundles the web app in a small Electron shell.
It targets macOS arm64 and x64.
Agents still run in cloud computers.
The web app currently shows only the product name.

The shell uses `conducting-app://desktop`.
It has no preload script or privileged renderer bridge.
Only the bundled main frame can use a sanitized clipboard write.
All other permissions are denied.

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
Worker route and CORS integration must be present before sign-in works.

Other web addresses open in the browser.
The bundled main page opens its app popups in the same window.
Child frames cannot load the main page or start sign-in.

Window bounds and the Chromium session persist across launches.
The app has one instance.
Closing the last window leaves the Mac app in the Dock.
The Dock can reopen the window.

## Window integration

The hidden native title bar places the traffic lights at x=14 and y=11.
The controls fit the mockup's 34px top bar.
The desktop build supplies an owned `data-desktop-chrome-slot`.
Its controls reserve 64px for the traffic lights.
They use standard browser history for Back and Forward.
Window Controls Overlay removes the reserve in full screen without a bridge.
The bar moves the window.
Its buttons use `no-drag`.

The current minimal web app has no sidebar.
Its left control strip does not complete the full product mockup.
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
Linux is a test host, not a release target.
The `test:logic` command uses the repository's Vitest runner with the desktop configuration.
The current root test configuration excludes `desktop/src`.
The proposed root integration patch includes those tests in the root gate.
Playwright runs the real Electron window test.

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
- [Window](src/window.ts) owns native controls and saved bounds.
- [Sign-in](src/sign-in.ts) owns the verifier and session exchange.
- [Navigation](src/navigation.ts) keeps remote pages outside the main frame.
- [Permissions](src/permissions.ts) denies unapproved browser access.
- [Bundle server](src/export-handler.ts) serves only admitted local files.
- [Chrome](renderer/chrome.ts) uses browser APIs for window layout and history.
- [Brand assets](../docs/brand/README.md) define the approved icon.
