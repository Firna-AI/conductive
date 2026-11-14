# Real-runtime tests mix real and manual time

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the branch `calummoore/milan-ofz5`, review items 1 and 6.
- **Location:** `worker/lifecycle/workspace-runtime-test-worker.ts:47`, `worker/lifecycle/runtime-lifecycle-test-support.ts:47`, `worker/lifecycle/runtime-chat-test-support.ts:27`, `worker/lifecycle/runtime-chat-test-support.ts:47`, `worker/lifecycle/real-runtime-test-support.ts:178`, `worker/lifecycle/ownership-maintenance-test-support.ts:42`.
- **Reason:** The branch fixed the flakes with a clock lead. The full move to `TEST_TIME` changes 17 test files, and each one needs a check under load.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Real-runtime fixture:** the harness in `worker/lifecycle/real-runtime-test-support.ts` that runs the production workspace object in Miniflare, with real object alarms. 17 test files use it.
  - **Manual clock:** the `ManualChatClock` of `WorkspaceRuntimeFixture`, which moves only when a test calls `tick()`.
- **Background:**
  - `worker/lifecycle/tests.md` says: "Use `TEST_TIME` as the future origin for native alarms." It also says that an alarm near zero is already due on the real runtime clock, and that it can run before a manual test advance.
  - Before the branch `calummoore/milan-ofz5`, the manual clock started at `Date.now()`. Miniflare then ran overdue alarms on its own, beside the manual ticks.
  - On 4 CPUs, `runtime-state.test.ts` failed in 4 of 10 runs on `main` and in 9 of 10 runs on the branch. With the manual clock 10 minutes ahead, it failed in 0 of 5 runs.
  - The branch now starts the manual clock at `Date.now()` plus 10 minutes, as `CLOCK_LEAD_MS`.
  - The fixture helpers still give some times from `Date.now()`, such as `createdAt` in `queueRuntimeCreate` and `occurredAt` of runner events. These times are now 10 minutes before the clock of the object.
- **Problem:** The fixture uses two clocks: the manual clock in the object, and the real clock in the helpers.
- **Impact if no action:** A later test can compare a helper time with an object time and get the wrong order. A test that runs for more than 10 minutes can meet overdue real alarms again.
- **Root question:** How do the real-runtime tests use one clock for every time?
- **Options:**
  - **A.** Start the manual clock at `TEST_TIME`, as the test guide says. Move each `Date.now()` of the fixture helpers and of the 17 test files to `TEST_TIME` or to the fixture clock. Effort: Medium.
  - **B.** Keep the 10-minute lead. Move only the helper times to a shared `runtimeNow()` that adds the same lead. Effort: Small.
- **Left out:** Retry the failed tests. A retry hides the race, and the testing skill allows a retry only with the user's approval.
- **Wider fix:** A. It follows the rule of the test guide for every test of the fixture.
- **Previous examples:** `5386af5ae` "test: make the native test harness wait for complete work (#166)". `plans/follow-ups/tests-time-out-under-machine-load.md`.
- **Recommendation:** A. It gives the fixture one clock, as the existing rule asks.
- **Action:** fix after merge, apply A, because it changes 17 test files, and each one needs a check under load.
