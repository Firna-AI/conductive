# A keypad key is a key of its own

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from `calummoore/keyboard-shortcuts-settings`, review round 2, finding 8 and its wider fix, with the keypad cases of finding 7.
- **Location:** `src/app/shortcuts/keys.ts` (`shortcutFromPress`, `matchesShortcut`, `formatShortcut`), `src/app/shortcuts/keymap.ts` (the conflict check and Replace), and `src/shared/shortcut-fixed.ts` (`isFixedShortcut`)
- **Reason:** The best fix makes the recorder refuse the keypad twins of fixed keys, which is a new rejection that only the user can add.

- **Terms:**
  - **Recorder:** the field of a row of the Keyboard shortcuts tab that waits for the next key, which then becomes a key of the command.
  - **Keypad twin:** a key of the numeric keypad that types the same thing as another key, such as the keypad `/` and the main `/`, or the keypad 8, which reports ArrowUp with Num Lock off on Windows and Linux.
  - **Conflict line:** the line on a row that names another command that holds the recorded key, with Replace and Cancel.
- **Background:** The keyboard shortcuts protocol, `docs/protocol/keyboard-shortcuts-keys.md`, says that a key without ⌥ matches by the character that it types, and that a digit matches the key in the top row. The recorder stores each keypad key by its own name, such as `Meta+NumpadDivide` or `NumpadEnter`. The listener matches a keypad press both to that name and to the key that it types, such as `Meta+/`.
- **Problem:** Two different stored keys can match one press. The conflict check, Replace, Reset, and the fixed-key check compare the stored texts, so they miss these pairs. A recorded `Meta+NumpadDivide` on Stop the agent shows no conflict with Model picker's ⌘/, and the keypad press then runs Model picker. A recorded keypad 8 takes Up from an open menu with Num Lock off. The tab also shows such a key by its code name, such as "⌘NumpadDivide", while the protocol says that each key shows as its keyboard prints it.
- **Impact if no action:** A person can save a shortcut that never runs, that takes a fixed key of a menu or a divider, or that shows a code name.
- **Root question:** Is a keypad key a key of its own, or the key that it types?
- **Options:**
  - **A.** Keep the keypad keys as keys of their own, and teach the conflict check and Replace the known keypad twins, such as the keypad operators, Enter, and the arrows with Num Lock off. Show each keypad key with a readable name. No new rejection. Cost: the list must know what each keypad key types, which depends on the layout and on Num Lock. Effort: Small.
  - **B.** Record a keypad key as the key that it types, except a keypad digit. The listener then compares the key text of the press with the stored key, so the conflict check, Replace, Reset, and the fixed-key check compare exact texts on every layout. The recorder then refuses the keypad twins of fixed keys, such as the keypad Enter. A stored `Meta+NumpadDivide` then matches no press. Add a line under "How a key matches" and regression tests. Effort: Medium.
  - **C.** At dispatch, give the press to the command that holds the pressed keypad key, so a key that types the same character does not run on that press. Add a line under "How a key matches". The conflict line still misses the pair, and the keypad Enter of a focused control needs its own fix. Effort: Small.
- **Left out:** The newest saved command wins, because the owner then depends on the order of the saves. Refusing every keypad key, because B gives the same single owner and keeps the keypad digits.
- **Wider fix:** B. One key text for each press removes the class on every layout and with Num Lock on or off.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/fixed-keys-of-focused-controls.md`: under B here, the keypad Enter records as Enter, so that item needs no keypad rule of its own.
- **Recommendation:** B. Each press then has one owner, the conflict line finds every pair, and the tab shows the key that the person typed.
- **Action:** ask the user, because B adds a new rejection to the recorder.
