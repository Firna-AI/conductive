# A rename during refresh admission skips its build

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 1, finding 2.
- **Location:** `worker/lifecycle/image-build-start.ts` (`admitImageBuild`), `worker/lifecycle/org-image-refresh-data.ts` (`staleImageOrgs`), `worker/lifecycle/settings-data.ts` (`repositoriesWithSavedValues`).
- **Reason:** The race needs a rename in one database round trip, and its result is a state that new workspaces already handle.

- **Terms:**
  - **Org image:** the saved setup that each new workspace of an org starts from.
  - **Admission:** the step that picks the job kind, build or refresh, and records the inputs of the job.
- **Background:** Since 24 November 2026, a refresh copies each repository with its saved name and default branch, and keeps the folders of the org image. While the org image holds an old name and the newest build succeeded, admission turns each refresh into a build, so the folder moves to the new name at once. `admitImageBuild` first calls `imageHoldsOldValues`, and then reads the saved values in `repositoriesWithSavedValues`, in two separate queries.
- **Problem:** A rename that the Worker saves between the two queries gives a refresh that captures the new name. The refresh publishes it with the old folder. `staleImageOrgs` then finds no old value, so no build follows to move the folder.
- **Impact if no action:** New workspaces keep the old folder name and variable until an admin selects Build computer. A script that already uses the new folder fails.
- **Root question:** How does a rename after a successful build always move the folder?
- **Options:**
  - **A.** In `admitImageBuild`, read the saved values first. Pick a build when a mapped repository differs from the capture of the previous image and the newest build on the account succeeded. Keep the filters of `staleImageOrgs`, above all the install filter, by reusing its SQL condition. Add a regression test that saves a rename between the reads. Effort: Small.
  - **B.** Read the image, the saved values, and the newest build state in one statement at admission, and let the timer and push callers only request a refresh. Effort: Medium.
  - **C.** At the publish of a refresh that changed a name while the newest build succeeded, start an added build. Effort: Medium.
- **Left out:** A stored folder-move record adds state for a rare race.
- **Recommendation:** A. The job kind and the capture then come from one read. One job runs at a time in each org, so the newest build state cannot change during admission. B adds no protection over A.
- **Action:** fix after merge, apply A, because the likelihood is Rare and the severity is Medium.
