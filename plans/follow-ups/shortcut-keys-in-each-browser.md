# Check the kept keys in each browser

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from `calummoore/keyboard-shortcuts-settings`, a post-merge task of its plan and the list of claims that its key research could not confirm.
- **Location:** `src/app/shortcuts/browser-keys.ts` (the kept keys and the keys that the app leaves to each browser), `src/app/shortcuts/text-keys.ts` (the text keys), `docs/protocol/keyboard-shortcuts-keys.md` ("Keys that a tab keeps" and "Keys that the app leaves to the browser"), and `docs/protocol/keyboard-shortcuts-fixed-keys.md` ("Text keys")
- **Reason:** The checks need the deployed app and real machines with Safari, Edge, and Windows, which the cloud machines of the branch do not have.

- **Terms:**
  - **Kept key:** a key that a browser acts on in a normal tab, so that the page cannot use it. The Keyboard shortcuts tab dims it there.
  - **Installed app:** the app in its own window, installed from Chrome or Edge. It gives the page every key.
- **Background:**
  - The kept keys of each browser come from the browser sources and from live checks in Chrome and Firefox on Linux. The key research of 2026-11-10 could not confirm the claims below with a source or a live check.
  - Safari, kept or free for the page: ⌘[, ⌘], ⇧⌘H, ⇧⌘[, ⇧⌘], ⌥⌘W, ⇧⌘T, ⌥⌘L, ⌥⌘U, ⌥⌘1 to ⌥⌘9, ⌃⌘1, and ⌃⌘2. Safari actions on ⌥⌘/, ⌥⌘B, ⌥⌘←, ⌥⌘→, ⌥⌘[, ⌥⌘], ⌥⇧⌘T, ⌥⌘A, ⌥⌘N, ⌥⌘↑, ⌥⌘↓, ⌃⌘↑, ⌃⌘↓, ⌘J, ⌥⌘T, ⌘U, ⌘/, ⌃⌘/, and ⌃⌘⌫. Kept on old or inferred evidence only: ⌘2 to ⌘9, ⌘T, ⌘W, ⌘L, ⌘R, ⌘Q, ⌃Tab, and ⌃⇧Tab. Whether a Safari web app gives the page every key.
  - Edge: every kept key and every routing rule, because Edge is closed source and the app assumes the Chromium list. ⇧⌘L on a Mac.
  - ⇧⌘⌫ as a text key in Safari and Chrome on a Mac. The only source is Firefox's model of the native behaviour.
  - ⇧⌘/: whether a fresh macOS account lists it as the key of the Help menu, and how Firefox takes it for the Help search.
  - ⌃⌘/ and ⌃⌘⌫ in Safari and in its full menus.
  - ⇧⌘T in Chrome on a Mac and on Windows: kept only while a closed tab can open again. A live check confirmed this on Linux only.
  - Firefox: ⇧⌘[ and ⇧⌘] reach the page but cannot be stopped. The key behaviour of Firefox web apps.
  - macOS Services: whether "Search With Google" on ⇧⌘L is on by default.
  - Windows: whether a third key cancels the input language switch on Alt+Shift on Windows 10 and 11, whether Right Alt+Shift also switches, the keys of the JAWS screen reader, and whether an Alt code character still appears after the page blocks the keydown.
- **Task:**
  - Open the deployed app in an installed app window of Chrome. Check that every default key runs its command, also ⌘N, ⌘T, and ⌘W, or Ctrl+N, Ctrl+T, and Ctrl+W.
  - Open it in a normal tab of Chrome, Edge, Firefox, and Safari, on a Mac and on Windows. For each claim above, press the key on a page that offers its command, and note whether the browser or the app acts.
  - Compare each result with the tables in `browser-keys.ts` and in the protocol, and with the dimmed keys of the Keyboard shortcuts tab.
- **Impact if no action:** A wrong table dims a key that works, or runs a command on a key that the browser also acts on.
- **Needs:** The deployed app after the merge, a Mac with Safari, Chrome, Edge, and Firefox, and a Windows computer with Chrome, Edge, and Firefox.
- **Done when:** Each claim has a result, and a fix pull request corrects each table entry that the result contradicts.
