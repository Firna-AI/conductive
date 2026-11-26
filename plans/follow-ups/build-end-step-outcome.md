# Build end steps take no saved outcome

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from the branch `calummoore/record-step-times-for-builds-and-2nqj`, review finding 13.
- **Location:** `worker/lifecycle/build-step-data.ts:64`, `worker/lifecycle/build-end-data.ts:43`
- **Reason:** The code behaves right today. Only the test that pins it is missing, and the two fix rounds of the branch were used.

- **Terms:**
  - **Build end batch:** `writeBuildEnd` in `worker/lifecycle/build-end-data.ts`. It writes the failure or the publish of a build in one D1 batch.
- **Background:**
  - After the final state update, the batch runs one of two statements. On a publish, `publishedBuildStepsStatement` closes the open steps as `done` only when the build is `succeeded`. On a failure, `failedBuildStepsStatement` closes them as `failed`.
  - A reviewer replaced the `state = 'succeeded'` check with a check that is always true, and all 15 related tests still passed.
- **Problem:** no test pins that the publish closes the steps only for a build that succeeded.
- **Impact if no action:** a later change could mark every step `done` for a publish that did not succeed, and no test would fail.
- **Root question:** how does the end of a build give each open step the outcome of the saved build result?
- **Options:**
  - **A.** Add a regression test: a publish whose final update does not take effect leaves the steps open. Effort: Small.
  - **B.** Replace the two end statements with one statement after the final update. It takes the outcome from the saved build state. Add the test of A. Effort: Small.
- **Left out:** a schema trigger, which is option C of `late-build-phase-opens-steps.md`.
- **Wider fix:** B.
- **Previous examples:** pull request #530.
- **Related:** `late-build-phase-opens-steps.md` changes the same batch.
- **Recommendation:** B. It removes the case, and the test pins it.
- **Action:** fix after merge, apply B, because the two fix rounds of the branch were used.
