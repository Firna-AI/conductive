# The Mac CI job skips changes to the app icon

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/components-location-misunderstood-d7lu`, the outside-scope list of review rounds 1 and 2.
- **Location:** `.github/workflows/desktop-ci.yml:9-21`, the `paths` lists of `push` and `pull_request`. `desktop/scripts/build.ts:40`.
- **Reason:** The path filter is the same on `origin/main`, and the change that found it does not touch the icon.

- **Source:** Review.
- **Category:** Process.
- **Terms:**
  - **Mac CI job:** the `mac` job of `.github/workflows/desktop-ci.yml`. It builds and checks the Mac app on a macOS runner. It runs only when a changed file matches its path filter, because Mac runner minutes cost about ten times Linux minutes, as `desktop/README.md` says.
- **Background:** The path filter lists `desktop/**`, `worker/security/desktop-*`, `src/**`, and the two Mac workflow files. `desktop/scripts/build.ts:40` copies `docs/brand/conductive-icon-1024.png` into `desktop/dist/bundle/` when it builds the Mac app.
- **Problem:** A change to only `docs/brand/conductive-icon-1024.png` changes the Mac app, but it starts no Mac CI job.
- **Impact if no action:** A broken or wrong icon can pass CI. It shows only in a later pull request that touches `desktop/**` or `src/**`.
- **Root question:** How does a change to a file that the Mac app build reads get the Mac CI job?
- **Options:**
  - **A.** Change nothing. A later change under `desktop/**` or `src/**` builds the app with the new icon. Effort: Small.
  - **B.** Add `docs/brand/conductive-icon-1024.png` to both path lists, and to the list in `desktop/README.md`. Effort: Small.
  - **C.** Add `docs/brand/**` to both path lists. It also catches a new brand file that the build starts to read, at the cost of Mac minutes for brand-only changes. Effort: Small.
- **Left out:** Run the Mac job on every pull request: it spends Mac minutes on unrelated changes, which the path filter exists to avoid.
- **Wider fix:** C. It covers each file of the folder that the build reads from.
- **Previous examples:** `docs/mockups/src/**` had the same gap until the shared UI moved into `src/ui/` on 2026-11-23.
- **Recommendation:** B. Icon changes are rare, and one exact path costs no extra Mac minutes for other brand files.
- **Action:** ask the user, because the option changes when a costly CI job runs.
