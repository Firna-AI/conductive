# A press on a dialog dim drags the Mac window

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, review round 2, outside its scope.
- **Location:** `src/shell/mac/menu-drag.ts`.
- **Reason:** The code that stops the drag regions predates the Settings branch, and it covers every dialog, not only Settings.

- **Terms:**
  - **Drag region:** a part of the window of the Mac app with the style `-webkit-app-region: drag`, such as the top bar of a page. A press there moves the window.
- **Background:** `menu-drag.ts` turns off the drag regions while a menu is open, so a press on a menu over a top bar does not move the window. A dialog dims the whole window, also the top bar under it. Settings is such a dialog, and a press on its dim closes it.
- **Problem:** A press on the dim over a top bar moves the window instead of closing the dialog.
- **Impact if no action:** A person who presses the dim at the top of the window to close a dialog moves the window.
- **Root question:** What does a press on the dim of a dialog do over a drag region?
- **Options:**
  - **A.** Turn off the drag regions while any modal layer is open, with the same mechanism as menus, from `OpenLayers` in `src/shell/ui/layers.ts`. Effort: Small.
  - **B.** Give the dim of each dialog the style `-webkit-app-region: no-drag`. Each dialog must repeat it. Effort: Small.
- **Left out:** Keep the drag: the dim then has two meanings at one place.
- **Wider fix:** A.
- **Previous examples:** `menu-drag.ts` already does A for menus.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the Settings branch.
