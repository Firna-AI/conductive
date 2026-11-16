# Check Long runs on the test deployment

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from branch `calummoore/riga-9ags`, the Long runs change.
- **Location:** `worker/operator/overview.ts`, `src/shell/operator/LongRuns.tsx`, `migrations/202611160900_workspace_running_since.sql`.
- **Reason:** The check needs the deployed change and its D1 migration on `conductive.build`.

- **Terms:**
  - **Long runs:** the list on the Overview tab of the operator section at `/operator`. It shows the 10 running workspaces whose cloud computers have run the longest since their last start.
  - **`running_since`:** the column of the `workspaces` table that holds the start time of the current run, in Unix milliseconds.
- **Background:** The state save of a workspace writes `running_since` from the start time that the workspace Durable Object keeps. A workspace that already runs at the deploy gets its time at its next state save. That save comes within 5 minutes during an agent turn, and within 30 minutes otherwise. The state save skips the workspaces of a deleted org.
- **Task:**
  - Open `/operator` as an operator about 30 minutes after the deploy.
  - Check that each running workspace shows in Long runs, with a run length that matches the time since its last start.
  - Stop one workspace and refresh. Check that it leaves the list.
- **Impact if no action:** A fault in the migration or the state save goes unseen until an operator needs the list.
- **Needs:** The merged change deployed to `conductive.build`, and an operator account.
- **Done when:** The list shows the running workspaces with correct run lengths, and a stopped workspace leaves it.
