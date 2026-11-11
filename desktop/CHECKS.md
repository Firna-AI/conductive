# Conductive for Mac checks and packages

This file holds the checks and packages part of the [Mac app README](README.md#checks-and-packages).

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
The [phone feedback test](tests/feedback-phone.spec.ts) opens the same build in a 375 × 667 page.
A long feedback draft fails to send, and a wheel over the sheet brings Cancel and Send into view before Send tries again.
[browser-entry.ts](tests/browser-entry.ts) builds the web entry and opens its window for both tests.

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
It runs them for each pull request, and for pushes to `main` and `calummoore/conductor-alternative-architecture`.
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
