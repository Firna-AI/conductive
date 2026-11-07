# Harness tests run near the 5-second limit

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, the wider fix of `plans/follow-ups/chat-stop-queue-test-time.md` and `plans/follow-ups/restore-maintenance-test-time.md`. The user sees it as item 113.
- **Location:** `vitest.config.ts`, `worker/chat/stop-queue.test.ts:24`, and `worker/members/restore-maintenance.test.ts:32`.
- **Reason:** the fix raises a time limit, which the user must approve.

- **Terms:**
  - **Harness:** the Worker test setup in `worker/test-support/`, with a local D1 database and fake GitHub and Boat servers. About 45 test files use it.
- **Background:** Vitest stops each test after 5 seconds by default. Alone, the two slowest harness cases take about 2.5 seconds each. In the complete gate, many test files run at the same time, so each case runs slower. The testing rules allow a hang guard of at least three times the typical duration of a test.
- **Problem:** Under load, harness cases pass 5 seconds and fail. The stop-queue case failed this way on 6 November, and the Restore maintenance case failed in two workspaces on 7 November. Each passed on a rerun.
- **Impact if no action:** The complete gate fails now and then, in agent workspaces and in CI, and agents lose time on reruns. Each new slow harness case can do the same.
- **Root question:** How does each harness test stay well inside its time limit when the gate runs under load?
- **Options:**
  - **A.** Fix each slow case when it flakes, by a split or a cheaper setup. Each new slow case fails the gate first. Effort: Small for each case.
  - **B.** Give the harness test files a hang guard of 15 seconds, three times their slowest typical duration and more, in one setting of `vitest.config.ts`. It raises a time limit. Effort: Small.
  - **C.** Make the harness cheaper for each test, such as a faster reset between tests, so that each case runs faster. Effort: Medium.
- **Left out:**
  - Fewer parallel test workers in the gate, because every run of the gate gets slower.
  - A check of test times in the gate, because it only reports slow cases and does not stop the failures.
- **Wider fix:** B. One right default covers every harness case.
- **Previous examples:** `plans/follow-ups/chat-stop-queue-test-time.md`, and the Restore maintenance timeouts in PR #29 and PR #31.
- **Recommendation:** B. The testing rules allow this hang guard, and one setting covers every harness case.
- **Action:** ask the user, because B raises a time limit.
