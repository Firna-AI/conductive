# Recorded keys lose to a later default key

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from branch `calummoore/milan-hmhx`, review item 3.
- **Location:** `src/app/shortcuts/defaults.ts`, the `toggle-sidebar` entry. `src/app/shortcuts/keymap.ts`, `buildShortcutKeymap`. `src/app/shortcuts/decision.ts`, the match of a press. `docs/protocol/keyboard-shortcuts.md`.
- **Reason:** The fix adds a rule for stored keys that no requirement covers, so the user chooses it.

- **Terms:**
  - **Stored change:** the keys that a person recorded for one command on one keyboard, which the account keeps.
  - **Keymap:** the keys of each command on one keyboard. `buildShortcutKeymap` builds it from the default keys and the stored changes.
  - **Default key:** a key that the app gives a command before the person changes anything, from `defaultShortcutKeys` in `src/app/shortcuts/defaults.ts`.
- **Background:**
  - Before 2026-11-16, Hide or show the sidebar had no default key on Windows and Linux. The branch `calummoore/milan-hmhx` gave it Ctrl+B and [ there (list popover decision 5 A).
  - The keymap starts from the default keys, and replaces only the keys of a command that has a stored change. So a key that a person recorded for another command can now belong to two commands.
  - A press runs the first offered command whose keys match, in the order of the command list. Hide or show the sidebar comes before most commands.
  - The Mac keyboard is safe: the command held ⌘B and [ there before, and the conflict check of the Keyboard shortcuts tab covered them.
  - The fast mode change of PR #349 added the default keys ⇧⌘E and Ctrl+Shift+E after the shortcuts shipped, with the same gap.
- **Problem:** A key that a Windows or Linux person recorded before 2026-11-16, such as Ctrl+B for Hide or show the right column, now hides the sidebar instead. The Keyboard shortcuts tab shows the key on both rows, without a conflict line.
- **Impact if no action:** That person's key runs another command on each page with a sidebar. They must find the cause and record the key again.
- **Root question:** How does a key that a person recorded keep its command when a later change gives the same key to another command as a default?
- **Options:**
  - **A.** Keep the collision. Name it as a breaking change in the pull request, and add a Risk line to `docs/protocol/keyboard-shortcuts-keys.md`. Effort: Small.
  - **B.** Give Hide or show the sidebar no default key on Windows and Linux, as before. It reverses part of list popover decision 5 A. Effort: Small.
  - **C.** A recorded key wins. `buildShortcutKeymap` takes each key of a stored change out of the default keys of every other command on that keyboard. Add the rule to `docs/protocol/keyboard-shortcuts.md`, and add a keymap test and a mounted test with a stored Ctrl+B for the right column. Effort: Medium.
  - **D.** A one-time migration of account data. For each account whose Windows and Linux changes hold Ctrl+B or [, store a change for Hide or show the sidebar without those keys. Each later default key needs its own migration. Effort: Medium.
- **Left out:** A conflict line on two rows that share a key. C is better on every point, because it keeps the person's choice without a step by the person.
- **Wider fix:** C. It is a rule of the keymap, so no later default key can take a recorded key.
- **Recommendation:** C. It keeps each recorded key on the command that the person chose, now and for each later default key.
- **Action:** ask the user, because C adds a new rule that a recorded key wins over a later default, and no requirement covers it.
