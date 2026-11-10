# Five tests time out under heavy machine load

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/chat-title-rename`, where several agents ran tests, a mockup build, and Chrome on one machine at the same time.
- **Location:** `worker/chat/retry.test.ts`, `worker/chat/retry-queue.test.ts`, `worker/lifecycle/runner-environment.test.ts`, `worker/lifecycle/disk-retention.test.ts`, `worker/operator/suspension-race.test.ts:20`, and two Git tests of the agent runner under `runner/src/`.
- **Reason:** The branch changed none of these tests, and each passed alone and in two complete gate runs.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Complete gate:** `npm run check`, which CI runs on each pull request.
- **Background:** On 8 November 2026, a machine with 4 CPUs and 8 GB of memory ran two agents' targeted tests, a mockup build, and a headless Chrome capture at the same time. These failures came only under that load:
  - `worker/chat/retry.test.ts`, "rejects a stale second tab after newer queued, running, finished, and failed work": `Test timed out in 15000ms`. Alone it took 1,796 ms.
  - `worker/chat/retry-queue.test.ts`, "commits retry eligibility with a failed turn at both commit boundaries": `Test timed out in 15000ms`. Alone it took 2,341 ms.
  - `worker/lifecycle/runner-environment.test.ts`: `Test timed out in 15000ms`, then its worker ran out of memory and stopped with SIGABRT.
  - Two existing Git tests of the runner: `Test timed out in 5000ms`.
  Each test passed alone, and the complete gate passed twice on the same machine with no other load.
- **Problem:** These tests depend on wall-clock time limits, so a busy machine can fail them with no defect in the code.
- **Impact if no action:** A slow CI runner or a busy developer machine can fail the gate now and then, and a person must rerun it.
- **Root question:** How do these tests stay correct on a slow or busy machine?
- **Options:**
  - **A.** Find the slow step of each test, and replace each wait on time with a wait on an event or a fake clock, as the `testing` skill says. Effort: Medium.
  - **B.** Run the gate with fewer parallel workers, so one machine never runs this much at once. The gate takes longer. Effort: Small.
  - **C.** Change nothing, and rerun a failed gate. Effort: Small.
- **Left out:** A longer time limit. The `testing` skill needs the user's approval for it, and it hides the slow step.
- **Wider fix:** A. It removes the dependence on machine speed.
- **Previous examples:** `plans/follow-ups/start-time-limit-test-under-load.md` and `plans/follow-ups/harness-test-speed.md`. On 10 November 2026, on the branch `calummoore/mac-app-downloads-site`, the complete gate ran beside a review session that ran type checks. `worker/lifecycle/disk-retention.test.ts > ends failed maintenance and refuses destructive resume of a normal errored workspace` failed with "Error: Test timed out in 15000ms." It passed alone, and that branch changed no lifecycle file. Also on 10 November 2026, CI ran the complete gate of the pull request branch `calummoore/file-selector-list` at commit `823d4c0`, in run 42756364794, attempt 2. `worker/operator/suspension-race.test.ts > cancels an in-flight allocation and cleans its delayed computer after actor recovery` failed with "Error: Test timed out in 15000ms." at `worker/operator/suspension-race.test.ts:20:1`. Attempt 1 of the same run had passed it. It passed locally in the complete gate on that tree, and alone on `main` at `ab58467`. That branch changed no Worker file, so a CI runner can be the busy machine too.
- **Recommendation:** A. Each test then fails only for a real defect.
- **Action:** ask the user, because these are tests of code outside the branch, and A and B each cost real time while the failures came only under unusual load.
