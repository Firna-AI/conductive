# A late build phase write opens steps

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from the branch `calummoore/record-step-times-for-builds-and-2nqj`, review finding 12.
- **Location:** `worker/lifecycle/job-steps.ts:51`, `worker/lifecycle/build-phase-data.ts:21`
- **Reason:** The race needs a scheduling failure during an alarm step, and it changes only operator records.

- **Terms:**
  - **Build step records:** the `job_steps` rows of an org image build or refresh. `openBuildStepStatement` opens a step in the D1 batch of each phase change.
- **Background:**
  - Pull request #548 lets an alarm step that already runs save a later phase after a scheduling failure ended the build. `worker/lifecycle/image-cleanup-race.test.ts` covers this race.
  - The build failure closes the open steps as `failed`.
  - `openBuildStepStatement` does not check the build state.
- **Problem:** the late phase write then opens `phase:sources` and `computer:boot` on the failed build, and no writer closes them.
- **Impact if no action:** step-length queries see open steps on a failed build, until the cron deletes them after 90 days.
- **Root question:** how does a build step never begin after its build ended?
- **Options:**
  - **A.** Add `AND b.state = 'running'` to `openBuildStepStatement`, with a check in the race test. Effort: Small.
  - **B.** Close the leftover steps when cleanup sets the job to `done`. Effort: Small.
  - **C.** Do A, and add a migration trigger that closes the steps when the build state leaves `running`. Effort: Medium.
- **Left out:** make the phase write check the build state, because that changes the cleanup rule of #548.
- **Wider fix:** A.
- **Previous examples:** pull requests #521, #530, and #548.
- **Related:** `build-end-step-outcome.md` changes the same end batch.
- **Recommendation:** A. One check in the shared statement removes the case.
- **Action:** fix after merge, apply A, because the race is rare and changes only operator records.
