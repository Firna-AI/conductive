# An account routing test once got a text error

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Low. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from pull request #175 (`calummoore/from-conductor-timestamp-and-links`), which does not touch the test or its code. The branch `calummoore/tool-calls-collapsing-issue` reported the same failure locally that day.
- **Location:** `worker/lifecycle/account-routing.test.ts`, the case "replays a lost allocation and resumes its disk through the stored secondary account".
- **Reason:** Both branches changed no code that this test runs. The test passed again after each failure.

- **Terms:**
  - **Account routing:** the Worker sends each sandbox call through the provider account that holds the sandbox. Pull request #137 added it, and this test covers a lost allocation that resumes its disk through a second account.
- **Background:**
  - The CI job "Complete gate" of pull request #175 failed once, in run `42809324418` at 11:58 UTC on 10 November 2026. 1 test of 2,047 failed, in 1 file of 711.
  - The failure text was `SyntaxError: Unexpected token 'E', "Error: The"... is not valid JSON`, from `parseJSONFromBytes` in `node_modules/undici/lib/web/infra/index.js:177`, through `response.json()`. So a call in the test got a text body that starts with "Error: The", not JSON.
  - The same test passed 3 of 3 times locally on the same tree, and it passed in CI run `42812259114` on the next commit. That commit only merged newer commits of `main`, among them pull request #166, "make the native test harness wait for complete work".
  - No rerun of the failed CI commit ran.
  - On the tool-call branch, the complete gate failed on the same test on 10 November 2026. The machine had 4 CPUs and 8 GB of memory, with no other work beside it. The suite took 944 seconds for 2,007 tests. The same JSON parse error failed one test, and the other 2,006 passed. Then `npx vitest run worker/lifecycle/account-routing.test.ts` passed all 3 tests. A second complete gate on the same tree passed all 2,007 tests.
  - The suspected source is a text error from the local Worker runtime under load, such as an unfinished Durable Object request. This is not proved. The local fail then pass shows a flake, but it does not show whether the later harness fix covers it.
- **Problem:** The test can get a text error from the test harness instead of a JSON response. Its cause is unknown.
- **Impact if no action:** If the failure comes back, the gate fails on a branch that does not touch this code.
- **Root question:** How does the test get a JSON response from every call?
- **Options:**
  - **A.** Check whether pull request #166 covers this path. If it does, close this item. Effort: Small.
  - **B.** Run the test many times under load, as the gate does, and find the call that answers with "Error: The". Fix the cause in the harness or the code. Effort: Medium.
  - **C.** Make the test read the body as text first, and fail with that text when it is not JSON, so that a failure shows its cause. It does not fix the cause. Effort: Small.
- **Left out:** A retry or a longer timeout: the testing rules forbid both, because they hide a defect.
- **Wider fix:** None. The shared harness fix of pull request #166 may already be the wider fix.
- **Previous examples:** `plans/follow-ups/tests-time-out-under-machine-load.md` records failures under load. `plans/follow-ups/account-routing-replay-flake.md` records another failure of this test and a passing CI rerun.
- **Related:** `plans/follow-ups/account-routing-replay-flake.md` records the same test and failure text. One fix must cover both reports.
- **Recommendation:** A, then B if #166 does not cover it. A costs little and may close the item.
- **Action:** fix after merge, apply A, because the failure is outside the change that found it.
