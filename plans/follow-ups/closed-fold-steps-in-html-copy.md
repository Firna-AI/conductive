# Select-all copies the steps of closed folds as HTML

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, a problem outside the scope that the check of finding 8 of review round 2 found in Chrome 157.
- **Location:** `src/chat/components/WorkFold.tsx:61-71`, `src/chat/components/MessageLine.tsx:78-90`.
- **Reason:** both files are older than the branch, which changes neither.

- **Background:** A closed work fold keeps its steps in the page, so a search in the page can open it. Each message line in a fold is a nested `<details>`.
- **Problem:** After a select-all, Chrome's native copy puts the steps of a closed work fold into its `text/html` data, while its `text/plain` data leaves them out.
- **Impact if no action:** A rich paste after a select-all can hold agent steps that the person did not see.
- **Root question:** How does a copy of the chat leave out the steps of a closed fold in every format?
- **Options:**
  - **A.** Draw the nested lines of a closed fold so that the browser does not select them, such as with `user-select: none` while the fold is closed. Effort: Small.
  - **B.** Draw the steps of a closed fold only while it is open, and keep a search in the page able to open it some other way. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None found.
- **Previous examples:** None found.
- **Recommendation:** A, after a check in Chrome that a search in the page still opens the fold.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch.
