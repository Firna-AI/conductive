# A base rename leaves an omitted diff failed

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, review finding 100 of round 8.
- **Location:** `crates/cnd-runner/src/reports/refreshes.rs:67`, `worker/files/content.ts:78`, and `src/files/model/files-sync.ts:207`.
- **Reason:** It is a Rare Medium product bug that Try again recovers, so it is not fixed in the last fix round of the change that found it.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** See the header.
- **Terms:**
  - **Omitted path:** A changed file that the limited Changes list leaves out. A new runner lists at most 1,000 changed files.
  - **Base branch:** The branch that Changes compares with. The runner reads it from the Git setting `branch.<name>.gh-merge-base`, and the Worker asks for the branch of its stored Changes report.
- **Background:** The runner refreshes the open diff of an omitted path after the base commit changes (`docs/protocol/file-reports.md:178`). The Worker refuses a diff reply that names another branch than the stored Changes report, with HTTP 502 `file_unavailable` (`worker/files/content.ts:78`). The app reads again only the paths of the old and the new Changes list (`src/files/model/files-sync.ts:207`).
- **Problem:** Two product moves change the base branch name at the same merge base: a rename of the default branch, and the move to the default branch after GitHub deletes a merged base. An open diff of an omitted path that reads between the Git change and the new Changes report gets HTTP 502. The base commit did not change, so the runner sends no refresh, and the new Changes report does not name the path.
- **Impact if no action:** The diff tab shows "This diff didn't open" until the member presses Try again.
- **Root question:** How does each open diff of an omitted file end on the current comparison after the base branch or the merge base changes?
- **Options:**
  - **A.** Treat a change of the base branch name like a change of the base commit in the refresh rule. Effort: Small.
  - **B.** Build the comparison value of the refresh plan from the output of `comparison_base` at `crates/cnd-runner/src/repository/service.rs:112`, which the diff read also uses. Refresh the omitted paths when that value changes. Update `docs/protocol/file-reports.md:178`. Add a regression that checks a refresh in the same scan as the new Changes report. Effort: Medium.
  - **C.** Let the Worker also accept a diff reply that names the workspace base in D1. This relaxes a check that commit `c41f62825` kept, so it needs the user. Effort: Small.
- **Left out:** A fix only in the app, because older Mac apps bundle their own web app.
- **Wider fix:** B. A new input to the comparison then reaches the refresh plan with no second change.
- **Previous examples:** Commit `c41f62825` fixed diffs that used the wrong base after a default-branch rename.
- **Related:** None.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the bug is Rare and Medium and Try again recovers it.
