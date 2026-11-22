# Org deletion leaves build steps open

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the review of the branch `calummoore/record-step-times-for-builds-and-2nqj`.
- **Location:** `worker/members/deletion-data.ts:204`, `worker/members/composition-data.ts:41`
- **Reason:** These org deletion writers are outside the files of the branch that added the build step records.

- **Terms:**
  - **Build step records:** the `job_steps` rows of an org image build or refresh. `failBuild` in `worker/lifecycle/build-data.ts` closes the open step as `failed` in the batch that fails the build.
- **Background:**
  - An admin can delete an org. The app keeps its data for 7 days, and an admin can restore it in that time.
  - Two org deletion writers set a running build to `failed` with their own SQL, not with `failBuild`.
  - The org purge deletes the step records of the org after 7 days. The cron deletes every record after 90 days.
- **Problem:** these writers leave the open build step without an end. After a restore, that step stays open until the cron deletes it.
- **Impact if no action:** a query of step lengths sees a build step without an end, for an org that was deleted and restored.
- **Root question:** how does every writer that fails a build also close its steps?
- **Options:**
  - **A.** Add `failedBuildStepsStatement` from `worker/lifecycle/build-step-data.ts` to the batch of both writers. Effort: Small.
  - **B.** Give the build failure one shared statement list that every writer uses. Effort: Small.
- **Left out:** close open steps in the cron, because it gives the wrong end time.
- **Wider fix:** B. A new writer then cannot forget the steps.
- **Previous examples:** None found.
- **Recommendation:** B. It covers both writers and any later one.
- **Action:** fix after merge, apply B, because the problem is outside the scope of the branch that found it.
