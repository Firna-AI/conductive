# A new palette query can keep its row hidden

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, a problem outside the scope that the check of finding 9 of review round 2 found by reading the code.
- **Location:** `src/shell/palette/PaletteList.tsx:97`, `src/shell/palette/PalettePanel.tsx:71-74` and `:106-109`.
- **Reason:** the palette is older than the branch, which changes none of its files.

- **Background:** The command palette scrolls a row into view only when that row becomes highlighted. The list of `@` in the composer had the same defect, and the branch fixed it with a new list for each query, through a key.
- **Problem:** After a scroll, a new query that keeps the same first row leaves that row hidden, and Enter runs it.
- **Impact if no action:** A person can run a palette row that is out of view.
- **Root question:** How does each new query of the palette show the row that Enter runs?
- **Options:**
  - **A.** Give each query its own list, through a key, as the list of `@` does. Effort: Small.
  - **B.** Scroll the highlighted row into view when the query changes. Effort: Small.
- **Left out:** None.
- **Wider fix:** A.
- **Previous examples:** The list of `@` in `src/chat/components/chip-field/mention-plugins.tsx`.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch.
