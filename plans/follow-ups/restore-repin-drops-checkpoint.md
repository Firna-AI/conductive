# A repeated pin on Restore drops saved start facts

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, a new problem of the check of finding 5 of PR #70, branch `conductor/boat-native-remote-workspaces-milestone-8o`, round 2.
- **Location:** `worker/lifecycle/retry-creation-data.ts:72` and `:91`, and `worker/members/creation-checkpoint.ts:117`.
- **Reason:** the problem is outside the finding that its check read.

- **Background:** Milestone 8o keeps a workspace after a failed first start, and Try again starts it again. A Restore of a deleted org can run the pin of a retried create again.
- **Problem:** When the pin runs again on Restore, it drops a checkpoint failure that `creation-checkpoint.ts` sets, and it rewrites the saved repository folders from the newest image. Those folders can differ from the folders of the first start.
- **Impact if no action:** After a Restore, a retried start can lose its failure record or use other repository folders than the first start.
- **Root question:** How does a repeated pin keep the saved facts of the start?
- **Options:**
  - **A.** Make the pin keep an existing checkpoint failure and the saved repository folders when it runs again for the same attempt. Effort: Small.
- **Left out:** None.
- **Wider fix:** Option C of finding 5 of PR #70, which keeps the Try again intent out of the saved job.
- **Previous examples:** finding 5 of PR #70.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
