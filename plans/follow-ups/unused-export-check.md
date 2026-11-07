# Unused exports reach the merged code

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, from PR #23, branch `conductor/boat-native-remote-workspaces-milestone-15f`, the wider fix C of round 1 finding 9. The user sees it as item 112.
- **Location:** the complete gate in `package.json`.
- **Reason:** the fix adds a check to the gate and a dependency.

- **Background:** The `git-commit` skill asks each change to delete dead code. Reviews find unused items by name searches.
- **Problem:** Name searches miss some unused items. PR #23 left three unused device helpers, and the review's search missed one of them.
- **Impact if no action:** Dead code stays until a review happens to find it.
- **Root question:** How does the gate find an unused export, whatever its name?
- **Options:**
  - **A.** Change nothing. Reviews keep searching by name. Effort: Small.
  - **C.** Add an unused-export check, such as knip, to the complete gate. Effort: Small.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** PR #23 finding 9.
- **Recommendation:** A, until a second case shows that name searches miss more.
- **Action:** ask the user, because C adds a gate and a dependency.
