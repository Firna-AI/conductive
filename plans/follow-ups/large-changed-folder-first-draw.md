# A large changed folder freezes All files

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the Milestone 6 measurement of the runner file report limits plan.
- **Location:** `src/files/model/tree-rows.ts:110` and `src/files/panel/FileTree.tsx`.
- **Reason:** The freeze exists on `main` for complete trees too, and the report limits do not change it.

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Performance.
- **Location:** `src/files/model/tree-rows.ts:110` and `src/files/panel/FileTree.tsx`.
- **Terms:**
  - **All files:** The Files panel tab that shows the tree of the branch.
  - **Changed folder:** A folder that holds an added or changed entry at any depth.
- **Background:** All files opens every changed folder at first, so each change shows (`tree-rows.ts:110`). It draws every row of each open folder, with no virtual list. A new runner lists at most 50,000 entries, so one changed folder can still hold about 45,000 rows.
- **Problem:** A measurement drew All files in desktop Chromium 151 with production React, for a tree whose one changed folder held 45,000 files. The first frame came after 7.57 s (6.40 to 11.57 s) with a legacy report and after 8.22 s (7.08 to 10.77 s) with a limited report. Both mounted about 45,000 DOM rows. The evidence is in `.context/runner-file-report-limits/m6-costs/logs/browser.ndjson` of that workspace.
- **Impact if no action:** On a branch that changes a very large folder, the Files panel freezes for several seconds each time it mounts.
- **Root question:** How does All files show each change at first without drawing every row of a huge folder?
- **Options:**
  - **A.** Open a changed folder at first only when it holds at most a set number of entries, such as 1,000. A larger changed folder starts closed, and its change still shows its mark on the folder row. Effort: Small.
  - **B.** Draw All files as a virtual list, so only the visible rows mount. Effort: Medium.
  - **C.** Draw the first rows of a large folder and add a "Show more" row. Effort: Medium.
- **Left out:** A lower tree limit, because Cal chose 50,000 entries on 20 November 2026.
- **Wider fix:** B. Every large list then mounts only its visible rows.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** B, because it fixes the freeze for any large folder, also one that the member opens by hand.
- **Action:** ask the user, because A changes which folders open at first, a visible rule that the mockups draw, and B is new design work.
