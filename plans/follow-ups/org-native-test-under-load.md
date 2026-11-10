# An org image test failed once under load

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the check of finding 2 of review round 1 on branch `calummoore/user-preferences-screen`.
- **Updated:** 2026-11-09, during the complete gate on branch `calummoore/terminal-prompt-path-shortening`.
- **Location:** `worker/operator/org-native.test.ts`, the case "fails a queued native image build of another starter without allocating a computer".
- **Reason:** the branch does not touch the org image code or its tests.

- **Terms:**
  - **Full Worker suite:** every Worker test, which `npm run test` runs with a local D1 database and fake GitHub and Boat servers.
- **Background:** A review check ran two full Worker suites at the same time on a machine with 4 CPUs. The case above failed once in that run. Vitest hit the time limit of the run before it printed the failure text, so that run has no failure text. The case then passed 3 runs alone and 2 later full runs, one after the other. The case does not touch the account code of that branch. On 2026-11-09, one complete gate on a machine with 3 available CPUs failed the same case. No other test run ran beside that gate. The terminal-prompt change does not touch the org image code or this test.
- **Problem:** The case can fail during a normal complete gate. A native alarm cancellation preceded the new failed assertion. The exact cause is not known.
- **Failure text:** `AssertionError: expected { …(20) } to match object { Object (state, phase, ...) }` at `worker/operator/org-native.test.ts:161`. The expected result was `{ phase: 'done', sandboxId: null, state: 'failed' }`. The result was `{ phase: 'create', sandboxId: null, state: 'running' }`. The same case logged `NOSENTRY SQLite alarm handler canceled with requestScheduledAlarm.`.
- **Rerun:** `npm run test -- worker/operator/org-native.test.ts -t 'fails a queued native image build of another starter without allocating a computer'` exited 0. The selected case passed. The name filter skipped the other 6 cases. The complete gate had 1,829 passing tests and this one failure.
- **Suspected source:** Native alarm delivery or cancellation during runtime restart can leave the build transition unfinished when the test reads it. This is not confirmed.
- **Impact if no action:** The complete gate, `npm run check`, can fail now and then on a busy CI machine, and an agent can spend time on a failure that the change did not cause.
- **Root question:** Does this case fail under normal gate load, and why?
- **Options:**
  - **A.** Reproduce the failure in one full suite. Check native alarm delivery during runtime restart. Then fix the cause with deterministic event order or a readiness signal, under the flaky-test rule of the `testing` skill. Effort: Medium.
  - **B.** Watch the CI runs of the next branches, and act only when the case fails there. Effort: Small.
- **Left out:** A longer time limit for the case, because the `testing` skill does not allow a raised time limit as a fix for a flaky test.
- **Wider fix:** None. The follow-up item `plans/follow-ups/harness-test-speed.md` already holds the speed work of the Worker harness tests.
- **Previous examples:** `plans/follow-ups/start-time-limit-test-under-load.md`, another Worker test that can time out under load.
- **Related:** `plans/follow-ups/start-time-limit-test-under-load.md`, the same class: a Worker test that fails when the machine is busy.
- **Recommendation:** A. The captured failure narrows the investigation to the build transition after runtime restart.
- **Action:** fix after merge, apply A, because the branch does not touch this test.
