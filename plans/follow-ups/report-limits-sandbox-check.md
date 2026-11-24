# Check the report limits in a live sandbox

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the post-merge task of the runner file report limits plan.
- **Location:** None.
- **Reason:** The check needs the deployed Worker and a sandbox whose cloud computer software has its normal update to the new runner.

- **Terms:**
  - **Report limits:** New cloud computer software reports at most 50,000 file tree entries and 1,000 changed files, with the counts of what it leaves out (`docs/protocol/file-reports.md`).
- **Background:** The change limits the file tree and changes reports of new runners, keeps the omitted totals in the Worker, and shows them in the Files panel. Older runners keep complete lists until their normal update. Tests and one-time measurements covered the change before the merge, with a synthetic large branch.
- **Task:** In a workspace whose cloud computer runs the new runner, use a branch with more than 50,000 tree entries and more than 1,000 changed files.
  - Confirm that All files lists 50,000 entries and shows the notice with the number left out.
  - Confirm that the Changes tab and summary count the whole change, and that its notice gives the number of files left out.
  - Reconnect the cloud computer, and confirm that both notices stay with the same counts.
  - Open a file and a diff of a path that the lists leave out, through a direct file address, and confirm that both read.
- **Impact if no action:** A defect that only a real large repository shows can stay unseen until a member meets it.
- **Needs:** The merged change deployed, and a sandbox after its normal runner update.
- **Done when:** Each step above passes in a live sandbox, or a new follow-up item records a failure.
