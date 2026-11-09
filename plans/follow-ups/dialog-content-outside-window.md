# Tall dialog content leaves the window

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, from `calummoore/user-preferences-screen`, review finding 4 and its second-pass check.
- **Location:** `docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css:6`, `docs/mockups/src/components/common/ConfirmDialog.module.css:2`, `src/shell/new-workspace/NewWorkspaceDialog.tsx:142`, and `src/shell/workspace/ArchiveDialog.tsx:162`.
- **Reason:** The shared fix reaches the existing Archive and confirmation dialogs outside the preference change.

- **Terms:**
  - **Dialog card:** The form or question shown over the dimmed desktop app.
  - **Frame:** The fixed-height app container, which clips content outside the window.
  - **Top layer:** The browser layer above page boxes, used by modal dialogs and popovers.
- **Background:** New workspace accepts a message and attached files. The message grows to fourteen lines. The file chips wrap into more rows. Archive lists the uncommitted files returned by `worker/app-api/archive.ts`.
- **Problem:** Neither the custom New workspace card nor the shared confirmation card has a height limit or a scroll area. The shared dialog layer centres the card. An oversized card spills above and below the frame, which hides that overflow.
  - In New workspace this is Rare. At desktop size `sm`, fourteen 18 px lines make a 252 px message field. The card is then about 352 px high. Each row of file chips adds about 32 px. The server sets no file-count cap. A notice adds more height.
  - The Mac app permits a 480 px-high window in `desktop/src/window.ts`. A full message with about four rows of files can clip the card there. A typical 800 px-high window needs dozens of attached files.
  - Archive has the same defect on main. Its list holds every uncommitted file. About twenty or more changed files can hide its title, Cancel, and Archive anyway. This gives the shared item its Common likelihood.
- **Impact if no action:** Users cannot reach clipped controls with the pointer. Escape still closes the dialog. Enter can create a workspace, and closing New workspace keeps its draft. Users can reopen the draft as the page.
- **Root question:** How should a desktop dialog keep all its content and controls reachable when the content is taller than the frame?
- **Options:**
  - **A.** Bound the New workspace card. Scroll its message, files, and notices while keeping the header and footer visible. Keep their menus outside the scroll area. Add a browser regression. This direct fix leaves Archive for separate work. Effort: Medium.
  - **B.** Add shared bounded modal-card layout parts. Use them for New workspace and the existing confirmation cards, including Archive. Keep menus outside the scrolling body. Add the browser regression. Effort: Medium.
  - **C.** Open the page when the form cannot fit vertically. This changes the saved-view rule and needs a user decision and protocol update. It does not fix Archive on its own. Effort: Medium.
  - **D.** Make the shared dialog layer scroll with safe centring. Every card in that layer stays reachable. Its header and footer scroll too. Move the chat scrim and outside-press handler to the layer. Exclude a press on the scrollbar from the outside-press check. Add the browser regression. Effort: Medium.
  - **E.** Apply A to New workspace and give the existing shared confirmation card a height limit and whole-card scrolling. No current shared card holds a menu. A later menu in one would be clipped until menus move to the top layer. Add the browser regression. Effort: Medium.
- **Left out:** Lowering the message line limit fails because files and notices can still overflow. A file-row cap also fails because notices can overflow at the minimum window height. Scrolling the whole app frame moves the rail, sidebar, and main area together. The browser top layer alone still needs scrolling content and must not clip menus.
- **Wider fix:** B. Shared card parts keep each modal body inside its available height.
- **Previous examples:** The command palette in `docs/mockups/src/components/palette/CommandPalette.module.css` bounds its card and scrolls its results. The phone sheet in `docs/mockups/src/components/common/Sheet.module.css` uses the same pattern. Archive is a second affected card.
- **Related:**
  - `plans/follow-ups/shared-menu-surface.md` moves desktop menus to the top layer. Until then, whole-card scrolling can clip menus in their triggers.
  - `plans/follow-ups/dialog-under-busy-menu.md` asks how dialogs and a busy menu interact. The bounded-card fix must work in the current frame layer and in the browser top layer. It does not depend on that answer.
  - `plans/follow-ups/mac-checks-for-shared-ui.md` records a gap in future CSS-only changes. A new regression under `desktop/tests/` already starts the existing Mac workflow.
- **Recommendation:** B. It keeps the controls and their menus reachable and covers both affected cards.
- **Action:** fix after merge, apply B.

The regression belongs in the existing Playwright suite under `desktop/tests/`, which builds the web app and serves the fake API. Use the 480 px minimum height, a fourteen-line draft, files, and a notice. Check that the repository picker and Create remain reachable. Cover the long Archive list through its existing journey. Do not add a new gate or cap accepted input to hide the defect.
