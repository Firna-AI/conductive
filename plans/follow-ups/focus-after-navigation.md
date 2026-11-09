# Focus lands on the page after a move

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from the check of finding 1 of review round 1 on branch `calummoore/user-preferences-screen`.
- **Location:** `src/shell/new-workspace/useNewWorkspaceForm.ts:77`, `src/shell/new-workspace/NewWorkspaceScreen.tsx:108`, and `src/shell/workspace/ChatArea.tsx:41`.
- **Reason:** `origin/main` behaves the same, and a rule for every move changes screens that the branch did not touch.

- **Terms:**
  - **Move:** a change of the address of the web app, which shows another screen, such as after Send on the New workspace page.
  - **Main area:** the `main` element in `src/shell/layout/DesktopLayers.tsx`. It holds the screen in every desktop frame, including a page alone.
- **Background:** The web app moves to another screen after some actions: Send on the New workspace page opens the new workspace, and Connect on that page or in the chat opens the Account page with the Connect form. The control that the user pressed leaves the page with the old screen. The browser then puts the keyboard focus on the page body. The New workspace dialog was fixed in its own branch: when it closes because the address changed, the main area of the new screen takes the focus, as `docs/protocol/create-a-workspace.md` requires.
- **Problem:** After Send or Connect on the New workspace page, and after Connect in the chat, the focus is on the page body. A keyboard user must tab from the top of the page to reach the new screen. A screen reader announces no new place.
- **Impact if no action:** Keyboard and screen reader users lose their place after each such move, and the app treats the dialog and the page in different ways.
- **Root question:** Where does the keyboard focus go when an action opens another screen?
- **Options:**
  - **A.** Change nothing. The focus stays on the page body after these moves. Effort: Small.
  - **B.** Use the focus request of the New workspace dialog for these three actions too, so that the main area of the new screen takes the focus. It needs a test for each action. Effort: Small.
  - **C.** Every move of the app gives the focus to the main area of the new screen, also after a link in the list or a tab. It changes each screen of the app, and needs a requirement in a protocol doc. Effort: Medium.
- **Left out:** A focus target for each destination, such as the field of the Connect form, because each screen then needs its own code, and Back has no destination code.
- **Wider fix:** C. One rule then serves every action and every screen, also later ones.
- **Previous examples:** The New workspace dialog, fixed for review finding 1 of branch `calummoore/user-preferences-screen` on 8 November 2026.
- **Recommendation:** C. One rule for every move is easier to keep, and it covers the cases of B.
- **Action:** ask the user, because C changes how every screen takes the focus, a visible change that no requirement covers.
