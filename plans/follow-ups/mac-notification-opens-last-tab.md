# Mac notification opens the last tab

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/finding-old-actions-oc8k`.
- **Location:** `desktop/src/device/notification.ts` lines 28-35, `src/app/router.ts` lines 247-253.
- **Reason:** The branch changes the chat and the tab row of the web app, and this fix changes the Mac app.

- **Terms:**
  - **Mac command request:** an agent asks to run a command on the Mac of the sender of the turn. The Mac app on that Mac answers it.
  - **Session address:** the address `/orgs/<org>/workspaces/<workspace>/sessions/<session>`, which shows that session. `src/shared/session-link.ts` builds it.
- **Background:** When the Mac app is in the background, a macOS notification tells of a Mac command request. A click opens the workspace address with `sessionId` and `deviceRequestId` in the query. Commit `cbd9c0790` added the two parameters.
- **Problem:** No code reads the two parameters. The router reads a session only from the path. So the click shows the tab that showed last in that workspace, which is not always the session of the request. The comment of `workspaceDeviceAddress` says that the notification "opens the pending request".
- **Impact if no action:** A member who clicks the notification can land on another tab. The needs-input mark of the session tab then shows which tab to open, as "The needs-input mark" in `docs/protocol/tab-row.md` says.
- **Root question:** Where does a click on the notification of a Mac command request take the member?
- **Options:**
  - **A.** Build the session address of the request in `workspaceDeviceAddress`, and drop the two parameters. Older Mac apps keep the old address, which still opens the workspace. Effort: Small.
  - **B.** Keep the address, and teach the router to open the session from `sessionId`. Risk: a query parameter that changes the shown tab is a new rule of the address. Effort: Small.
  - **C.** Change nothing in the code, and correct the comment. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. The session address is already the one way to open a session.
- **Previous examples:** None found.
- **Recommendation:** A. It uses the address that already shows a session, and it needs no new rule.
- **Action:** fix after merge, apply A, because it changes the Mac app, outside the files of this branch.
