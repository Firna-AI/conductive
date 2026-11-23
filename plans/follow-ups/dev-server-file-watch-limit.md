# Dev server exhausts file watches

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, during PR #426 settings smoke checks.
- **Location:** `vite.config.ts`, `package.json`, `docs/mockups/src/entries/app/automations/_folder.json`.
- **Reason:** The default development server failed before the settings smoke check, and file-watch allocation is outside repository trust.

- **Terms:**
  - **File watch:** A Linux resource that tells a running program when a file changes.
  - **Vite:** The development server that serves the app and reloads edited files.
- **Background:** Run `npm run dev` from the repository root with Node 24. The command builds the marketing site, then starts Vite. On 18 November 2026, the server reported the following failure:

  ```text
  file watcher error: ENOSPC: System limit for number of file watchers reached, watch '/home/user/code/remote-code/docs/mockups/src/entries/app/automations/_folder.json'
  ```

  More mockup paths produced the same error. The machine had `fs.inotify.max_user_watches=65536` and `fs.inotify.max_user_instances=128`. A temporary Vite config with `server.watch: null` let the smoke server start. That config lived outside tracked files. No kernel limit or repository config changed.
- **Problem:** The normal development command could not obtain its file watches. The evidence does not identify which processes held them or prove a leak.
- **Impact if no action:** A development or browser check can fail before the app starts. Disabling watches also prevents normal edit reloads.
- **Root question:** How can the development server start reliably within the workspace's file-watch limits?
- **Options:**
  - **A.** Identify the watch owners and reproduce the limit. Release leaked watches or narrow unnecessary watched inputs where the evidence supports it. Verify normal edit reloads. Effort: Medium.
  - **B.** Provide a documented development mode without watches for smoke checks. Normal development can still meet the limit. Effort: Medium.
  - **C.** Increase the workspace's provisioned limits after measuring expected use. This needs an infrastructure change and can hide a leak. Effort: Medium.
- **Left out:** Treating `ENOSPC` as a disk-space failure does not address the reported resource. Always disabling watches removes normal reloads. An unmeasured limit increase does not identify the cause.
- **Wider fix:** A can remove unnecessary watch allocation at its owner. First identify that owner. No allocation cause has been confirmed.
- **Previous examples:** No matching file-watch-limit follow-up was found. The observed failure affected several mockup paths in one server start.
- **Recommendation:** A. Find the allocation cause before choosing a lasting configuration change.
- **Action:** fix after merge, apply A, because this development-environment investigation is independent of repository trust.
