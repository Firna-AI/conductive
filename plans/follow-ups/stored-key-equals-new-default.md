# A stored key can equal a new default

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open decision of the deleted keyboard shortcuts plan (decision 202). Its source was the mockups of the newer shortcut keys of `calummoore/keyboard-shortcuts-settings`.
- **Location:** `src/app/shortcuts/keymap.ts` (`buildShortcutKeymap`), `src/app/shortcuts/decision.ts` (`decideShortcut`), and `docs/protocol/keyboard-shortcuts-tab.md`, sections "Conflicts" and "Reset".
- **Reason:** The answer sets which of two keys wins, and no protocol rule or user decision says it.

- **Background:** The keymap starts with the default keys, and each stored change of a person replaces the keys of its command. The Replace of the recorder moves a key, so the recorder never leaves one key on two commands. A release can give a command a new default key, as the newer keys gave Create PR ⇧⌘P on 2026-11-11. For a press, `decideShortcut` runs the first matching command in the list that the page offers. No account held such a key on 2026-11-11.
- **Problem:** When a stored change holds a key that a later release gives another command as its default, both commands hold the key. The protocol does not say which one runs. Today the first in the list runs, and the Keyboard shortcuts tab shows the key on both rows with no conflict line.
- **Impact if no action:** After a release, a key can run a command that the person does not expect, or the new default never runs. Each new default key adds a chance of this.
- **Root question:** When a key that a person chose becomes the default key of another command, which command gets the key?
- **Options:**
  - **A.** Write today's behaviour into the protocol. Effort: Small.
  - **B.** The new default wins, and the keymap drops the key from the person's change. Effort: Small.
  - **C.** The person's key wins, and the keymap drops the key from the defaults of the other command. Its Reset then shows the conflict line, as Reset does for a taken default today. Effort: Small.
- **Left out:** A notice that lists moved keys after a release, because the app has no release notes, and B and C already give each key one owner. A check at release time, because a release cannot read the stored keys.
- **Wider fix:** C. The keymap then keeps one owner for each key.
- **Previous examples:** None found.
- **Recommendation:** C, because a key that the person chose should not lose to a default that the person never chose.
- **Action:** ask the user, because the answer sets which of two keys wins, and no protocol rule or decision says it.
