# A person can record the Enter keys of a field

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from `calummoore/keyboard-shortcuts-settings`, review round 1, finding 2, the wider fix.
- **Location:** `src/shared/shortcut-fixed.ts` (`isFixedShortcut`, which the recorder and the Worker share) and `docs/protocol/keyboard-shortcuts-keys.md` ("Fixed keys")
- **Reason:** The fix adds a new rejection to the recorder and the Worker, and the repository rules let only the user add a rejection.

- **Terms:**
  - **Fixed key:** a key that no person can give to a command. The recorder of the Keyboard shortcuts tab refuses it, and the Worker rejects a save that holds it.
  - **Recorder:** the field of a row of the Keyboard shortcuts tab that waits for the next key, which then becomes a key of the command.
- **Background:** The keyboard shortcuts protocol, `docs/protocol/keyboard-shortcuts.md`, says that a key in a text field never runs a command when the field uses it, from the user's requirement of 2026-11-10 that the shortcuts must never take a key of the terminal or the message field. The message field sends on Enter, ⌘Enter, Ctrl+Enter, and Alt+Enter, and adds a line with Shift. The rename field saves on Enter with any modifier. Plain Enter is a fixed key today. Enter with a modifier, and the keypad Enter, are not.
- **Problem:** A person can record ⌘Enter or Ctrl+Enter for a command. The review fix keeps these keys with a focused text field, so the field still sends. But the key then means two things: outside a text field it runs the command, and in the message field it sends the draft. A person who presses their key while they write sends an unfinished message to the agent. A recorded plain keypad Enter also takes the Enter of a focused menu or button.
- **Impact if no action:** A person who records an Enter key can send an unfinished message, and a focused menu or button can lose its Enter.
- **Root question:** Can a person give an Enter key to a command at all?
- **Options:**
  - **A.** Change nothing more. The text field keeps every Enter key, as the review fix does, and the key runs its command elsewhere. Effort: Small.
  - **B.** Make every Enter key a fixed key, with one rule on the key name in `isFixedShortcut`: Enter and the keypad Enter with any modifiers, on both keyboards. The recorder says "⌘Enter is a fixed shortcut.", and the Worker drops a stored key of this kind from the account reply. Add recorder and Worker tests, and a line under "Fixed keys". Effort: Small.
  - **C.** Keep A, and show a line on the row when a person records an Enter key with a modifier, such as "In a text field, ⌘Enter sends.", with a protocol line and a mockup state. Effort: Medium.
- **Left out:** Changing the send key to plain Enter, because people send with ⌘Enter and Ctrl+Enter today, and the user requirement protects the message field.
- **Wider fix:** B. One rule keeps every Enter key out of every keymap, so no text field, menu, or button can lose an Enter key.
- **Previous examples:** Plain Enter is already a fixed key, because it sends and adds a line in every composer.
- **Recommendation:** B. Each Enter key then has one meaning, and the recorder tells the person at once.
- **Action:** ask the user, because B adds a new rejection to the recorder and the Worker.
