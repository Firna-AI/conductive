# An org image test failed once under load

- **Severity:** Low. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the check of finding 2 of review round 1 on branch `calummoore/user-preferences-screen`.
- **Location:** `worker/operator/org-native.test.ts`, the case "fails a queued native image build of another starter without allocating a computer".
- **Reason:** the branch does not touch the org image code or its tests.

- **Terms:**
  - **Full Worker suite:** every Worker test, which `npm run test` runs with a local D1 database and fake GitHub and Boat servers.
- **Background:** A review check ran two full Worker suites at the same time on a machine with 4 CPUs. The case above failed once in that run. Vitest hit the time limit of the run before it printed the failure text, so no failure text exists. The case then passed 3 runs alone and 2 later full runs, one after the other. The case does not touch the account code of the branch.
- **Problem:** The case can fail when the machine is busy. The cause is not known, because the failure text is missing.
- **Impact if no action:** The complete gate, `npm run check`, can fail now and then on a busy CI machine, and an agent can spend time on a failure that the change did not cause.
- **Root question:** Does this case fail under normal gate load, and why?
- **Options:**
  - **A.** Reproduce the failure with two full Worker suites at the same time, without a run time limit, and capture the failure text. Then fix the cause with a deterministic wait, under the flaky-test rule of the `testing` skill. Effort: Medium.
  - **B.** Watch the CI runs of the next branches, and act only when the case fails there. Effort: Small.
- **Left out:** A longer time limit for the case, because the `testing` skill does not allow a raised time limit as a fix for a flaky test.
- **Wider fix:** None. The follow-up item `plans/follow-ups/harness-test-speed.md` already holds the speed work of the Worker harness tests.
- **Previous examples:** `plans/follow-ups/start-time-limit-test-under-load.md`, another Worker test that can time out under load.
- **Related:** `plans/follow-ups/start-time-limit-test-under-load.md`, the same class: a Worker test that fails when the machine is busy.
- **Recommendation:** A. A failure text is needed before any fix.
- **Action:** fix after merge, apply A, because the branch does not touch this test.
