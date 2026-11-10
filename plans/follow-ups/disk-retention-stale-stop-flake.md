# The disk retention stale-stop test failed once

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/betterstack-implementation-brainstorm`, its complete gate on the merge of `main` at commit `3b1c40fb`.
- **Location:** `worker/lifecycle/disk-retention.test.ts:13` (the case) and `:84-86` (the last stop count), `worker/lifecycle/backend-test-platform.ts:69-73` (the `advance` helper), and `worker/lifecycle/lifecycle-boat-test-support.ts:131-133` (the stop record of the fake provider).
- **Reason:** The test file is unchanged from `main`, and the case passed in each focused rerun below, so the branch has no reproduction to work from.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Disk retention restart:** near day 14 of a stop, the app starts the stopped sandbox briefly and stops it again, so that Boat keeps its disk.
  - **Stale stop:** a stop request from an earlier lifecycle step that reaches the provider after a user open made it obsolete.
  - **Native object:** the production `Workspace` Durable Object, which the lifecycle tests run in Miniflare, with native storage and a native alarm.
  - **`advance()`:** a test helper in `worker/lifecycle/backend-test-platform.ts`. It reads the stored native alarm, moves the fake clock to it, and runs the due alarms.
  - **`LifecycleBoat`:** the fake provider of the lifecycle tests. Its `stopIds` list gets the sandbox ID of each stop request, also of a refused one.
- **Background:**
  - The case "keeps a stopped disk through startup and stop failures without a stale stop after user open" starts at `worker/lifecycle/disk-retention.test.ts:13`. It uses one completed workspace with the sandbox `bx_1`:
    - After the runner connects and disconnects, the case confirms a stop of `bx_1` at `TEST_TIME`.
    - It moves the fake clock 13 days on, by 1,123,200,000 ms. The disk retention restart then resumes `bx_1`.
    - It makes the retention startup script fail. The retention phase becomes `stop`, with the error "The startup script failed during disk retention."
    - It makes the provider refuse each stop, and calls `advance()` once. The phase stays `stop`.
    - It clears both faults, and the user resumes the workspace. The retention record is gone. The lifecycle state is `ready`, with a `resume` start and a `null` `nextDiskKeepaliveAt`.
    - It saves the length of `boat.stopIds`, calls `advance()` once more, and expects the same length. It also expects no deleted sandbox.
  - That last check is the "no stale stop after user open" of the case name.
  - "Stop and resume" in `docs/protocol/workspace-life.md` holds the requirements. Opening a stopped workspace resumes its sandbox. A sandbox stops after 30 minutes without user activity.
  - The same section requires the disk retention restart near day 14 of a stop.
  - `keepWorkspaceDisk` in `worker/lifecycle/disk-retention.ts` runs the resume, startup, and stop phases of that restart. Its progress keeps a failure while the stop cleanup retries.
  - `stopRetention` in `worker/lifecycle/retention-stop.ts` saves the stop request of an attempt before it contacts the provider.
  - `WorkspaceAlarms` in `worker/features/alarms.ts` is the one scheduler of the object alarm. Each owner of a timed task stores its own due time there.
  - `worker/lifecycle/tests.md` says that the fixture and the native object share one fake clock, with `TEST_TIME` as the future origin of native alarms.
  - The same guide says that an alarm near zero is already due on the real runtime clock. So such an alarm can run before a manual test advance.
  - `advance()` in `worker/lifecycle/backend-test-platform.ts:69-73` moves to the later of the fake time and the stored alarm. `advanceTo` then runs the stored due alarms in time order, through the production `Workspace.alarm` dispatcher.
  - `LifecycleBoat` in `worker/lifecycle/lifecycle-boat-test-support.ts:131-133` adds the ID to `stopIds` before it checks `failStop`. So the saved length also counts the refused stop.
  - The test file is the same on `main` and on the branch: blob `98609454` at commit `3b1c40fb` and at `main` commit `4426f1cc`. The branch also leaves `backend-test-platform.ts`, `lifecycle-boat-test-support.ts`, and `backend-test-hooks.ts` unchanged.
  - The error reporting change of the branch edits retention and alarm modules, such as `worker/lifecycle/disk-retention.ts`, `worker/lifecycle/retention-command.ts`, `worker/lifecycle/retention-stop.ts`, and `worker/lifecycle/workspace-alarm.ts`.
  - That change also wraps background and scheduled callbacks for its reports. After the failed gate, the branch made those wrappers start each callback synchronously, as `main` does.
  - That timing change kept the behaviour of `main`. It did not target this failure, and no run shows that it removes this failure.
- **Problem:** The case failed once in a complete gate. After the user open, the last `advance()` gave one more stop request than the case allows. The cause is not known. No run shows whether the extra stop comes from product code or from the order in which the test runs native work.
- **Failure text:** the complete gate, `npm run check`, printed this on 10 November 2026:

  ```text
  FAIL  worker/lifecycle/disk-retention.test.ts > keeps a stopped disk through startup and stop failures without a stale stop after user open
  AssertionError: expected [ 'bx_1', 'bx_1', 'bx_1' ] to have a length of 2 but got 3
   ❯ worker/lifecycle/disk-retention.test.ts:86:26
  ```

  - So the saved length was 2, and the list then held three `bx_1` entries.
  - The gate ran 2,012 tests in 702 files. 2,009 passed and 3 failed. The case took 2,038 ms. The machine had 4 CPUs and 8 GB of memory.
  - On stderr, the case printed only the warning `workspace_title_unconfigured`: "The workspace title request was skipped: Workers AI is not configured." The gate log holds no alarm message.
  - The other two failures were in `worker/features/workspace-links.test.ts`, which expected HTTP 200 and got 500, and in `worker/chat/attachment-proof-recovery.test.ts`, which expected a rejected drain. Both came from defects of the branch, which the branch corrected.
- **Reruns:** each run used `npm run test --` with the named files and a JSON reporter. The runs came in this order:
  - A separate copy of `main` ran the three files that failed in the gate. Both cases of this file passed. That run ran at the same time as the next one.
  - The branch ran the same three files before any correction. This case passed. The other two files failed with their branch defects.
  - The branch ran the same three files after its corrections, which include the synchronous callback start. All five tests passed.
  - A related group of 21 files, which includes this file, passed all 57 tests.
  - Ten separate runs of the three original failing files passed all five tests each: 50 passes, zero failures or skips.
  - The final reporter form passed 59 affected tests across 21 files. No direct retention assertion or behavior changed for this observation.
  - The case took about 5,000 ms in the two runs that ran at the same time, 1,627 ms after the corrections, and 2,461 ms in the related group.
- **Suspected source:** the order of native alarm and callback work after the failed disk retention restart ends and the user resumes. That order includes the step that cancels a stale stop. This is not confirmed.
- **Impact if no action:** The complete gate can fail now and then with no change to this code, and an agent can spend time on it. If the extra stop is real product behaviour, a user who opens a workspace after a failed disk retention restart can see its sandbox stop again.
- **Root question:** How does the case show, in every run, that a user open after a failed disk retention restart gets no stale stop?
- **Options:**
  - **A.** Find the source with the existing case, the fake clock, and explicit readiness signals. Then fix it where it is: in product code when the user open does not cancel the stale stop, or in the case when only the test gives that order. Keep every assertion. Effort: Medium.
  - **B.** Change nothing now. Watch the later complete gates and CI runs, and act only when the case fails again. Effort: Small.
- **Left out:**
  - A retry, a repeat, a sleep, a longer time limit, a skip, or a quarantine: the flaky-test rule of the `testing` skill forbids them, and they can hide a real stale stop.
  - A looser or removed stop-count check: it drops the check that the case name states. The `testing` skill needs the user's approval for it.
  - The synchronous callback start as the fix: no run shows that it removes the failure, because the case also passed before it.
  - Fewer parallel workers in the gate: no evidence ties the failure to load, and every gate gets slower.
  - A new stress run or check in the gate: it adds a gate, which the user decides.
- **Wider fix:** None yet. The class is not known until A names the source.
- **Previous examples:**
  - [the completed native fixture follow-up](https://github.com/Firna-AI/remote-code/blob/ca047b8f6ec03a2d8d10c7542932d289b9027a9f/plans/follow-ups/tests-fail-under-load.md): the consolidated observations include another native object test that failed after a native alarm cancellation. Its cause is not confirmed either.
  - `plans/follow-ups/tests-time-out-under-machine-load.md`: on 10 November 2026, on another branch, the other case of this file timed out at 15,000 ms under load. That case is "ends failed maintenance and refuses destructive resume of a normal errored workspace". It failed by time limit, not by a stop count.
- **Related:**
  - [the completed native fixture follow-up](https://github.com/Firna-AI/remote-code/blob/ca047b8f6ec03a2d8d10c7542932d289b9027a9f/plans/follow-ups/tests-fail-under-load.md): a possible shared cause in native alarm delivery or cancellation. Main fixed the native drain and alarm admission races in `49422f36`. That fix does not prove the source of this stale-stop observation.
  - `plans/follow-ups/tests-time-out-under-machine-load.md`: the same test file. This item does not cover that time limit failure.
- **Recommendation:** A. It follows the flaky-test rule of the `testing` skill, and it tells a real stale stop apart from a test order. B costs less now, but it can leave a real stale stop unseen.
- **Action:** fix after merge, apply A, because the branch does not change this test and has no reproduction of the failure.

Steps for the branch that applies A:

1. Repeat the case alone, its file, and a complete gate. Record the pass counts under `.context/`.
2. After the user resume, and before the last `advance()`, read the alarm owners through the native storage API. Record which owner holds the stored alarm, and its due time.
3. Record each stop request of `LifecycleBoat` with the lifecycle step that sent it.
4. Hold the work at explicit points to try each possible order. Use a delayed reply of `LifecycleBoat`, or a native storage hook with entered and release signals, as `worker/lifecycle/tests.md` describes. Keep the fake clock.
5. Run the same reproduction on `main` commit `4426f1cc`, before the error reporting change. This shows whether that change can give the extra stop.
6. When an order sends a stop after the user open in product code, first add a case that fails on that order. Then fix the product, so that the user open cancels the stale stop.
7. When only the test gives that order, make the case wait for an explicit readiness signal before it saves the stop count.
8. Keep every assertion of both cases. Add no retry, repeat, sleep, longer time limit, skip, or quarantine.
9. When no run reproduces the failure, or the source stays unknown, stop and ask the user. Give the pass counts and the alarm records.
