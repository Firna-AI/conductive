# Upload the first private source maps

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the post-merge tasks of the Better Stack error reporting plan, on the branch `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `docs/deployment/error-reporting.md:73` and `:109`, `tools/build/error-reporting.ts:126`, `tools/build/source-map-upload.ts:9`, `vite.config.ts:60`, `public/.assetsignore:1`, and `wrangler.jsonc:7`.
- **Reason:** The upload needs the operator's Better Stack token and a commit that the Deploy workflow deployed after the merge.

- **Terms:**
  - **Source map:** a private file that maps built JavaScript back to its original source. Better Stack uses it to show readable stack frames.
  - **Debug ID:** an ID that the build writes into each JavaScript file and into its map, so that Better Stack can match the two.
  - **Release:** the name `conductive@<commit SHA>`, with the full SHA of the Git commit that built the code. Each report names it.
  - **Deploy workflow:** `.github/workflows/deploy.yml`. It builds and deploys each push to `main`.
  - **Worker application** and **browser application:** the two Better Stack Errors applications. The first takes the reports of the Worker. The second takes the reports of the web app and the Mac app window.
- **Background:**
  - Each `npm run build` gives the web app and the Worker the release and deterministic debug IDs, with or without upload settings.
  - The Deploy workflow builds each push to `main` from a fresh checkout, with the Node version of `.nvmrc`, `npm ci`, and `npm run build`. It has no upload setting, so CI uploads no maps. No map, upload token, or extra upload step may go into CI.
  - The build makes hidden maps for the web app and the Worker. A hidden map is not named by a `sourceMappingURL` comment in its script.
  - After the upload work, the build deletes every `.map` file of each output. `public/.assetsignore` holds `*.map`, and `wrangler.jsonc` sets `upload_source_maps: false`. So no map reaches the deployed assets or Cloudflare, also when a deletion fails.
  - The build uploads only when the shell holds all five upload settings and the build has a release. Without them, or after a failed upload, the build warns and goes on.
  - An upload warning means that a build step could not confirm its work. It does not prove that every file failed to reach Better Stack.
  - The five upload settings come from the Advanced settings tab of each application in Better Stack Errors:
    - `SENTRY_AUTH_TOKEN`: a Better Stack Telemetry API token. One token serves both applications. It also gives access to the operator's Telemetry account, so it stays in the operator's shell.
    - `SENTRY_URL`: the upload address, such as `https://<region>-sourcemaps.betterstackdata.com`. It is not the host of a DSN.
    - `SENTRY_ORG`: the ID of the Better Stack team.
    - `SENTRY_WORKER_PROJECT` and `SENTRY_BROWSER_PROJECT`: the IDs of the Worker application and of the browser application.
  - Both applications must show the same `SENTRY_URL` and `SENTRY_ORG`, because the build uses one value of each for both uploads.
  - The browser maps go to `SENTRY_BROWSER_PROJECT`, matched by debug ID.
  - The Worker maps go to `SENTRY_WORKER_PROJECT` as files of the release, with no `dist` value. The Worker bundle names its entry `index.js` and its other chunks `chunk-<hash>.js`, at the root of its output.
  - The Worker upload names those files `~/index.js` and `~/chunk-<hash>.js`, with their `.map` files. Worker report frames name `/index.js` or `/chunk-<hash>.js`, a synthetic root that holds no request path and no file system path.
  - The build turns off the telemetry of the Sentry build plugin and of its command-line tool.
  - In Better Stack, the Advanced settings tab of an application shows each upload as Processing, Processed, or Failed. Reports that arrive before Processed show the frames of the bundle. Better Stack supports no public source maps.
  - On one host, a local proof built the same source in three ways: with no settings, with all settings and an unreachable address, and with all settings and a local fake upload service. All three gave the same JavaScript bytes and debug IDs. A build from a second source folder gave the same result.
  - That proof does not show equal bytes across operating systems or tool versions. No upload to the real Better Stack has run. So nobody has seen Better Stack accept these uploads or show original frames.
  - A clean local build of a deployed commit can upload its maps with no new deployment, when its JavaScript bytes and debug IDs match the deployed files. A later deployment of the same commit, with the same files, can use those maps. A new commit needs another upload.
- **Task:**
  1. Wait for the Deploy workflow to deploy a commit that holds the reporting code. Note its full SHA. The Deploy workflow tags each Worker version with the short commit hash, so the Cloudflare dashboard shows which commit is live.
  2. Make a fresh clone of the repository, and check out that exact commit. Keep the source clean, because the build does not reject a checkout with changes.
  3. Use the Node version of `.nvmrc`, as the Deploy workflow does. Set no other setting that changes the built code.
  4. Run `npm ci` from the repository root.
  5. Set the five upload settings in your shell only.
  6. Run `npm run build`. The upload runs during this build, under the release `conductive@<commit SHA>`. Read the output for upload warnings.
  7. Compare the built JavaScript with the deployed files, byte for byte, with their debug IDs. Download the deployed web entry from `https://app.conductive.build/` and each JavaScript chunk that it references. Read the deployed Worker through Cloudflare's script download API, with a read token kept in your shell.
  8. Do not claim matching maps before step 7 passes. When the bytes differ, record the difference in a new follow-up item.
  9. Check that `find dist -type f -name '*.map'` prints nothing.
  10. Check that the deployed assets hold no map. Request `<file>.map` for the web entry and each chunk. No response may be a source map, that is, JSON with a `mappings` field. The app host can answer an unknown path with the app page.
  11. Check that no deployed script holds a `sourceMappingURL` comment.
  12. Open the Advanced settings tab of each application. Check that the upload of `conductive@<commit SHA>` shows Processed in both applications.
  13. Repeat these steps for each later commit whose reports need readable frames.
- **Impact if no action:** Reports show the frames of the minified bundles. A failure is harder to trace to its source.
- **Needs:** A commit with the reporting code that the Deploy workflow deployed. The two applications of `plans/follow-ups/better-stack-activation.md`. An admin of the operator's Better Stack team, for the token and the Advanced settings values. A Cloudflare token that can read the Worker script, kept in the shell. A host whose build matches the deployed bytes.
- **Related:**
  - `plans/follow-ups/better-stack-activation.md` makes the two applications that this task uploads to.
  - `plans/follow-ups/better-stack-first-events.md` checks that real reports show original frames after this upload.
  - `plans/follow-ups/mac-renderer-source-maps.md` adds the same kind of upload for the Mac app window.
- **Done when:** For one deployed commit, the local build matches the deployed web and Worker files byte for byte, with the same debug IDs. `dist/` holds no map, and the deployed assets serve no map. Both applications show Processed for its release. Then delete this item.
