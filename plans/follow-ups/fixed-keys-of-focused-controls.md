# A person can record the keys of a focused control

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from `calummoore/keyboard-shortcuts-settings`, review round 1, finding 2 (the wider fix, item 4), with findings 6 and 7 of round 2.
- **Location:** `src/shared/shortcut-fixed.ts` (`isFixedShortcut`, which the recorder and the Worker share), `src/shell/shortcuts/shortcut-listener.ts` (`focusOf`), and `docs/protocol/keyboard-shortcuts-keys.md` ("Fixed keys")
- **Reason:** The best fix adds a new rejection to the recorder and the Worker, and the repository rules let only the user add a rejection.

- **Terms:**
  - **Fixed key:** a key that no person can give to a command. The recorder of the Keyboard shortcuts tab refuses it, and the Worker rejects a save that holds it.
  - **Focused control:** a button, a link, a checkbox, a switch, or a menu item that has the keyboard focus. Enter presses or chooses it, and Space presses or toggles it.
  - **Shortcut listener:** the one listener of the app in `src/shell/shortcuts/`. It hears each key press first, and a key that runs a command goes no further.
- **Background:** The keyboard shortcuts protocol, `docs/protocol/keyboard-shortcuts.md`, says that a shortcut never takes a key that the terminal or a text field uses, from the user's requirement of 2026-11-10. Plain Enter and Shift+Enter are fixed keys today. A text field keeps every Enter key, also with a modifier and from the keypad: the message field sends on ⌘Enter, Ctrl+Enter, and Alt+Enter. Enter with a modifier, the keypad Enter (stored as `NumpadEnter`), and plain Space are not fixed keys.
- **Problem:** A person can record these keys for a command. On a focused button, checkbox, switch, or menu item, the listener then runs the command and stops the press, so the control does not act. A recorded ⌘Enter also means two things: outside a text field it runs the command, and in the message field it sends the draft, so a person who presses it while writing sends an unfinished message.
- **Impact if no action:** A keyboard user who records one of these keys loses the key that presses or chooses a focused control, and can send an unfinished message.
- **Root question:** Can a person give a key that presses or chooses a focused control, such as Enter with a modifier, the keypad Enter, or plain Space, to a command, and where does that key then run?
- **Options:**
  - **A.** Change nothing. A text field keeps the Enter keys, and a focused control loses them. Effort: Small.
  - **B.** Make these keys fixed keys, with one rule in `isFixedShortcut`: Enter and the keypad Enter with any modifier, and plain Space, on both keyboards. The recorder says "Space is a fixed shortcut.", the Worker rejects them, and the account reply drops a stored one. Add a fixed row, such as "Press the focused button", in `src/shell/account/shortcuts/fixed-rows.ts` and in `docs/mockups/src/fixtures/fixedShortcuts.ts`, a line under "Fixed keys", and recorder, Worker, and reader tests. Effort: Medium.
  - **C.** Keep the keys of a focused control at dispatch, by their logical key, in the focus model of the listener: a focused button, link, switch, or menu item keeps Enter, Shift+Enter, and plain Space, also from the keypad; an open menu and a focused divider keep their arrows, Home, and End, also from the keypad with Num Lock off. A recorded key still runs on the rest of the page. Add a line under "Where a key goes", and a test with a real button and a real menu item. Effort: Small.
  - **D.** B and C together. Effort: Medium.
- **Left out:** Changing the send key to plain Enter, because people send with ⌘Enter and Ctrl+Enter today. The command runs and the control acts too, because a key that runs a command goes no further.
- **Wider fix:** D. B gives each key one meaning, and C also covers keypad twins that B does not list.
- **Previous examples:** Plain Enter is a fixed key, because it sends and adds a line in every composer. Decision 193 D of the keyboard shortcuts plan made the keys of a focused row and divider fixed.
- **Recommendation:** B. Each key then has one meaning, and the recorder tells the person at once. If the user refuses a new rejection, C protects the controls without one.
- **Action:** ask the user, because B adds a new rejection to the recorder and the Worker.
