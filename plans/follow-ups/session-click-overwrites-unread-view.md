# A session click can overwrite the saved view

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the options check of the plan `plans/move-tabs-by-drag.md`, branch `calummoore/tab-drag-and-drop`.
- **Location:** `src/chat/state/session-actions.ts:27`, `selectSession`. `src/chat/state/sessions.ts:43`, `viewShowing`. `src/chat/state/load.ts:54`, the view read. `src/chat/state/context.ts:114`, `viewWriter`.
- **Reason:** The defect needs a failed read of the view, and the change that found it does not touch this path.

- **Terms:**
  - **Saved view:** the open tabs in one order, the active tab, the list of the Files panel, and the tool of one user in one workspace. The Worker keeps it, through the route of `src/shared/workspace-view.ts`.
- **Background:**
  - The chat reads the saved view with `orNull(api.view())` in `src/chat/state/load.ts`. A failed read leaves the view of the chat snapshot at null, and the chat still loads.
  - `selectSession` in `src/chat/state/session-actions.ts` runs at each click on a session tab. It calls `viewShowing(snapshot.view, sessionId)`. With a null view, `viewShowing` in `src/chat/state/sessions.ts` starts from a default view: no tabs, the "all" list, and the terminal tool. It then adds the tab of the session.
  - `selectSession` then saves that view through `context.saveView`, the `viewWriter` of `src/chat/state/context.ts`. The writer sends each view that it gets. It does not check that the load read the view.
  - Two other writers guard this case. `saveView` in `src/shell/workspace/saved-view.ts` writes nothing until the chat knows the view. `updateView` in `src/chat/state/session-actions.ts` changes nothing while the view is null.
- **Problem:** After a failed read of the view, one click on a session tab replaces the saved view on the server with a default view. The open file tabs, their order, the list, and the tool are lost.
- **Impact if no action:** A short failure of one read can erase the tabs that the user arranged, on every device of that user.
- **Root question:** How does the chat save the view only when it knows the saved view?
- **Options:**
  - **A.** In `selectSession`, show the session but save no view while the view of the snapshot is null, as `updateView` does. Add a controller test with a failed view read. Effort: Small.
  - **B.** Make the view writer of the chat send nothing until the load has read the view, so that each caller gets the guard. The writer then needs the load state. Add the same controller test. Effort: Small.
- **Left out:**
  - Read the view again before the save, because a second failure would still overwrite it.
  - A merge on the Worker, because the Worker cannot tell a default view from a view that the user emptied.
- **Wider fix:** B, because every path that saves the view then gets the guard.
- **Previous examples:** `saveView` in `src/shell/workspace/saved-view.ts` and `updateView` in `src/chat/state/session-actions.ts` already guard a view that the chat does not know.
- **Recommendation:** B. One guard in the one writer covers every path that saves the view.
- **Action:** fix after merge, apply B, because the change that found it does not touch this path, and the defect needs a failed read.
