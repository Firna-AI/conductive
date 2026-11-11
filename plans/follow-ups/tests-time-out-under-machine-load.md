# Tests time out under heavy machine load

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the branch `calummoore/chat-title-rename`, where several agents ran tests, a mockup build, and Chrome on one machine at the same time.
- **Location:** `worker/chat/retry.test.ts`, `worker/chat/retry-queue.test.ts`, `worker/lifecycle/runner-environment.test.ts`, `worker/lifecycle/disk-retention.test.ts`, `worker/operator/suspension-race.test.ts:20`, two Git tests of the agent runner under `runner/src/`, and `worker/tools/sessions.test.ts:48`.
- **Reason:** The original branch changed none of the first five tests. Each passed alone and in two complete gate runs.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Complete gate:** `npm run check`, which CI runs on each pull request.
- **Background:** On 8 November 2026, a machine with 4 CPUs and 8 GB of memory ran two agents' targeted tests, a mockup build, and a headless Chrome capture at the same time. These failures came only under that load:
  - `worker/chat/retry.test.ts`, "rejects a stale second tab after newer queued, running, finished, and failed work": `Test timed out in 15000ms`. Alone it took 1,796 ms.
  - `worker/chat/retry-queue.test.ts`, "commits retry eligibility with a failed turn at both commit boundaries": `Test timed out in 15000ms`. Alone it took 2,341 ms.
  - `worker/lifecycle/runner-environment.test.ts`: `Test timed out in 15000ms`, then its worker ran out of memory and stopped with SIGABRT.
  - Two existing Git tests of the runner: `Test timed out in 5000ms`.
  Each test passed alone, and the complete gate passed twice on the same machine with no other load.
- On 11 November 2026, on the branch `calummoore/skill-usage-indicator`, a full run of the runner tests, `npm --prefix runner test`, ran while another agent ran tests in a git worktree on the same machine. `runner/src/git-paths.test.ts > keeps Git descendants absent below replacement files and links` failed with `Error: Test timed out in 5000ms.` It passed in a targeted rerun and in the next two full runs, 204 of 204 tests. That branch changes no Git code of the runner. The suspected source is machine load.
  Later the same day, a full runner run of the same branch ran beside the checks of a second agent. Three tests failed with `Error: Test timed out in 5000ms.`: one in `runner/src/git-paths.test.ts`, one in `runner/src/git-representation.test.ts`, and one in `runner/src/providers/claude.test.ts`. Each passed in a targeted rerun, and the next full run passed 212 of 212 tests. The branch changes none of these tests.
- On 10 November 2026, the main merge into `calummoore/waitlist-global-toggle-brainstorm` ran selected tests beside type, lint, format, file-length, app-build, and mockup checks. `worker/lifecycle/disk-retention.test.ts > keeps a stopped disk through startup and stop failures without a stale stop after user open` failed with `Error: Test timed out in 15000ms.` The other 170 tests passed. Both tests of that file then passed alone with no assertion or timeout change. This branch changes neither that test nor its lifecycle implementation. The suspected source is machine load during the native fixture work.

  On 10 November 2026, CI run `42780530781`, attempt 1, ran the complete gate on commit `3503d628` of the branch `calummoore/workspace-open-error`. Its app and Worker suite ran 704 files: 2,016 tests passed, 2 failed, and none was skipped. One failure was this timeout:
  - `worker/operator/suspension-race.test.ts:20`, "cancels an in-flight allocation and cleans its delayed computer after actor recovery": `Error: Test timed out in 15000ms.`

  The other failure of that run was an assertion. The [completed native-harness record](https://github.com/Firna-AI/remote-code/blob/02ae69421b4b128eba6b1041d829e99f221cd360/plans/follow-ups/tests-fail-under-load.md) preserves it. Main commit `5386af5a` fixed that harness and deleted its record. That branch changed no timeout or assertion of this test. The test file and each module that it imports directly equal `main` at `8567cfb6`. Modules that those imports reach in turn changed on that branch, such as `worker/features/alarms.ts`.

  On the same commit, the unchanged file then passed alone in a local run: 3 of 3 tests, with no skip, in 5.09 seconds. The case then passed three more local runs alone, with no failure. Each of those runs selected only this case by name, so each reported the 2 other tests of the file as skipped. The await that blocked, the cause, and the load of the CI machine are not known. A pass alone does not show that load caused the timeout.
- On 11 November 2026, branch `conductor/background-work-keeps-turn-open-implementation` ran selected contract tests beside type, lint, format, and file-length checks.
  The existing case at `worker/tools/sessions.test.ts:48` failed.
  Its name is "runs CLI session creation, reads, and replayed messages through the stored caller".
  Its error was `Error: Test timed out in 15000ms.`
  The run passed 18 tests and failed 2.

  The other failure was a new test of that branch.
  Its implementor changed it to a direct Worker tool client and kept its storage, restart, and transcript assertions.
  After the heavy checks ended, the existing CLI test passed its single rerun in 3,235 ms.
  All 20 selected tests passed that rerun, with no assertion or timeout change in the existing test.
  Machine contention is the suspected source, but the rerun does not prove the cause.
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
