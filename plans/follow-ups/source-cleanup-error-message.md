# A cleanup error hides the repository failure message

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 1, a new problem of the finding check.
- **Location:** `worker/lifecycle/image-build-failure.ts:84-87`, `worker/lifecycle/image-sources/materialize.ts` (the catch).
- **Reason:** `origin/main` has the same flow, so the branch did not cause it.

- **Background:** When the repository load of an image job fails, the build shows "The repositories could not load. Check the GitHub App access and try again." The materializer first cleans up the source access, then throws that error.
- **Problem:** When the cleanup itself throws a database error, the plain error reaches `handleImageBuildFailure`. The build then shows the general message "The cloud computer image could not build. Check the log and try again."
- **Impact if no action:** Admins read a general message and do not learn that the repository load failed.
- **Root question:** How does a failed repository load always show its own message?
- **Options:**
  - **A.** In `handleImageBuildFailure`, rebuild the repository failure from the saved `failure_step` of the source run when one exists, and use its message. This shares the read of `plans/follow-ups/image-source-warning-loses-step.md`. Effort: Small.
  - **B.** Make the cleanup rethrow the saved failure. Effort: Small.
- **Left out:** None.
- **Recommendation:** A, together with the item `image-source-warning-loses-step.md`.
- **Action:** fix after merge, apply A, because the defect is outside the scope of the branch that found it.
