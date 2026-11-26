# Refresh the image when the default branch changes

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 1, finding 1 option D.
- **Location:** `worker/lifecycle/repository-change-builds.ts`, `worker/lifecycle/org-image-refresh-data.ts` (`markPendingPushRefresh`), `docs/protocol/org-image.md` (the list of refresh triggers).
- **Reason:** It adds a refresh trigger that no requirement lists, so the user decides.

- **Terms:**
  - **Org image:** the saved setup that each new workspace of an org starts from.
  - **Refresh:** a job that fetches new commits into the org image. Since 24 November 2026 it copies each repository with its saved name and default branch.
- **Background:** When GitHub changes the default branch of a repository, the Worker saves the new branch. When the newest build of the org succeeded, the app starts a build at once. When the newest build failed, the app starts no build by itself (decision 12). The next refresh takes in the new branch, but a refresh starts only at a push to the default branch, at most once in 30 minutes, or at the daily timer.
- **Problem:** After a failed build, the org image keeps the old default branch until a push to the new branch or the daily refresh. A new workspace takes its default branch from the org image. When GitHub deleted the old branch, each start on the default branch fails with "The branch `main` is no longer on GitHub." for up to a day.
- **Impact if no action:** Members of an org with a failed newest build cannot start workspaces on the default branch for up to a day after a default branch change.
- **Root question:** When no build starts, how does the org image reach a new default branch soon after the change?
- **Options:**
  - **A.** Change nothing. The next push to the new branch or the daily timer refreshes. Effort: Small.
  - **B.** When the Worker saves a new default branch and the newest build failed, mark a refresh as due at once with `markPendingPushRefresh`, under its 30-minute limit. Add the trigger to `docs/protocol/org-image.md`. Effort: Medium.
- **Left out:** A build at the change after a failed build breaks decision 12.
- **Recommendation:** B. It ends the gap in minutes with the existing refresh limits.
- **Action:** ask the user, because the option adds a refresh trigger that no requirement covers.
