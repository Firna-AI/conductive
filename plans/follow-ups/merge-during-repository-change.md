# A merge of the old pull request runs on during a change

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the branch `calummoore/perth-siol` (PR #423), review finding 10.
- **Location:** `worker/lifecycle/repository-change-admission.ts`, `worker/github/merge-jobs.ts`.
- **Reason:** No requirement covers this case yet, and the result on GitHub is correct, so it can wait for its own change.

- **Terms:**
  - **Repository change:** the action that moves a workspace to a new branch of another repository of the org, in the same cloud computer.
  - **Merge job:** the Worker job behind Merge in the pull request bar. It asks GitHub to merge the pull request of the workspace branch, then polls the result.
- **Background:**
  - A repository change refuses while a turn, Restart, Continue, or another change runs. It does not check for a running merge job, because the Worker stores no running state for a merge job.
  - When a member presses Merge and another member changes the repository at the same moment, GitHub still merges the old pull request. The workspace then follows the new branch.
- **Problem:** A later poll of that merge answers that the merge is not available, because the workspace no longer follows the old branch. The member who pressed Merge sees no result.
- **Impact if no action:** The merge on GitHub is correct, but the member who pressed Merge does not learn that it finished.
- **Root question:** What does a member who pressed Merge see when the workspace changes its repository before the merge result comes?
- **Options:**
  - **A.** Store a running state for each merge job, and refuse a repository change while one runs, with a reason. Effort: Small.
  - **B.** Keep the merge result by the old branch, so that the poll still answers after a change. Effort: Small.
- **Left out:** A cancel of the merge on GitHub, because GitHub has no cancel for a merge that started.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** B. It refuses nothing new, and the member who pressed Merge sees the result.
- **Action:** fix after merge, apply B, because no requirement covers the case and the GitHub result is already correct.
