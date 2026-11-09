# The Mac CI job skips changes to the mockup styles

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from branch `calummoore/right-panel-close-icon`, a problem outside the scope of its review round 1.
- **Location:** `.github/workflows/desktop-ci.yml`, the `paths` lists of `push` and `pull_request`. `desktop/README.md`, the list under "Mac jobs run only when changed files match these paths".
- **Reason:** The fix changes when an existing gate runs, and the Mac runner minutes cost money, so the user decides.

- **Terms:**
  - **Mac CI job:** the `mac` job of `.github/workflows/desktop-ci.yml`. It runs the Electron journeys under `desktop/tests/` on a macOS runner. These journeys are the only checks of the app that measure the layout in a real browser engine.
  - **Mockup sources:** the files under `docs/mockups/src/`. The app imports its global stylesheet `docs/mockups/src/render.css`, many CSS modules, and some components from there.
- **Background:** The Mac CI job starts only when a change matches one of these paths: `desktop/**`, `worker/security/desktop-*`, `src/**`, and `.github/workflows/desktop-ci.yml`. `desktop/README.md` records the reason: private Mac runner minutes cost about ten times Linux minutes. The root gate, `npm run check`, runs on Linux and has no layout check. About 77 files under `src/` import styles or components from `docs/mockups/src/`. The Electron journey `desktop/tests/window-controls.spec.ts` measures the sidebar toggle and the toggle of the right column. The right column hides through the global rule `[hidden] { display: none !important; }` in `docs/mockups/src/render.css`.
- **Problem:** A change that touches only `docs/mockups/src/` changes the styles of the app, but it starts no Mac CI job. For example, a change that removes the global `[hidden]` rule leaves the right column visible after Hide. The journey catches that break, but it does not run on that change.
- **Impact if no action:** A style change can break the layout of the app and pass CI. The break shows only in a later pull request that touches `src/**` or `desktop/**`, where it looks unrelated.
- **Root question:** How does a change to the styles that the app uses get the layout check of the Mac CI job?
- **Options:**
  - **A.** Change nothing. A later change under `src/**` or `desktop/**` runs the journeys. The break then shows in an unrelated pull request. Effort: Small.
  - **B.** Add `docs/mockups/src/**` to the `push` and `pull_request` path lists of `.github/workflows/desktop-ci.yml`. Add the same path to the list in `desktop/README.md`. Cost: Mac runner minutes on each pull request that changes only the mockups. Effort: Small.
  - **C.** Add only the mockup paths that the app imports, such as `docs/mockups/src/render.css`, `docs/mockups/src/components/**`, and `docs/mockups/src/design/**`. Cost: fewer Mac runs than B, but the list must follow each new import of the app. Effort: Small.
  - **D.** Add a real-browser runner, such as Vitest browser mode with Chromium, to the root gate. Run the layout checks there on every pull request. Cost: new dependencies, a browser in the Linux job and on each developer machine, and a new gate step. Effort: Large.
  - **E.** Run the existing Mac workflow for every pull request and applicable push. This removes source-path filter drift, but spends Mac CI time on unrelated documentation changes. Effort: Small.
  - **F.** Determine affected Mac input files from the app import graph. This follows later source moves, but needs a maintained CI script. Effort: Medium.
- **Left out:** A check that reads the CSS source text, because it mirrors the implementation and cannot see the layout. Manual dispatch does not give automatic coverage. It also starts the signed-package job in this workflow, so it is a poor substitute for source-change coverage.
- **Wider fix:** D, because it runs a layout check on every pull request, whatever paths it changes.
- **Previous examples:** The change that added the toggle of the right column, on 2026-11-08, put its hide rule in `docs/mockups/src/` only. Only its other changes under `src/**` made the Mac job run.
- **Recommendation:** B. It closes the gap with one line in each of two files, and mockup-only pull requests are few.
- **Action:** ask the user, because the option changes when an existing gate runs, and the Mac runner minutes are a cost that the user chose to limit.

- **Related:** `plans/follow-ups/dialog-content-outside-window.md` will add a browser layout regression. Its initial test-file edit starts the existing workflow. Later CSS-only edits still need the coverage decision.

The second-pass check of the New workspace dialog on 9 November 2026 found the same gap. It proposed E and F as other approaches. It recorded that shared components and styles under `docs/mockups/` can alter the real app while the ordinary mockup build checks rendering and types without these browser interactions. E also prevents path-filter drift while retaining the current Mac journeys.
