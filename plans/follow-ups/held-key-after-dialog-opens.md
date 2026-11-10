# A held shortcut key reaches the browser after a dialog

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from `calummoore/keyboard-shortcuts-settings`, the implementation of the keys in the app, part B, item 3.
- **Location:** `src/app/shortcuts/decision.ts` (`decideShortcut`) and `src/shell/shortcuts/shortcut-listener.ts`
- **Reason:** The fix needs a key-up event in the app services, which the app does not have, and people seldom hold a key that opens a dialog.

- **Terms:**
  - **Repeat:** a key press that the browser sends again while a person holds the key down. Its `KeyboardEvent.repeat` is true.
  - **Shortcut listener:** the one listener of the app on `AppServices.onKey` in `src/shell/shortcuts/`. It asks the model in `src/app/shortcuts/decision.ts` about each press.
- **Background:** The keyboard shortcuts protocol, `docs/protocol/keyboard-shortcuts.md`, says that a held key runs its command once, and that the browser's own action does not run for a key that runs a command. The model decides each repeat against the page as it is at that moment. When the repeat's first press would run a command now, the listener stops the repeat and runs nothing.
- **Problem:** When the first press opens a dialog, the page under the dialog no longer offers the command. So each later repeat of the held key passes to the page and to the browser. For example, a held ⌥⌘N opens the New workspace dialog, and the repeats then reach Chrome, which opens a new split tab on ⌥⌘N.
- **Impact if no action:** A person who holds a shortcut key that opens a dialog can trigger the browser's own action of that key.
- **Root question:** How does the app keep every repeat of a held command key from the browser, also after the first press changed the page?
- **Options:**
  - **A.** Change nothing. People seldom hold such a key. Effort: Small.
  - **B.** The listener remembers the key of the last press that ran a command until that key goes up, and stops each repeat of it. Cost: a key-up event in `AppServices`, a reset when the window loses the focus, and a test. Effort: Medium.
- **Left out:** Stopping every repeat of every key, because a held arrow or letter must still repeat in the page.
- **Wider fix:** B. One memory of the held command key covers each command that changes the page.
- **Previous examples:** Before the shortcut listener, the palette key stopped its own repeats while the palette was open.
- **Recommendation:** B. It meets the protocol for every held key at a small cost.
- **Action:** fix after merge, apply B, because it needs a new key-up service and the case is rare.
