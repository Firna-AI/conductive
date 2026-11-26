# Smoke-test branch starts on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-22, from the plan `plans/start-from-branch.md` of the branch `calummoore/delft-39rk`, which its pull request deleted.
- **Location:** None.
- **Reason:** The task needs the merged change on the deployment at `conductive.build`.

- **Terms:**
  - **Start branch:** the branch whose newest commit a new workspace branch starts from.
  - **Base branch:** the branch that the work of a workspace targets. Changes and diffs compare with it, and "Create PR" opens a pull request into it.
  - **Stack:** a pull request whose base is another branch that is not merged yet.
- **Background:**
  - New workspace has a branch control right of the repository picker. It shows the default branch until a member picks another branch.
  - Its dropdown has a "Start from" part with a search and the list, and for a picked branch a "Target" part with the picked branch and the default branch.
  - The closed control shows `→ main` while a picked branch targets the default branch.
  - After a merge, Continue builds on the branch that the pull request merged into, when GitHub still has it, else on the default branch.
  - When GitHub deletes a stored base, the base moves to the default branch, the cloud computer fetches it first, and the bar says that the base moved.
  - The local checks ran with fake GitHub and sandbox servers, and some native tests timed out on the slow disk of a workspace cloud computer.
- **Task:**
  1. In a test org with a test repository, create a branch `feature-x` with one commit, and open a pull request for it into `main`.
  2. In New workspace, pick `feature-x` and keep the target `feature-x`. Send a message that asks the agent to add one file and push.
  3. Check that the pull request bar names `feature-x` as the base, that Changes shows only the new file, and that "Create PR" opens a pull request into `feature-x`.
  4. Merge the pull request of `feature-x` into `main` on GitHub, with "Automatically delete head branches" on. Check that the bar of the workspace then says that the base moved to `main`, and that Changes still shows only the new file.
  5. Merge the workspace's pull request, press Continue, and check that the new branch starts from `main`.
  6. Start a second workspace from `feature-y` with the target `main`. Check that the closed control shows `→ main`, and that Changes also shows the commits of `feature-y`.
- **Impact if no action:** A defect that the fake servers hide reaches members without notice.
- **Needs:** The merged change on the deployment, a test org, and a test repository on GitHub.
- **Done when:** Each check of the task passes, or each failure has its own follow-up item.
