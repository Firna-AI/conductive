# Shared UI changes can skip Mac checks

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the second-pass check of finding 4 on `calummoore/user-preferences-screen`.
- **Location:** `.github/workflows/desktop-ci.yml:10` and its pull-request path filter.
- **Reason:** Main already has the filter gap, and changing which edits start a CI gate needs a separate user decision.

- **Terms:**
  - **Mac checks:** The Desktop workflow, including the Electron and packaged-app Playwright tests.
  - **Shared UI:** Components and CSS under `docs/mockups/` that the real app imports.
- **Background:** The real app reuses the mockup components, styles, and design tokens. The Desktop workflow starts for `desktop/**`, `src/**`, desktop security files, and its own workflow file. It accepts both pushes and pull requests with these path filters.
- **Problem:** Both filters omit `docs/mockups/**`. A change to imported CSS alone can alter the real Mac app while skipping its browser layout checks. The ordinary mockup build checks rendering and types, not these browser interactions.
- **Impact if no action:** A CSS-only regression can reach a pull request without running the existing Mac layout specs. A later CSS-only edit can also skip a regression spec for bounded dialogs.
- **Root question:** Which shared UI changes must start the Mac checks?
- **Options:**
  - **A.** Add the shared mockup source paths to both existing filters. This covers the current missing source with a small, explicit list. Effort: Small.
  - **B.** Run the Mac workflow for every pull request and applicable push. This removes filter drift but spends Mac CI time on unrelated docs changes. Effort: Small.
  - **C.** Determine affected Mac input files from the app import graph. This follows later source moves but needs a maintained CI script. Effort: Medium.
- **Left out:** Keep the current filters and rely on a manual run. That does not give automatic coverage. Manual dispatch also starts the signed-package job in this workflow, so it is a poor substitute for source-change coverage.
- **Wider fix:** B. A workflow without a source-path filter cannot miss a later shared source folder.
- **Previous examples:** The New workspace card lives in `docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css`. The palette and shared confirmation cards also use CSS from this tree.
- **Related:** `plans/follow-ups/dialog-content-outside-window.md` will add a browser layout regression. Its initial test-file edit starts the workflow already. Later CSS-only edits still need this coverage decision.
- **Recommendation:** A. It covers the known shared source without running Mac packaging for every documentation edit. B best protects coverage if the user accepts the extra CI cost.
- **Action:** ask the user when this separate item starts, because the options change which source edits must pass the Mac gate and have different CI costs.
