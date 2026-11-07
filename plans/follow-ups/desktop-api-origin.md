# Desktop API requests reach the bundled page

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-07, from the rename review on `conductor/boat-native-remote-workspaces-milestone-15j`.
- **Location:** `src/app/live-services.ts:14`, `src/app/api/client.ts:65`, and `desktop/src/export-handler.ts:89`.
- **Reason:** The API routing defect predates the product rename and needs a separate implementation change.

- **Terms:**
  - **Bundled origin:** `conductive-app://desktop`, where Electron serves the packaged web app.
  - **API origin:** The configured Worker address, normally `https://app.conductive.build`.
  - **Worker:** The Cloudflare backend that serves the app's API and event sockets.
- **Background:** The Mac app bundles the web app and serves it from its bundled origin. Its API and sockets must use the API origin. The [desktop protocol](../../docs/protocol/desktop-app.md#the-page) states this requirement.
- **Problem:** `createLiveServices` forwards relative API paths to the window's fetch function. The bundled file handler returns `index.html` for a path without an extension. Thus `GET conductive-app://desktop/api/session` returns `200 text/html` instead of an API reply.
- **Impact if no action:** The packaged renderer shows "The app didn't load". The browser app remains available as a workaround.
- **Root question:** How should the bundled app send requests to its configured API?
- **Options:**
  - **A.** Give the shared app services one explicit API origin. Use it for HTTP requests and sockets, with the required desktop credentials. Keep browser requests on their current origin. Effort: Medium.
  - **B.** Proxy API requests through the Electron main process. This adds privileged network handling and changes the requirement that the bundled origin serves only package files. Effort: Large.
  - **C.** Load the remote web app in the window. This removes the bundled-page behavior and changes the offline and origin requirements. Effort: Large.
- **Left out:** Change nothing, because the bundled app cannot load its session.
- **Wider fix:** A. One API origin gives HTTP requests and sockets the same host.
- **Previous examples:** None found in the existing follow-up items. The affected service and request code is unchanged from commit `4afbb80`.
- **Recommendation:** A. It uses the existing configuration and keeps the required separation between package files and remote API traffic.
- **Action:** fix after merge, apply A, because the routing defect is outside the rename and needs its own focused checks.

## Reproduction and evidence

Build with `npm --prefix desktop run build`. On a Mac, launch with `npm --prefix desktop start`. Linux can launch the same renderer under Xvfb.

The reproduction used Electron 44.10.2 on Linux in both colour schemes. The session request returned `200 text/html; charset=utf-8` from the bundled origin. The page showed these messages:

```text
The app didn't load
The app could not read the answer of the server. Try again.
```

A capture that waited for the sign-in lockup failed with `locator.waitFor: Timeout 20000ms exceeded`. A capture-only signed-out API fixture then showed the sign-in page in both schemes. That fixture confirms the renderer can draw the page. It does not prove API routing or sign-in.

The app name, window title, document title, and URL scheme already use Conductive. Do not change the product name to fix this issue.

## Completion

Read `desktop/src/config.ts` and `desktop/vite.config.ts` for the configured API origin. Read `src/app/live-services.ts` for the HTTP and socket composition. Keep the bundled file handler limited to package files.

Verify the real bundled renderer reads its session from the configured API. Verify the desktop session cookie reaches that API after sign-in. Verify the socket uses the same API host. Use the existing Electron test support in `desktop/tests/sign-in-journey.ts` for an isolated API server. Run the checks in [the desktop README](../../desktop/README.md#checks-and-packages).
