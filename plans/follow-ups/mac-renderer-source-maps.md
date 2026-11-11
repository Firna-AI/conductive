# Upload private source maps of Mac releases

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the Better Stack error reporting plan, on the branch `calummoore/betterstack-implementation-brainstorm`. The plan left Mac map uploads for later release work.
- **Location:** `desktop/vite.config.ts:10`, `:49`, and `:52`, `tools/build/error-reporting.ts:28` and `:126`, `tools/build/release.ts:3`, `.github/workflows/desktop-sign.yml:49`, `desktop/electron-builder.yml:6`, `desktop/RELEASES.md`, and `docs/deployment/error-reporting.md:73`.
- **Reason:** The error reporting change keeps map uploads out of the Mac build, and Mac releases build in GitHub Actions, where no upload token may go.

- **Terms:**
  - **Renderer:** the web page of the Mac app window. It runs the shared web app.
  - **Source map:** a private file that maps built JavaScript back to its original source. Better Stack uses it to show readable stack frames.
  - **Debug ID:** an ID that the build writes into each JavaScript file and into its map, so that Better Stack can match the two.
  - **Browser application:** the Better Stack Errors application that takes the reports of the web app and the Mac app window.
  - **Signed packages:** the DMG and ZIP files of a Mac release, which the signing job builds, signs, and notarizes.
- **Background:**
  - The Mac app window runs the web app, so it reports by the rules of `docs/protocol/error-reporting.md`. Its reports go to the browser application with the tag `platform` set to `mac`.
  - Both `src/main.tsx` and `desktop/renderer/main.tsx` start the shared browser reporter before the first render. They call `startBrowserErrorReporting` from `src/app/error-reporting.ts`. The Mac entry passes the app origin of its build.
  - The reporter reads the release and the browser DSN from `src/shared/error-reporting.ts`.
  - `desktop/vite.config.ts` builds the renderer. It reads the release with `readBuildRelease` from `tools/build/release.ts`, and defines it as `__CONDUCTIVE_RELEASE__`.
  - It also runs `instrumentErrorReporting` from `tools/build/error-reporting.ts`. So each renderer script carries the release and a deterministic debug ID, and it registers that ID when it loads.
  - The renderer build sets `build.sourcemap: false`. So it makes no maps and uploads none, and the reports of the Mac app window show the frames of the bundle.
  - The root build of the web app and the Worker already makes hidden maps. A hidden map is not named by a `sourceMappingURL` comment in its script.
  - The root build uploads its maps only from the operator's shell, with all five settings of `docs/deployment/error-reporting.md`. `errorReportingBuild` in `tools/build/error-reporting.ts` runs that upload. `tools/build/source-map-upload.ts` holds its policy, and `tools/build/source-map-cleanup.ts` deletes the maps after the upload work.
  - No map, upload token, or extra upload step may go into CI. An upload failure warns, and the build goes on.
  - The signing job of `.github/workflows/desktop-sign.yml` runs in the `desktop-release` environment. It uses the Node version of `.nvmrc`, then runs `npm ci`, `npm --prefix desktop ci`, and `npm --prefix desktop run build`.
  - That build step sets `CONDUCTIVE_FRAME_SOURCES` to `https://*.conductive.page https://*.on.boat.dev`, and sets `CONDUCTIVE_DESKTOP_UPDATES`. The default `CONDUCTIVE_APP_ORIGIN` is `https://app.conductive.build`. These values go into the built app, so a matching build uses the same values.
  - `npm --prefix desktop run package:release` then signs and notarizes both architectures. `desktop/RELEASES.md` gives the release steps.
  - The renderer output is `desktop/dist/bundle/web`. `desktop/electron-builder.yml` packs `dist/app/**` and `dist/bundle/**` into `app.asar`, so a map in that folder at packaging time would ship in the signed packages.
  - For the web app, a matching clean build of a deployed commit can upload its maps with no new deployment, when the bytes and the debug IDs match. The same rule can hold for a Mac release, with the files inside its signed packages.
  - For the web app and the Worker, a local proof showed equal bytes and debug IDs for builds on one host. It does not prove equal bytes across operating systems or tool versions. Nobody has compared renderer builds in this way, so a comparison decides.
  - The scope is the renderer maps only. The Mac app's own process and the agent runner send no reports, and this task does not add them.
- **Task:**
  1. Make the renderer build make hidden maps, with the same release and debug IDs. Keep each renderer script byte for byte the same, with or without the upload settings.
  2. Delete every map from `desktop/dist/bundle/` before packaging, also when an upload fails. No map may enter `app.asar`, a DMG, or a ZIP.
  3. Upload the renderer maps to the browser application, `SENTRY_BROWSER_PROJECT`, only from the operator's shell with all five settings.
  4. Put no token, upload setting, or upload step into CI or into the `desktop-release` environment.
  5. Write the operator steps for a published release: build its release commit from a fresh clone, with the Node version and the settings of the signing job. Compare each renderer script with the same file inside `app.asar` of the signed package, byte for byte, with its debug ID. Check that the upload shows Processed in the browser application.
  6. Check that the signed packages of a release hold no `.map` file.
  7. Add tests of the new upload policy beside the tests in `tools/build/`, with no network.
  8. Update `desktop/README.md`, `desktop/RELEASES.md`, and `docs/deployment/error-reporting.md`. Change the rule in `docs/protocol/error-reporting.md` that says that the Mac app build uploads no maps yet.
- **Impact if no action:** Reports from the Mac app window keep the frames of the bundle. A failure there is harder to trace than the same failure in the browser.
- **Needs:** The merged reporting change. The browser application and the upload settings of `plans/follow-ups/better-stack-activation.md`. A published Mac release built from a commit with this change. A host whose renderer build matches the signed packages.
- **Related:**
  - `plans/follow-ups/better-stack-source-map-release.md` holds the same steps for the web app and the Worker.
  - `plans/follow-ups/better-stack-activation.md` makes the browser application, and carries the browser DSN to the next Mac release.
- **Done when:** A published Mac release has its renderer maps Processed in the browser application. Its renderer scripts match the uploaded build byte for byte. Its signed packages hold no map, and the docs give the steps. Then delete this item.
