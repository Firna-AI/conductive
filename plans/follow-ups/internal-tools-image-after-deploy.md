# Check the Internal Tools image after the deploy

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, the post-merge tasks of its plan.
- **Location:** None.
- **Reason:** The task needs the deployed change and the production logs.

- **Terms:**
  - **Org image:** the saved setup that each new workspace of an org starts from.
  - **`image_build_failed`:** the Worker warning of a failed image job. In the `sources` phase it holds `sourceStep` and `githubStatus`.
- **Background:** The org "Internal Tools" failed every build and refresh from 18 November 2026. The repository `bowser` moved on GitHub from `futex-ai` to `Firna-AI`, and each refresh copied the old name. The fix makes a refresh copy the saved name, and it adds `sourceStep` and `githubStatus` to the warning. A build on 24 November 2026 with the current six repositories also failed in the `sources` phase, about 5 seconds after "Updating the repositories.", for an unknown cause. The org now chooses only `Firna-AI/skills`. Its image still holds the ten removed repositories, and a refresh copies them too.
- **Task:**
  - Ask an admin of "Internal Tools" to select Try again on the Cloud computer tab. When it fails, read the `image_build_failed` warning in the Worker logs, and fix the cause that `sourceStep` and `githubStatus` name.
  - Read the result of the next automatic refresh of the org. When one repository of the image fails it, raise again the option "a refresh keeps the copy of the image for each repository that it cannot copy, refreshes the others, and logs each kept repository".
- **Impact if no action:** The org can stay without a good image, and new workspaces get old commits.
- **Needs:** The deployed change, read access to the Worker logs, and an admin of "Internal Tools".
- **Done when:** The org has a good build or refresh after the deploy, or the cause of its failure is recorded.
