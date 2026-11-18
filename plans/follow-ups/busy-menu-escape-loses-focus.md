# Escape on a busy shell menu loses the focus

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from the fix of review finding 4 on branch `calummoore/bern-mapm` (fast mode).
- **Location:** `src/shell/ui/ModelPicker.tsx` (the trigger), `src/shell/ui/Menu.tsx` (`MenuButton`).
- **Reason:** The problem was there before the fast mode branch, and its fix touches the trigger of every shell menu.

- **Terms:**
  - **Busy menu:** a shell menu whose save runs. Its trigger is off, and its rows ignore a press.
  - **Trigger:** the button that opens a menu, such as the Model and effort picker on the Preferences tab.
- **Background:**
  - The Preferences tab saves Model and effort at once. While the save runs, the picker trigger is off.
  - The trigger is a `@firna/ui` `Button`. When it is off, it renders an HTML `<button disabled>`.
  - A press on Fast keeps the menu open during the save, as `docs/protocol/fast-mode.md` says.
- **Problem:** When Escape closes the menu during the save, the focus cannot go back to the trigger, because a disabled button cannot take the focus. The focus goes to the page body.
- **Impact if no action:** A keyboard user loses their place on the page after a rare Escape during a save.
- **Root question:** Where does the focus go when a menu closes while its trigger is busy?
- **Options:**
  - **A.** Give a busy trigger `aria-disabled` in place of the HTML `disabled` attribute, so it keeps the focus and ignores a press. Effort: Small.
  - **B.** Change nothing. Effort: Small.
  - **C.** Move the focus to the trigger when the save ends. Effort: Small.
- **Left out:** Keeping the menu open until the save ends. It traps the member in the menu for one round trip.
- **Wider fix:** A, in the shared trigger of `MenuButton`, so that every busy shell menu keeps the focus.
- **Previous examples:** None found.
- **Recommendation:** A. It matches the busy rows, which already use `aria-disabled`.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the fast mode branch.
