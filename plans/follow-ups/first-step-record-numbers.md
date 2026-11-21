# Send the first step record numbers

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from the branch `calummoore/record-step-times-for-builds-and-2nqj`.
- **Location:** None
- **Reason:** The task needs the deployed change and real jobs that ran after the deploy.

- **Terms:**
  - **Job step records:** the D1 tables `job_steps` and `job_runs`. They hold the begin and the end of each step of each org image build, refresh, workspace create, and resume, and one row for each run of a start.
- **Background:**
  - On 18 November 2026 Cal chose these records so that the perf workspaces can prove each saving on real jobs.
  - Workspace 296, "Cut waits in workspace start and resume", and workspace 317, which looks for the cause of slow start timer runs, wait for these records. Workspace 296 will change the start loop and needs a "before" sample.
  - Agents read production D1 read-only, with `wrangler d1 execute conductive --remote --json --command "SELECT ..."`.
- **Task:**
  - After the deploy, query `job_steps` for one refresh and one create, and `job_runs` for the runs of that create.
  - Check that each step has a begin and an end, and that the run rows have counts and a slowest call.
  - Send the first numbers to workspaces 296 and 317.
- **Impact if no action:** the perf workspaces do not learn that the records exist, and a fault in the records stays hidden.
- **Needs:** the deployed change, and read-only access to production D1.
- **Done when:** both workspaces have the first numbers, or a fault in the records has its own follow-up item.
