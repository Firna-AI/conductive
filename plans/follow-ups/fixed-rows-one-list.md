# Keep the fixed shortcut rows in one list

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/italic-tab-close-with-esc-s97a`, the wider fix of review item 4.
- **Location:** `src/shell/account/shortcuts/fixed-rows.ts`, `commandGroupRows` and `fixedGroups`. `docs/mockups/src/fixtures/fixedShortcuts.ts`. `docs/mockups/src/fixtures/shortcutCommands.ts`, `shortcutSpecs`.
- **Reason:** The fix moves every fixed row of the app and of the mockups to one module, which reaches far outside the files of the branch.

- **Terms:**
  - **Fixed row:** a row of the Keyboard shortcuts tab of the Account page that shows a fixed key, such as Escape, with "Fixed shortcut". No person can change a fixed key, as `docs/protocol/keyboard-shortcuts-fixed-keys.md` says.
  - **Search words:** the extra words of a row that the search field of the tab also matches, such as "right-click" for "Open the menu of a focused tab".
- **Background:**
  - The app builds its fixed rows in `src/shell/account/shortcuts/fixed-rows.ts`, with the key names of the app, such as `Escape`.
  - The mockups build the same rows again, by hand, in `docs/mockups/src/fixtures/fixedShortcuts.ts` and `docs/mockups/src/fixtures/shortcutCommands.ts`, with the key glyphs of the mockups, such as `Esc`.
  - Each new fixed row needs the same label, place, and search words in both lists. Commit `ade62e35e` added the divider rows to both lists by hand.
  - On 2026-11-20 the row "Close the temporary tab" was added to both lists. The first mockup copy lacked the search words `italic` and `file` of the app row. A review found it, and the branch fixed it by hand.
- **Problem:** Two hand-kept lists of the same rows can drift: a label, an order, or the search words can differ between the app and the mockups.
- **Impact if no action:** The mockups, which are the visual spec, can show a row or find a row by a search in a way that the app does not. Each new fixed row costs two edits and a careful compare.
- **Root question:** How do the app and the mockups show the same fixed rows without two hand-kept copies?
- **Options:**
  - **A.** Keep two lists, and add a test that compares the labels, the order, and the search words of the fixed rows of the app with those of the mockup fixtures. Effort: Small.
  - **B.** Put the label, the group, the keys, and the search words of each fixed row in one module under `src/shared/`, and build both the app rows and the mockup rows from it. The mockups turn the key names into their glyphs. Effort: Medium.
- **Left out:** A comment that asks for both edits. It prevents nothing.
- **Wider fix:** B. One source removes the drift.
- **Recommendation:** B. It removes the second copy, so the two lists cannot differ.
- **Action:** fix after merge, apply B, because it changes every fixed row of the app and of the mockups.
