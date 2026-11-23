# Edit > Select All in the Mac app ignores code

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the branch `calummoore/selecting-code-context-jlro`, a check of review finding 9.
- **Location:** `desktop/src/menu.ts` (the Edit menu with `role: 'editMenu'`), `src/files/code/CodeBox.tsx`.
- **Reason:** The branch changed only the web view of a file tab, not the menu of the Mac app.

- **Terms:**
  - **Code box:** `CodeBox` of `src/files/code/CodeBox.tsx`, the focusable scroll region of the text view and the diff view of a file tab. Its key handler turns Cmd+A into a selection of the box only.
- **Background:** The Mac app builds its Edit menu with `role: 'editMenu'`, so Select All runs the native select-all command of the web view. Chromium sends a Cmd key press to the page before the menu, so Cmd+A reaches the code box handler. A choice of Edit > Select All with the pointer sends no key press. Nobody has checked this in a run.
- **Problem:** Edit > Select All with the pointer, after a click in the code, probably selects the whole app and not only the code.
- **Impact if no action:** A member who uses the menu gets the whole page in place of the code.
- **Root question:** Should the menu's Select All act as Cmd+A does in a file tab?
- **Options:**
  - **A.** Check it in the Mac app first. If the whole app is selected, make the menu item send the page a select-all event that the code box handles. Effort: Small.
  - **B.** Change nothing, because the keys work. Effort: Small.
  - **C.** Listen for the `selectall` command in the page, and scope it to the focused code box. Effort: Small.
- **Left out:** A custom menu item for each view, because the menu cannot know the focused view.
- **Wider fix:** C. The page then handles select all from each source the same way.
- **Previous examples:** None found.
- **Recommendation:** A. It confirms the problem before it changes the menu.
- **Action:** fix after merge, apply A, because the problem is not yet seen in a run.
