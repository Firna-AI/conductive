# A new shell keeps the old branch variables

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the review of the branch `calummoore/perth-siol` (PR #423).
- **Location:** `worker/lifecycle/repository-change-commands.ts` (the settle command), and the Continue publication on `origin/main`.
- **Reason:** Continue on `origin/main` has the same gap, so one fix should cover both actions.

- **Terms:**
  - **Settle command:** the command that the Worker runs in the cloud computer after a branch or repository change is stored.
- **Background:** Each cloud computer gets the variables `CONDUCTIVE_REPOSITORY_DIR`, `CONDUCTIVE_DEFAULT_BRANCH`, and `CONDUCTIVE_WORKSPACE_BRANCH` at its create and at each resume. After a repository change, the settle command sets only `CONDUCTIVE_REPOSITORY_DIR` for new terminal shells. Continue sets none of them.
- **Problem:** A new terminal shell after a change or a Continue keeps the default branch and the workspace branch of the old task until the next start.
- **Impact if no action:** A script in the terminal that reads these variables uses the wrong branch.
- **Root question:** How does a new terminal shell get the current branch variables after a change or a Continue?
- **Options:**
  - **A.** Set all three variables in the global tmux environment in the settle step of both actions. Effort: Small.
- **Left out:** A restart of the terminal service, because it shows Reconnect in each open terminal tab.
- **Wider fix:** A, in one shared helper that both actions call.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/repository-folder-record-refresh.md` has the same cause for the current folder and the folder variables of new shells after a repository change. Its option F keeps one cloud computer state that new shells read, and that state can also hold the branch variables. One branch can fix both items.
- **Recommendation:** A. It fixes both actions with one helper.
- **Action:** fix after merge, apply A, because the gap is on `origin/main` too.
