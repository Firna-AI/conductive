# A long press opens the row menu in a read-only list

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the branch `calummoore/perth-5m3h`, which adds sub-workspaces. The `ui implementor` found it while it built the nested list.
- **Location:** `src/shell/list/WorkspaceRow.tsx` (the `onContextMenu` handler of a row), `src/shell/list/SectionList.tsx` (a read-only list gives its rows no drag binding), `docs/protocol/workspace-menu.md` (section "Opening and closing").
- **Reason:** The behaviour is older than the branch that found it, and it affects every row of a read-only list, not only the rows that the branch added.

- **Terms:**
  - **Read-only list:** the workspace list of a suspended org. Nothing in the org can change, so its rows have no drag binding, and their menu holds only Copy link.
  - **Row menu:** the menu of a workspace row, with Move to section, Reassign to, Rename, Copy link, and Archive, as the person may use them.
  - **Nested row:** a row that the list shows under the row of its parent workspace. Sub-workspaces show as nested rows.
- **Background:**
  - `docs/protocol/workspace-menu.md`, section "Opening and closing", says that a right click or Shift with F10 opens the row menu. It also says: "No row has a button for the menu, on any screen. A touch screen gets no other way to open it. A long press of a finger still only lifts the row for a drag. On a nested row, it does nothing."
  - In a list that can change, the drag binding of a row stops the browser's context menu event while a finger holds the row, so a long press only lifts the row.
  - A read-only list gives its rows no drag binding.
  - Chrome for Android sends a context menu event after a long press. The row handles that event as a right click, and it opens the row menu.
- **Problem:** In a read-only list, a long press of a finger opens the row menu, with Copy link. The protocol says that a touch screen gets no way to open the menu, and that a long press on a nested row does nothing.
- **Impact if no action:** A member of a suspended org on an Android phone can open Copy link by a long press. The app and its protocol disagree, but no data or work is at risk.
- **Root question:** What does a long press of a finger do on a row of a read-only list?
- **Options:**
  - **A.** Change the protocol: a long press on a row of a read-only list opens the row menu, as a right click does, because no drag can start there. Effort: Small.
  - **B.** Change the code: a row of a read-only list stops the context menu event of a touch, as the drag binding does in a list that can change. Effort: Small.
  - **C.** Give every list one touch rule in shared code: a context menu event that a touch starts never opens the row menu. Effort: Small.
- **Left out:** A menu button on touch screens. The user rejected a More button on each row, as the same protocol section says.
- **Wider fix:** C. It removes the case for every list, also for a list that a later change adds.
- **Previous examples:** None found.
- **Recommendation:** C. One rule for touches keeps every list in line with the protocol, which already says that a touch screen gets no way to open the menu. A changes that requirement, so it needs the user.
- **Action:** fix after merge, apply C, because the problem is older than the branch that found it and affects every row of a read-only list.
