# Speed up the slow Worker harness tests

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, option C of decision 113. The user chose B now and C as a later follow-up.
- **Location:** `worker/chat/stop-queue.test.ts:24`, `worker/members/restore-maintenance.test.ts:32`, and the other tests of `worker/test-support/harness.ts`.
- **Reason:** the user approved C for later on 7 November 2026.

- **Terms:**
  - **Harness:** the setup for Worker tests in `worker/test-support/`, with a local D1 database and fake GitHub and Boat servers.
- **Background:** Decision 113 gives each test 15 seconds, so the slow harness tests no longer fail the gate. The two slowest cases still take about 2.5 seconds alone.
- **Problem:** Slow harness cases make each run of the complete gate longer for every agent.
- **Impact if no action:** The gate stays slower than it needs to be.
- **Root question:** How does each harness test run in well under its limit?
- **Options:**
  - **C.** Measure every harness case, and split or speed up each case over about 1.7 seconds, such as the two cases above, which each test two requirements. Effort: Medium.
  - **D.** Make the harness reset between tests faster. Its cost is not measured yet. Effort: Medium.
- **Left out:** A check of test times in the gate, because it only reports slow cases.
- **Wider fix:** C.
- **Previous examples:** decision 85, the members tests at about 5.1 seconds.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, as the user chose on 7 November 2026 (decision 113).
