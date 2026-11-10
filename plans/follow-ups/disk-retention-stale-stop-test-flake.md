# Disk retention test sees a stale stop

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the CI run of the pull request branch `calummoore/file-selector-list`, which changed no Worker file.
- **Location:** `worker/lifecycle/disk-retention.test.ts:13` and `:86`, and `backendPump` in `worker/lifecycle/backend-pump.test-support.ts:3`.
- **Reason:** the branch that saw the failure changed no lifecycle code or test, and the failure came once in CI.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Disk retention:** the lifecycle that keeps the disk of a stopped workspace, with a keepalive resume and a startup script, until a member opens the workspace again.
  - **Fake clock:** the backend fixture moves stored alarms through test time, and does not wait for wall-clock time.
- **Background:** The test `keeps a stopped disk through startup and stop failures without a stale stop after user open` in `worker/lifecycle/disk-retention.test.ts` drives a retention through a failed startup script and a failed stop. Then a member resumes the workspace with `resumeWorkspace`, inside `fixture.run`. At the end, the test counts the stops, advances the alarm once, and checks that no new stop came.
- **Problem:** On 10 November 2026, CI failed this test in run 42756364794, attempt 1, at commit `823d4c0`:

  ```text
  AssertionError: expected [ 'bx_1', 'bx_1', 'bx_1' ] to have a length of 2 but got 3
   ❯ worker/lifecycle/disk-retention.test.ts:86:26
  ```

  Line 86 is `expect(boat.stopIds).toHaveLength(stops)`, after `await actor.advance()`. So an alarm after the member's resume sent a stale stop. The same run also failed `worker/lifecycle/restore-watch.test.ts`, as `plans/follow-ups/restore-watch-test-flake.md` says. The complete gate passed on the same tree on a local machine. The CI of `main` at `ab58467`, which holds the same lifecycle code and tests, passed. The pull request run 42752590032 of the release branch `release-please--branches--main--components--remote-code`, which changed only version numbers, failed the same test with the same assertion on 10 November 2026. The rerun of the failed job, attempt 2, passed this test. It also passed locally in the complete gate on that tree, and alone on `main` at `ab58467`.
  A suspected source: `backendPump.run` in `worker/lifecycle/backend-pump.test-support.ts` moves the fake clock to each alarm that is due within 60 seconds while the operation of `fixture.run` runs. On a slow machine, the pump can then run a retention alarm during the resume, or move the clock past a deadline, so that the next `actor.advance()` sends a stop. This is not confirmed.
- **Impact if no action:** The complete gate can fail now and then on a slow CI runner, and a person must rerun it. If the stale stop is real, a member who opens a workspace during disk retention can see it stop again.
- **Root question:** Does a stale stop after a member opens a retained workspace come from the test fixture or from the lifecycle?
- **Options:**
  - **A.** Reproduce the failure with the full suite. Log the alarms that the pump runs during the resume. Make the pump or the test deterministic, and keep every assertion. Effort: Medium.
  - **B.** Do A, and when the stale stop comes from the lifecycle, fix the lifecycle so that a member's open always cancels a pending retention stop. Effort: Medium.
- **Left out:** A retry, a sleep, a skip, or a longer time limit, because the `testing` skill does not allow them without the user, and they hide the cause. Change nothing, because the failure can come from a real lifecycle defect.
- **Wider fix:** A, when the pump is the cause: a pump that advances no alarm while an operation runs removes this class of race from every lifecycle test.
- **Previous examples:** `plans/follow-ups/restore-watch-test-flake.md`, the same fixture and a similar early alarm. `plans/follow-ups/tests-time-out-under-machine-load.md` names another test of this file, which timed out under load.
- **Related:** `plans/follow-ups/restore-watch-test-flake.md` may have the same cause, the pump of `fixture.run`. One fix in the pump can close both.
- **Recommendation:** B. It finds the cause first, and it fixes the lifecycle when the defect is real.
- **Action:** fix after merge, apply B, because the branch that saw the failure changed no lifecycle code, and one fix in a separate branch reaches every open branch.
