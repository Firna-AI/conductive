# Plus keys disappear from shortcut displays

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from review finding 13 of `calummoore/keyboard-shortcuts-settings`.
- **Location:** `docs/mockups/src/components/common/KeyChips.tsx:39`, `src/app/shortcuts/keys.ts:101`, and `src/shell/account/shortcuts/ShortcutParts.tsx:63`.
- **Reason:** Both review fix rounds are complete, and this display defect does not block the merge of main.

- **Terms:**
  - **KeyChips:** The shared component that draws shortcut keys and supplies their spoken names.
  - **Shortcut key:** A stored key and its modifiers, such as `Ctrl++` for Control with Plus.
- **Background:** Conductive lets people assign shortcut keys on the Account page. The recorder accepts Plus on Windows and Linux. The shared key reader gives `Ctrl++` one meaning. The settings tab, palette rows, and org rail use KeyChips.
- **Problem:** `symbolsOf('Ctrl++')` splits on every `+` and returns `['Ctrl', '', '']`. The display shows Control and two empty chips. The spoken name omits Plus. Change, Remove, Replace, and row messages use that name too.
- **Impact if no action:** People cannot identify a valid saved shortcut from its display or accessible name.
- **Root question:** How should key chips and spoken names preserve every key, including Plus on Windows and Linux?
- **Options:**
  - **A.** Draw the complete Windows or Linux shortcut in one chip. This preserves Plus but changes the required display pattern. Effort: Small.
  - **B.** Parse modifier prefixes and keep the remaining key as one token. Share those tokens between display and speech. Add a regression case. The parser still depends on formatted text. Effort: Small.
  - **C.** Have callers supply structured key tokens from the key model. Make display and speech use those tokens. Update every app and mockup caller. Remove parsing of formatted shortcut text, including the Search row's separate prefix parser. Add a regression case in an app test. Effort: Medium.
  - **D.** Print the key as the word Plus, such as `Ctrl+Plus`. This changes the tab's requirement that each key shows as its keyboard prints it. It needs a user decision. Effort: Small.
  - **E.** Move the complete shortcut formatter to `src/shared/`. Give KeyChips the stored key and keyboard. Convert about 300 mockup strings in 27 files. Handle the lone Command symbol in the terminal note separately. Effort: Medium.
- **Left out:** Rejecting Plus removes a supported key. Changing nothing leaves the defect. A special case for a final `++` is narrower than B. Changing stored key text is unnecessary because it already has one meaning. Do not retain a compatibility parser for the old component interface.
- **Wider fix:** C. Display and speech receive key tokens, so a separator cannot erase a key.
- **Previous examples:** Existing Plus cases check matching and ARIA formatting. They do not check KeyChips. The Search row already has a second parser of formatted text in `src/shell/palette/SearchRow.tsx`.
- **Recommendation:** C. It removes parsing of display text from the real callers and keeps the approved display pattern.
- **Action:** fix after merge, apply C.

`docs/protocol/keyboard-shortcuts-tab.md` requires each key to show as its keyboard prints it. `docs/protocol/keyboard-shortcuts.md` requires a screen reader to hear the key. Vitest excludes tests under `docs/mockups/`. Put the regression case under `src/`, such as the shortcut tab tests, using a stored Plus shortcut on Windows. No existing test covers the missing key chips or spoken Plus name.
