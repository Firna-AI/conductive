# Read-only session click leaves a file shown

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the options check of the plan `plans/move-tabs-by-drag.md`, branch `calummoore/tab-drag-and-drop`.
- **Location:** `src/chat/state/archive-view.ts:70`, `showLocally`. `src/chat/state/controller.ts:208`, `select`. `src/shell/workspace/files/files-navigation.ts:78`, `useLeaveForSession`. `src/shell/workspace/files/chat-files.tsx:74`, `useChatFiles`.
- **Reason:** The defect needs a read-only workspace that is not archived, such as one in a suspended org, and the change that found it does not touch this path.

- **Terms:**
  - **Read-only workspace:** a workspace that takes no write: an archived workspace, or one whose org is suspended. Its chat changes the tabs in the browser only.
- **Background:**
  - On desktop, the chat shows a file or diff tab in place of the chat of a session while the address names that file. `useChatFiles` in `src/shell/workspace/files/chat-files.tsx` gives file tabs to every workspace that is not archived. So a workspace of a suspended org shows file tabs.
  - A click on a session tab calls `select` of the controller in `src/chat/state/controller.ts`. In a read-only workspace, `select` runs `showLocally` in `src/chat/state/archive-view.ts`. It changes `archiveTabs` and `activeSessionId`, but not `view.activeTab`.
  - `useLeaveForSession` in `src/shell/workspace/files/files-navigation.ts` sends the address back to the chat only when `view.activeTab` becomes a session while a file shows.
  - Evidence: a read of the code on 8 November 2026. Nobody ran the case in a browser yet.
- **Problem:** In a read-only workspace that is not archived, a click on a session tab while a file shows does nothing that the user sees. The file stays, and no session tab becomes the current one.
- **Impact if no action:** In a suspended org, a member who opens a file cannot go back to a chat with its tab. Back and the other links still work.
- **Root question:** How does a click on a session tab in a read-only workspace leave a shown file?
- **Options:**
  - **A.** Make `showLocally` also set `view.activeTab` to the session, in the browser copy of the view. `useLeaveForSession` then sends the address back to the chat. Add a mounted test in a suspended org. Effort: Small.
  - **B.** Make `useLeaveForSession` also follow `activeSessionId` of the chat. Add the same test. Effort: Small.
- **Left out:** Hide the file tabs in every read-only workspace, because a member of a suspended org can still read the files.
- **Wider fix:** A, because the browser copy of the view then names the shown tab in both modes, and every reader of `view.activeTab` follows it.
- **Previous examples:** None found.
- **Recommendation:** A. The view then shows the same active tab in a read-only workspace as in a workspace that takes writes.
- **Action:** fix after merge, apply A, because the change that found it does not touch this path, and the defect needs a read-only workspace that is not archived.
