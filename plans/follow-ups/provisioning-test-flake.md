# Provisioning test reads the status offset too early

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the CI run of the pull request branch `calummoore/file-selector-list`, which changed no Worker file.
- **Location:** `worker/lifecycle/provisioning.test.ts:11` and `:36`.
- **Reason:** the branch that saw the failure changed no lifecycle code or test, and the failure came once in CI.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Start job:** the steps of a workspace start that the workspace object runs one alarm at a time, such as the fetch of the repository. `actor.advance()` of the backend fixture runs one step.
  - **Status offset:** `stdoutOffset`, the count of output bytes of a sandbox command that the start job has read. The fake sandbox gives the output in chunks of `statusChunkSize` bytes.
- **Background:** The test `recovers an accepted create after its caller closes and the actor restarts` in `worker/lifecycle/provisioning.test.ts` creates a workspace, lets the caller leave, and runs the start job step by step. After four steps, it sets `statusChunkSize` to 4 and runs one more step. Then it expects the fetch phase with `stdoutOffset: 4`. Later it restarts the object and checks that the job still ends.
- **Problem:** On 10 November 2026, CI failed this test in run 42769094374 at commit `a7bdbd7`:

  ```text
  AssertionError: expected { workspaceId: 'lifecycle-1', …(20) } to match object { phase: 'fetch', processId: 1, …(1) }
  -   "stdoutOffset": 4,
  +   "stdoutOffset": 0,
   ❯ worker/lifecycle/provisioning.test.ts:36:31
  ```

  So after five steps, the job was in the fetch phase but had read no output yet. The test passed in the complete gate on the same tree on a local machine, and in the CI runs of the earlier commits of the same branch. The Worker code of that branch equals `main`.
  A suspected source: the test counts steps, and each `actor.advance()` runs the alarm that is due. When the create of the caller runs slower, as on a busy CI runner, one of the first four steps can find no due work, so the fifth step starts the fetch instead of reading its output. This is not confirmed.
- **Impact if no action:** The complete gate can fail now and then on a slow CI runner, and a person must rerun it.
- **Root question:** How does the test reach the fetch phase with one read of output, whatever the speed of the machine?
- **Options:**
  - **A.** Advance until the job reaches the fetch phase with a process, instead of a fixed count of steps, then read one chunk. Keep every assertion. Effort: Small.
  - **B.** Find why a step can run without due work, and make `actor.advance()` wait for the work that the create queues. Effort: Medium.
- **Left out:** A retry, a sleep, a skip, or a longer time limit, because the `testing` skill does not allow them without the user, and they hide the cause. Change nothing, because the gate then fails now and then.
- **Wider fix:** B, because the same step counts drive the other lifecycle tests of the backend fixture.
- **Previous examples:** `plans/follow-ups/disk-retention-stale-stop-test-flake.md` and `plans/follow-ups/restore-watch-test-flake.md`, two other lifecycle tests of the backend fixture that failed in CI of the same branch and passed on a rerun.
- **Related:** `plans/follow-ups/disk-retention-stale-stop-test-flake.md` and `plans/follow-ups/restore-watch-test-flake.md` may share a cause in the backend fixture. One fix in the fixture can close all three.
- **Recommendation:** B. It removes the dependence on machine speed for every test that counts steps.
- **Action:** fix after merge, apply B, because the branch that saw the failure changed no lifecycle code, and one fix in a separate branch reaches every open branch.
