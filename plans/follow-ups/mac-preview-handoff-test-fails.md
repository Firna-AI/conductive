# The Mac preview handoff test fails on main

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from PR #414 (branch `calummoore/clickable-dropdown-restart-server-6gn7`), which does not change the Mac app or previews.
- **Location:** `desktop/tests/previews.spec.ts:13`.
- **Reason:** The failure also happens on `main`, so its fix belongs on its own branch.

- **Terms:**
  - **Desktop workflow:** the GitHub Actions workflow that builds and tests the Mac app on Apple silicon and Intel runners.
- **Background:** The Playwright test "opens a Mac preview frame and hands its new tab to a browser without a sign-in session" checks that the Mac app opens a port preview and hands a new tab to the browser.
- **Problem:** The test fails on both Mac runners with `expect(locator).toHaveText(expected) failed` on the `#status` element. It failed in the Desktop runs of `main` at `8781e0f14` and `83585f007` on 16 November 2026, and in PR #414.
- **Impact if no action:** The Desktop workflow stays red on every branch, so a real Mac app failure can hide behind it.
- **Root question:** Why does the Mac preview handoff no longer reach the status that the test expects?
- **Options:**
  - **A.** Read the trace of a failed run, find the cause in the app or in the test, and fix it. Effort: Medium.
  - **B.** Mark the test as skipped until the cause is known. Effort: Small.
- **Left out:** Retrying the test, because it fails on every run of both runners.
- **Wider fix:** None. The cause is not known yet.
- **Previous examples:** None found.
- **Recommendation:** A. A skip hides a possible product defect in previews of the Mac app.
- **Action:** fix after merge, apply A, because the failure exists on `main` and is outside this change.
