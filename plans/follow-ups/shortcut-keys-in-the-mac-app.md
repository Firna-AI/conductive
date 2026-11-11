# Check the shortcut keys in the Mac app

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from `calummoore/keyboard-shortcuts-settings`, a post-merge task of its plan, with one check from the finding check of review round 3.
- **Location:** `desktop/src/menu.ts` (the menus of the Mac app), `src/shared/shortcut-fixed.ts` (the fixed keys), and `docs/protocol/keyboard-shortcuts.md` ("The Mac app")
- **Reason:** The check needs a Mac with the built Mac app, which the cloud machines of the branch do not have.

- **Terms:**
  - **Fixed key:** a key that no person can give to a command; the Keyboard shortcuts tab refuses it, and the Worker rejects a save that holds it.
- **Background:**
  - The page of the Mac app hears each key before the menus of the Mac app. A menu acts on a key only when the page leaves the key. So ⌘N, ⌘T, and ⌘W run the commands of the app, and ⌘R, a fixed key of the View menu, still reloads the page, as "The Mac app" in `docs/protocol/keyboard-shortcuts.md` says.
  - The keys of the menus of the Mac app are fixed keys on the Mac keyboard: ⌘Q, ⌘H, ⌥⌘H, ⌘M, ⌘R, ⇧⌘R, ⌘0, ⌘+, ⌘-, ⌃⌘F, and ⌥⌘I.
  - A keypad digit is a key of its own: the app records ⌘ with the keypad 0 as `Meta+Numpad0`, which is not a fixed key.
  - Nobody pressed these keys in the built Mac app, because the branch ran on Linux machines.
- **Task:**
  - In the Mac app, press ⌘N, ⌘T, and ⌘W on a workspace page. Each must run its command: New workspace, New session, and Close tab.
  - Press ⌘R. It must reload the page.
  - Press ⌘ with the keypad 0 after a zoom with ⌘+. Note whether the zoom resets, as ⌘0 does.
  - If ⌘ with the keypad 0 resets the zoom, a person can record it for a command, and the page then takes it from the View menu. Raise a decision for the user: make ⌘ with the keypad 0 a fixed key. It is a decision because it adds a rejection.
- **Impact if no action:** A wrong key route in the Mac app stays unseen until a person meets it.
- **Needs:** A Mac with the Mac app built from `main` after the merge.
- **Done when:** Each key does what the task says, or a fix pull request or a decision item records the difference.
