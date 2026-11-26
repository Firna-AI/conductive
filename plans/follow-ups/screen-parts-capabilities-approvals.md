# Screen parts doc lists approvals of every session

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/mac-permission-issue-o7fv`, the merge of `main`.
- **Location:** `src/shell/workspace/screen-parts.md`, the Capabilities lines near line 22.
- **Reason:** The same sentence is on `main`, so the fix belongs in a separate branch.

- **Background:** Since the change "show the approvals of this session only", the Capabilities control lists only the approvals of the open session.
- **Problem:** The screen parts doc still says that the control shows the session of each approval.
- **Impact if no action:** A reader of the doc expects a list that the app no longer shows.
- **Root question:** Does the doc describe what the control lists?
- **Options:**
  - **A.** Change the sentence to the approvals of the open session. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** None. The fix is one sentence, so it has two approaches.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
