# Changes can compare with an old default branch

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/routines-feature-brainstorm`, a new problem of the options check of decisions 207 to 211 of the routines plan.
- **Location:** `worker/lifecycle/start-command.ts:33`, `runner/src/repository.ts:36-43` and `:99-108`, `runner/src/git.ts:66-74`, and `runner/src/git-index.ts:161`.
- **Reason:** The routines plan does not change how a normal workspace finds the base of Changes, and nobody has reproduced the case yet.

- **Terms:**
  - **Changes:** the list of files that a workspace branch changes against the default branch, which the agent runner reports to the workspace.
  - **Org image:** the saved snapshot that every new cloud computer of an org starts from. A build or a refresh updates the copy of each repository in it.
- **Background:**
  - A new workspace fetches the default branch of its repository in the fetch phase, then runs `git checkout -b <branch> FETCH_HEAD` at `worker/lifecycle/start-command.ts:33`. So the new branch starts at the newest commit of the default branch on GitHub.
  - The runner compares the branch with the default branch by name. `runner/src/git.ts:66-74` resolves `<name>^{commit}` with `git rev-parse`, and a local branch `refs/heads/<name>` wins over `refs/remotes/origin/<name>`.
  - The local default branch comes from the org image. A refresh updates the image at most once in 30 minutes after a push, and a daily timer refreshes it too.
  - `runner/src/git-index.ts:161` diffs with the resolved commit itself, not with a merge base.
- **Problem:** When commits reach the default branch after the last refresh of the image, a new workspace starts after them, but its local default branch stays before them. Changes then lists those commits as the work of the workspace. When the default branch moves on while a workspace works, Changes does not use a merge base, so the newer work of the default branch can show as reverted.
- **Impact if no action:** A member reads files that the workspace did not change, and can review or discard the wrong work.
- **Root question:** Which commit does Changes compare a workspace branch with?
- **Options:**
  - **A.** Compare with `refs/remotes/origin/<default branch>`, which the fetch phase updates, in place of the local branch. Effort: Small.
  - **B.** Compare with the merge base of the branch and `origin/<default branch>`, and fetch the default branch again before each full report. Effort: Medium.
  - **C.** Store the commit where each workspace branch starts, and compare with it. Decision 207 D of the routines plan proposes this base for every workspace. Effort: Medium.
- **Left out:** A reset of the local default branch at each start. It moves a branch that the agent or a member may use.
- **Wider fix:** B. It gives the right base after every later push to the default branch.
- **Previous examples:** None found.
- **Related:** Decision 207 of `plans/routines.md`, while that plan is open, asks how a pull request run shows only its own work. Its option D gives each workspace a stored base.
- **Recommendation:** B. A merge base is the base that GitHub uses for a pull request, so Changes then matches the pull request.
- **Action:** fix after merge, apply B, because the case needs a reproduction first, and the routines plan does not change normal workspaces. First confirm the case: create a workspace after a push to the default branch and before the next refresh of the image.
