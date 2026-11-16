# Worker tests time out in the full suite

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, during the merge of main into pull request #366.
- **Location:** `worker/operator/org-activity-race.test.ts:22,94`, `worker/features/workspace-links.test.ts:27`, and `worker/app-api/feature-repository-builds.test.ts:112`.
- **Reason:** These files match main, and every failed test passed in a focused rerun without a source change.

- **Background:**
  - A full `npm run check` under `/home/user/code/remote-code` passed its static checks. The test suite passed 3,342 tests, failed four tests, and skipped 12 tests after the separate site build error.
  - Each of these four tests failed with `Error: Test timed out in 15000ms.`:
    - `refuses held HTTP activity after org suspension without changing its deadline, activity or stop alarm`.
    - `refuses a trusted turn in a suspended org before changing its provider deadline`.
    - `presents old replay and later lifecycle events for each local connection with app origin https://app.conductive.test`.
    - `starts an added repository build after a failed build`.
  - The same source at main commit `a20746b99`, with the terminal links branch merged, then passed all four tests from a source copy under `/tmp`. The focused run also included the site tests and the preview port tests: 22 tests passed in five files in 13.83 seconds.
  - The full suite spawned 1,089 test workers and took 1,295.78 seconds. Resource contention and checkout path dependence are suspected sources. Neither is confirmed because the rerun changed both the location and the set of tests.
  - The separate site error is recorded in [built-site-test-cross-device-rename.md](built-site-test-cross-device-rename.md). Earlier checkout path failures are recorded in [worker-tests-fail-under-home-folder.md](worker-tests-fail-under-home-folder.md).
- **Task:** Find the source of the four timeouts. Compare focused and full runs at the same path, then compare paths with the same test set. Make the tests deterministic with readiness signals, event order, or isolated state. Keep each assertion. Add no retry, sleep, skip, or longer timeout.
- **Impact if no action:** A complete check can fail while a focused run passes. This can hide a real regression or delay another branch.
- **Needs:** Node 24 and a Conductive workspace that can run the full suite.
- **Done when:** The source is recorded, the tests have a deterministic fix, and the full suite passes without a timeout change.
