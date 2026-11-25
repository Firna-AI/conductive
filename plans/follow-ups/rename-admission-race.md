# A rename can lose the build that moves its folder

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 1, finding 2, and review round 2, finding 7.
- **Location:** `worker/lifecycle/image-build-start.ts` (`admitImageBuild`), `worker/lifecycle/org-image-refresh-data.ts` (`staleImageOrgs`), `worker/lifecycle/settings-data.ts` (`repositoriesWithSavedValues`), `worker/lifecycle/provider-switch-builds.ts` (`progressProviderSwitch`), `worker/lifecycle/image-schedule.ts` (`scheduleIdleImage`), `worker/lifecycle/provider-switch-control.ts` (`wakeProviderSwitch`), `docs/protocol/switch-account.md` (When the switch build starts).
- **Reason:** Both cases are rare, and their result is a state that new workspaces already handle.

- **Terms:**
  - **Org image:** the saved setup that each new workspace of an org starts from.
  - **Admission:** the step that picks the job kind, build or refresh, and records the inputs of the job.
- **Background:** Since 24 November 2026, a refresh copies each repository with its saved name and default branch, and keeps the folders of the org image. While the org image holds an old name and the newest build succeeded, admission turns each refresh into a build, so the folder moves to the new name at once. `admitImageBuild` first calls `imageHoldsOldValues`, and then reads the saved values in `repositoriesWithSavedValues`, in two separate queries.
- **Problem:** Any job that copies the saved name while it keeps the old folder clears the move. `staleImageOrgs` compares only the names and branches of the published capture, and no other record holds the move.
  - A rename that the Worker saves between the two queries of `admitImageBuild` gives a refresh that captures the new name. The refresh publishes it with the old folder. `staleImageOrgs` then finds no old value, so no build follows.
  - A provider account switch build also copies the saved names and keeps the folders. When a switch waits for the same job as a pending rename build, or for an active admin, a Lift, or a Restore, `progressProviderSwitch` starts the switch first, from `scheduleIdleImage`, `runImageAlarm`, or `wakeProviderSwitch`. The switch publishes the new name with the old folder on the new account, and the pending build is dropped. A change of only the default branch moves no folder, so it is not affected.
- **Impact if no action:** New workspaces keep the old folder name and variable until an admin selects Build computer. A script that already uses the new folder fails.
- **Root question:** How does a rename after a successful build always move the folder, whatever job copies the new name first?
- **Options:**
  - **A.** In `admitImageBuild`, read the saved values first. Pick a build when a mapped repository differs from the capture of the previous image and the newest build on the account succeeded. Keep the filters of `staleImageOrgs`, above all the install filter, by reusing its SQL condition. Add a regression test that saves a rename between the reads. Effort: Small.
  - **B.** Read the image, the saved values, and the newest build state in one statement at admission, and let the timer and push callers only request a refresh. Effort: Medium.
  - **C.** At the publish of a refresh that changed a name while the newest build succeeded, start an added build. Effort: Medium.
  - **D.** Count an org as stale while a saved name differs from the name in the capture of its newest successful build that is not a switch build. A refresh and a switch build only copy folders, so that build holds the names that named the folders. Job rows stay until purge. Keep the default-branch comparison with the published capture. Add a rule to `docs/protocol/switch-account.md` that a build follows a switch build that took in a new name. No migration. Covers both cases. Effort: Medium.
  - **E.** A stored folder-move record, written at the rename and cleared when a build publishes the move. Effort: Large.
- **Left out:** A switch that copies the old names fails its copy checks after a rename. A comparison of the published folder map with folders computed from the saved names starts a build in every org with legacy folders.
- **Recommendation:** D. The data already exists, so one query change keeps the move due on every path. A covers only admission.
- **Action:** fix after merge, apply D, because both cases are Rare and the severity is Medium.
