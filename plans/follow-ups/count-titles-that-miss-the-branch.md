# Count titles that come after the branch step

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from branch `calummoore/cut-waits-in-workspace-start-and-resume-fvs3`.
- **Location:** `worker/lifecycle/start-command-execution.ts`, `docs/protocol/create-a-workspace.md`.
- **Reason:** The effect shows only on real creates after the change deploys.

- **Terms:**
  - **Placeholder branch:** the branch name with a city, such as `calummoore/lisbon-7k2q`, that a new workspace gets before it has a name.
- **Background:** When a workspace gets a name before the start creates its branch, the branch takes the name. A title that comes later names only the workspace, as `docs/protocol/create-a-workspace.md` says. Chaining the start steps makes the `branch` command start about 2–3 s sooner, so more titles can come too late and leave the placeholder branch. The rule allows this.
- **Task:** After the deploy, compare how many new workspaces keep a placeholder branch name while their workspace has a title, before and after the deploy.
- **Impact if no action:** A rise in placeholder branches stays unnoticed.
- **Needs:** The deployed change, and read access to production D1.
- **Done when:** A report to Cal gives both counts and says whether the rise needs a change.
