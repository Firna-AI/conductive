# Cancel of a menu dialog can lose its trigger

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, review finding 3.
- **Location:** `src/shell/settings/useRowRemoval.ts:88`, `src/shell/ui/Overlay.tsx:246`, `src/shell/ui/Menu.tsx:12`
- **Reason:** Only Safari 16.4 to 16.6, inside the Vite build target, leaves a pressed button without focus, so the fix rule defers this rare bug.

- **Terms:**
  - **Return target:** the element that takes the focus when a dialog closes. `Dialog` and `Sheet` take an optional `returnFocus`.
- **Background:**
  - A dialog gives the focus back to the element that had it when the dialog opened (`src/shell/ui/Overlay.tsx:230-249`).
  - That element is the menu trigger only when the trigger had the focus when the menu opened. A click on a `<button>` in Safari 16.4 to 16.6 gives it no focus.
  - The Remove question of the repository row menu places the focus only after a removal. On Cancel or Escape, `returnFocus` returns early.
  - Seven other menu items open a dialog with no return target: New section and New workspace in the section menu, Restart in the header state menu, a repository pick that needs a question, Stop in the service menu, a tool sheet in the phone composer menu, and the close question of the tab menu.
- **Problem:** After Cancel, the focus can go back to Edit or to another control, not to the More button of the row.
- **Impact if no action:** A keyboard user who returns after Cancel starts from the wrong control.
- **Root question:** How does a dialog that a menu item opens give the focus back to the menu trigger after Cancel?
- **Options:**
  - **A.** In `useRowRemoval.returnFocus`, focus the More button of the asked repository on Cancel and Escape too. Add a test that opens the menu with the focus on another control. Effort: Small.
  - **B.** Give `MenuAction` items of the shell menu kit the trigger as a return target, as the files row menu does with `opening.back()` (`src/files/panel/useRowMenu.tsx:56`), and use it for each menu item that opens a dialog. Effort: Medium.
- **Left out:** Focus each menu button on a pointer press: it changes unrelated pointer behaviour.
- **Wider fix:** B. One way covers each of the eight menu-to-dialog places.
- **Previous examples:** `MenuOpening.back` in `src/shell/list/row-menu.ts:8`. Commit `1be509bef` fixed focus loss in open menus.
- **Recommendation:** B. A fixes one of eight places. The repository pick question also loses its trigger in Chromium, because the pick replaces the menu button.
- **Action:** fix after merge, apply B, because the bug is rare and the wider fix reaches menus outside the diff.
