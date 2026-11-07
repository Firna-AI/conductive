# The Mac approval scroll test fails now and then

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #29, branch `conductor/boat-native-remote-workspaces-milestone-7s`. Its first Mac CI run failed this test, and the rerun passed with no change.
- **Location:** `desktop/tests/approval-region.spec.ts:110`.
- **Reason:** the test is outside the diff of the branch that met it, and the cause is not known.

- **Background:** The test "the Mac app keeps many waiting commands above a reachable composer, scrolls a long one from the keyboard, and opens Allow over the region" scrolls a long command with PageDown, then presses Home and waits for the top of the command to show again.
- **Problem:** In one Mac CI run, Home did not scroll back. The top of the command stayed at -530.6 against a bound of 294.4, and the wait stopped after 15 seconds. The suspected cause is the keyboard focus or the order of the scroll, but nobody has proved it.
- **Impact if no action:** The Mac CI fails now and then, and agents lose time on reruns.
- **Root question:** How does the test scroll the command back to its top every time?
- **Options:**
  - **A.** Reproduce the failure with repeated runs on the Mac CI, as the testing rules say. Then fix its cause, in the test or in the approval region. Effort: Medium.
- **Left out:**
  - A retry of the test or a skip, because it hides a possible defect of the keyboard scroll, and only the user can approve it.
  - A longer wait, because the top did not move at all, so more time does not help.
- **Wider fix:** None. The testing rules already say how to handle a flaky test.
- **Previous examples:** the first Mac CI run of PR #31 on 7 November 2026 failed the same test, and its rerun passed.
- **Recommendation:** A. Only the cause tells whether the test or the product is wrong.
- **Action:** fix after merge, apply A, because the test is outside the diff of the branch that met it.
