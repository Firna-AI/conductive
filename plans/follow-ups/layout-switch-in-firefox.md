# Check the Linux layout switch in Firefox

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from `calummoore/keyboard-shortcuts-settings`, a post-merge task of its plan.
- **Location:** `src/app/shortcuts/layout-switch.ts` (`isLayoutSwitchKey`, `LayoutSwitchKeys`), `src/app/services.ts` (`windowKeys`), and "The layout switch" in `docs/protocol/keyboard-shortcuts-matching.md`
- **Reason:** No live run in Firefox happened before the merge. The branch's live check ran only in Chrome, and Firefox needs other automation.

- **Terms:**
  - **Layout switch key:** a key that switches the keyboard layout of the system, such as the second key of Alt+Shift with the Linux option `grp:alt_shift_toggle`. The browser reports its press as GroupNext, GroupPrevious, GroupFirst, or GroupLast.
- **Background:**
  - The Debian, Ubuntu, and Fedora installers turn on `grp:alt_shift_toggle` when a person picks two layouts, such as English and Russian. The modifier that goes down second then never becomes active, so Alt+Shift+1 arrives as Alt+1 or as Shift+1.
  - The user's answer to decision 197 (D, 2026-11-10): while a layout switch key is down, the app adds back the modifier that it took and matches the press by its physical key, when the result has Ctrl, Alt, or ⌘. So Alt+Shift+1 runs Open workspace 1, in either order of the modifiers.
  - A live check on 2026-11-10 ran Chrome on an X server with the us,ru keymap and `grp:alt_shift_toggle`. Chrome reported GroupNext, and Alt+Shift+1 opened workspace 1 in both orders without a switch of the browser tab.
  - Firefox's source maps the GTK layout switch keys to GroupNext and GroupPrevious (`widget/NativeKeyToDOMKeyName.h` in gecko-dev). Nobody ran it.
- **Task:**
  - On Linux, run `setxkbmap -layout us,ru -option grp:alt_shift_toggle`, or pick two layouts in the system settings.
  - Open the deployed app in Firefox, on an org page with at least one workspace.
  - Press Alt, then Shift, then 1. Then press Shift, then Alt, then 1.
  - Each time, check that the app opens workspace 1, that Firefox does not switch its tab, and that the key event of the second modifier has `key` GroupNext.
  - Type a word in the message field while you switch the layout, and check that no letter is lost.
- **Impact if no action:** If Firefox reports another key, its users with this layout switch get wrong commands, as before decision 197.
- **Needs:** A Linux desktop with Firefox and the deployed app after the merge.
- **Done when:** Both orders open workspace 1 in Firefox, or a fix pull request covers the key that Firefox reports.
