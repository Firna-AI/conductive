# The update timer test passes without a check

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the finding check of review round 2 of branch `calummoore/missing-await-lint`.
- **Location:** `desktop/src/updates.test.ts:156`, the test `answers a failed manual check and keeps automatic failures silent`. `desktop/src/updates.ts:132`, the call to `every`.
- **Reason:** The gap is older than that branch, which changes only the type of the timer callback. One fix in a separate branch reaches every open branch.

- **Terms:**
  - **`every`:** the injected timer of `startUpdates` in `desktop/src/updates.ts`. The Mac app passes it an update check that runs every four hours.
- **Background:**
  - The test runs a manual update check that fails, and checks the dialog. Then it calls the timer callback and checks that an automatic failure shows no dialog and calls `warn`.
  - `warn` already got the error from the manual check. So the last assertion holds also when the timer callback does nothing.
  - On 10 November 2026, a copy that passed `async () => {}` with a period of 1 ms to `every` passed all 9 tests of the file.
  - No other test of the file checks that the timer runs an update check, or its period of four hours.
- **Problem:** No test shows that the timer runs an update check every four hours.
- **Impact if no action:** A change can stop the automatic update checks of the Mac app, and every test still passes. Users then get updates only after a manual check.
- **Root question:** How does a test show that the Mac app checks for updates every four hours?
- **Options:**
  - **A.** In the existing test, clear `warn` before the timer callback runs, and expect one more call of the updater's check. Then expect the period of four hours in the call to `every`. Effort: Small.
  - **B.** Add a test that drives the real timer adapter of `desktop/src/main.ts` with a fake clock, and counts the update checks. It also covers the adapter. Effort: Medium.
- **Left out:** A test that runs a real four-hour wait, because the testing rules allow no real clock in a unit test. Fewer than three approaches are real, because the test can only read the injected timer or drive the real one.
- **Wider fix:** None. The gap is in one test.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the test at its level and makes its existing scenario able to fail.
- **Action:** fix after merge, apply A, because the gap is outside the scope of the branch that found it.
