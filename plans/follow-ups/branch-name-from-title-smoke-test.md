# Check the branch from a title on the deployed app

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from the post-merge follow-up of the branch-name change on the branch `calummoore/riga-aumm`.
- **Location:** `worker/lifecycle/workspace-branch.ts`, `worker/lifecycle/start-command-execution.ts`, `worker/chat/workspace-titles.ts`, and `migrations/202611161200_workspace_branch_names.sql`.
- **Reason:** The check needs the deployed Worker, the applied migration, and a real title model and cloud computer.

- **Terms:**
  - **Placeholder branch:** the branch name that the Worker makes at a create, such as `calummoore/lisbon-7k2q`: the GitHub login of the owner, a city, and four random characters.
  - **Branch step:** the start step that runs `git checkout -b` in the cloud computer.
- **Background:** The user chose on 16 November 2026 that a new workspace branch takes the workspace name when the name comes before the branch step. The branch keeps its login and its four random characters, such as `calummoore/saved-carts-7k2q`. After the branch step, a name never changes the branch. The user also chose on the same day that Continue names its new branch after the workspace name, with a version and new random characters, such as `calummoore/saved-carts-v2-7k2q`. [The branch and the name](../../docs/protocol/create-a-workspace.md#the-branch-and-the-name) and [The base and the new branch](../../docs/protocol/continue.md#the-base-and-the-new-branch) state the rules. The tests use a fake title model and a fake cloud computer, so they do not show the real timing of the title and the branch step.
- **Task:** Deploy the Worker. Create a workspace with a clear first message. Open the pull request bar and run `git branch --show-current` in Terminal. Push a commit. After its pull request merges, select Continue.
- **Impact if no action:** A real start could create the branch before the title comes in most creates. New branches would then keep the city name, and nobody would notice.
- **Needs:** The deployed change, a signed-in member with an agent login, and a repository that the member may push to.
- **Done when:** The workspace shows its title within seconds. The pull request bar, Terminal, and GitHub show the branch with the name part of the title, such as `<login>/saved-carts-7k2q`. A later Rename leaves the branch as it is. Continue gives `<login>/<name part>-v2-<four characters>`.
