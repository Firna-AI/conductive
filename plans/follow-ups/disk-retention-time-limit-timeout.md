# Disk retention time limit test times out under load

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from the full Vitest run of branch `calummoore/unable-to-archive-workspace-b6op`.
- **Location:** `worker/lifecycle/disk-retention-time-limit.test.ts`, the test "ends an unready retention restart at its original deadline through phase changes, reconstruction, and stop retries, then permits user resume".
- **Reason:** the branch does not touch disk retention.

- **Source:** Implementation. **Category:** test.
- **Background:** Vitest stops a test after 15 seconds. This test runs a long lifecycle with reconstruction and stop retries in the native runtime.
- **Problem:** In a full local run of 1,425 files, the test failed with "Test timed out in 15000ms" after 16.3 seconds. Alone it passed. Three runs alone took 5.4 to 7.3 seconds on the branch and 5.5 to 6.3 seconds on `main`.
- **Impact if no action:** The complete gate can fail on a loaded machine with no defect.
- **Root question:** How does this test finish well inside its time limit under the load of the full suite?
- **Options:**
  - **A.** Find the slow steps with a timed run under load, and remove waits that do not need the native runtime. Effort: Small.
  - **B.** Split the test into the deadline case and the user resume case, each with its own fixture. Effort: Small.
- **Left out:** A higher time limit, because the `testing` skill reserves that change for the user.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A, because it finds the cause before it changes the test.
- **Action:** fix after merge, apply A, because the test is outside the scope of the branch.
