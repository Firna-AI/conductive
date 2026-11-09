# Desktop CI saves Mac minutes that are free

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the Mac app update plan on branch `calummoore/desktop-app-auto-update`, after the user made the repository public.
- **Location:** The `on:` path filters of `.github/workflows/desktop-ci.yml`, and the `matrix.runner` expression of `.github/workflows/desktop-mac-checks.yml`. The paragraph "Mac CI runs the source and packaged tests" and the path list after it in the section "Checks and packages" of `desktop/README.md`.
- **Reason:** the cost and the coverage of CI are outside the update change.

- **Terms:**
  - **Standard GitHub-hosted runner:** a runner that GitHub provides, such as `macos-15` or `ubuntu-latest`, as opposed to a larger or a self-hosted runner.
- **Background:**
  - The Desktop workflow runs only when a change touches `desktop/**`, `worker/security/desktop-*`, `src/**`, its own file, or `.github/workflows/desktop-mac-checks.yml`.
  - Pull requests run only the Apple silicon runner. Pushes to `main` and to the primary branch, and manual runs, also run the Intel runner. The release workflow runs both runners before it signs a release.
  - `desktop/README.md` says: "The orchestrator chose these filters because private Mac runner minutes cost about ten times Linux minutes."
  - The user made `Firna-AI/remote-code` public on 9 November 2026. GitHub does not charge for standard GitHub-hosted runners in public repositories. Nobody checked the billing page of the organization.
- **Problem:** The README gives a cost reason that no longer holds. Pull requests skip the Intel checks to save minutes that are now free.
- **Impact if no action:** An Intel-only failure shows only after the merge, and the README misleads the next reader.
- **Root question:** Which Mac checks should run on each change, now that Mac minutes are free?
- **Options:**
  - **A.** Keep the filters and the runners. Change the README reason to the queue time of Mac runners. Effort: Small.
  - **B.** Run both Mac runners on pull requests, and keep the path filters. Effort: Small.
  - **C.** Remove the path filters, and run both Mac runners on every pull request and push. Changes that cannot affect the Mac app also wait for Mac runners. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. This is a CI choice, not a defect class.
- **Previous examples:** None found.
- **Recommendation:** B. It catches Intel failures before the merge at no cost, and the filters still skip changes that cannot affect the app.
- **Action:** ask the user, because B and C add a check to pull requests.
