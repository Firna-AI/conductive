# Members cannot change a parent in the app

- **Severity:** Medium. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from `calummoore/conductive-mcp-nested-agents-iet3`, the brainstorm decision on members in the app.
- **Location:** `src/shell/list/drop-target.ts:62`, `src/shell/list/useRowMenus.tsx:88`, and `docs/protocol/sub-workspaces.md`
- **Reason:** On 2026-11-17 the user chose to let only agents change a parent first, so the app design waits for its own change.

- **Terms:**
  - **Parent change:** a move that puts a workspace under another workspace, or takes it out of its tree to the top level. `docs/protocol/parent-changes.md` gives its rules.
  - **Nested row:** a row that the workspace list shows under the row of its parent workspace.
- **Background:** Agents make a parent change with the `move_workspace` tool, with `parentId` or `topLevel: true`, or with the CLI flags `--parent ID` and `--top-level`. The moved workspace takes every workspace under it, and the tool refuses a loop or a tree past depth 3. In the app, the sidebar drags only top-level rows, and a drop lands only between trees (`src/shell/list/drop-target.ts`). A nested row has no drag, no move by keys, and no Move to section (`src/shell/list/useRowMenus.tsx`). `docs/protocol/sub-workspaces.md` says that the app offers no way to change a parent.
- **Problem:** A member who sees a wrong tree must ask an agent to change it.
- **Impact if no action:** Members depend on agents for each parent change. No data is lost.
- **Root question:** How does a member change the parent of a workspace in the app?
- **Options:**
  - **A.** Change nothing. Members keep asking an agent. Effort: Small.
  - **B.** The row menu gets "Move under", with a list of the workspaces that can take the row, and "Move to top level". It works with a click and with keys. It needs new mockups under `app/sub-workspaces`, menu rules in `docs/protocol/workspace-menu.md`, and tests. Effort: Large.
  - **C.** A drag onto a row nests the dragged tree, and a drag of a nested row between trees takes it out. Keys for the same moves need their own choice, because Alt with Left and Right go back and forward in a browser. It needs a new drop model, new mockups, phone rules for a long press, and screen reader text. Effort: Large.
- **Left out:** None.
- **Wider fix:** None. This is one missing path, not a class of defect.
- **Previous examples:** `plans/follow-ups/workspace-move-without-drag.md` asks for a menu path for section moves without a drag.
- **Related:** `plans/follow-ups/workspace-move-without-drag.md`: option B here and option A there both add move items to the row menu, so one design can serve both.
- **Recommendation:** B. A menu works with a click, keys, and a phone, and it reuses the write of the tool.
- **Action:** ask the user, because the user chose to keep this out of the first change, and it needs mockups.
