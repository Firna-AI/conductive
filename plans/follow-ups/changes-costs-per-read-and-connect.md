# Changes reads and connects cost the whole list

- **Severity:** Low. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-27, from branch `calummoore/changes-list-deltas-aedi`, the costs that its plan leaves out.
- **Location:** `worker/files/list-reads.ts`, `worker/files/bucket-read.ts`, `crates/cnd-runner/src/reports/handler.rs`, and `src/files/panel/ChangeList.tsx`.
- **Reason:** The changes deltas change covers the cost of each edit only, and these costs come with each read, connect, or draw.

- **Terms:**
  - **Changes delta:** the event `changes.changed`, an update of the branch changes list with only the rows that change, as `docs/protocol/changes-deltas.md` says.
- **Background:** Since changes deltas, one edit costs a current tab about 0.5 KB at 5,000 listed rows, in place of about 590 KB. The measurement of 27 November 2026 in the local Worker harness gave 11 storage row changes per edit at both 1,000 and 5,000 rows. Three costs still grow with the list. Each Files read of the changes list returns the complete list. The runner sends a full changes list after each connect, in parts of at most 256 KiB, and the Worker joins them. The Changes panel draws every row, with no virtual list.
- **Problem:** A later change that raises or removes `FILE_CHANGES_REPORT_MAX_FILES` makes each of these three costs grow with it. At 5,000 rows a full list is about 590 KB.
- **Impact if no action:** A higher limit keeps a large cost for each new tab, each reconnect, and each draw of the Changes panel.
- **Root question:** How do a new tab, a reconnect, and the Changes panel get the changes list at a cost that does not grow with its size?
- **Options:**
  - **A.** Draw the Changes panel as a virtual list, so only the visible rows mount. Effort: Medium.
  - **B.** As A, and give the changes read pages, so a tab reads the rows that it shows first. Effort: Large.
  - **C.** As B, and make the runner send a delta after a reconnect of the same stream when the Worker confirms the revision that it holds. Effort: Large.
- **Left out:** A lower limit. It undoes the goal of the changes deltas change, which is to let a later change raise the limit.
- **Wider fix:** C, because it bounds each of the three costs.
- **Previous examples:** `plans/follow-ups/large-changed-folder-first-draw.md`, the same drawing cost in All files.
- **Related:**
  - `plans/follow-ups/large-changed-folder-first-draw.md`, the same cause in the tree. One virtual list component can serve both panels.
  - `plans/follow-ups/diff-read-loads-whole-changes-list.md`, the same cause in the diff read. Each diff read loads the whole saved list only to take its base branch. That item removes this read cost.
- **Recommendation:** A. It removes the cost that a member feels most, and B and C wait for a higher limit.
- **Action:** fix after merge, apply A, because the current limit keeps these costs bounded until a later change raises it.
