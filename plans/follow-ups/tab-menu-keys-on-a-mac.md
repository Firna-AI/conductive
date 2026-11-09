# Check the keys of the tab menu on a Mac

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge follow-up of the plan of branch `calummoore/tab-drag-and-drop`.
- **Location:** None.
- **Reason:** The check needs a Mac, which the cloud workspace of the change did not have.

- **Terms:**
  - **Tab menu:** the menu of a tab of the tab row: Rename session, Move left, and Move right. It is the one way to rename a session.
- **Background:** A right click opens the tab menu. Shift and F10, or the Menu key, on a focused tab also opens it, through the tab's own key handler, on every system. A Mac keyboard has no Menu key, and on a laptop F10 needs Fn. Tests in happy-dom and a smoke test in Chrome on Linux checked the keys.
- **Task:** On a Mac, in Chrome, in Safari, and in the Mac app, focus a tab of the row with the keyboard, and press Shift and F10, with Fn on a laptop keyboard. Do it once more with VoiceOver on.
- **Impact if no action:** If a Mac browser keeps these keys, a Mac user with only a keyboard cannot rename a session or move a tab.
- **Needs:** A Mac with Chrome, Safari, and the Mac app, and the merged change.
- **Done when:** The tab menu opens in each of the three, with and without VoiceOver, or this item records where it does not and what opens it there.
