# Smoke-test routines on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, the post-merge task of its plan.
- **Location:** None.
- **Reason:** The task needs the deployment at `conductive.build`, which a push to `main` updates.

- **Terms:**
  - **Routine:** a saved prompt that starts an agent run in a new workspace, on a schedule, on a GitHub pull request event, or with Run now. Each routine has its own page under Routines in the sidebar, with a Runs list.
  - **Trigger:** what starts a run: a schedule (Hourly, Daily, Weekdays, Weekly, or a custom cron with one minute), or a pull request event (opened, pushed, or merged).
- **Background:**
  - A Cron Trigger of the Worker scans the schedules each minute (`wrangler.jsonc`, `"* * * * *"`).
  - The GitHub App sends pull request events to the webhook route of the Worker. Only a pull request that a member of the org opened, from a branch of the repository itself, starts a run.
  - The local tests use fake GitHub and fake cloud computer servers, so only the deployment shows the real Cron Trigger, the real webhooks, and a real cloud computer.
- **Task:** On the deployment, create a routine with a Daily trigger, and see one run at its time. Use Run now, and see its run and its workspace. Add a "PR opened" trigger, open a pull request in the chosen repository, and see its run, with the link to the pull request in the Runs list.
- **Impact if no action:** A fault that only the real Cron Trigger, the real webhooks, or a real cloud computer shows stays hidden until a member meets it.
- **Needs:** The deployed change, a member account with Claude or Codex connected, and a repository where the GitHub App is installed.
- **Done when:** The three runs show in the Runs list with their workspaces, or each fault has its own follow-up item.
