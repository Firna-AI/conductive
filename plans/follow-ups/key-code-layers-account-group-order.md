# Palette doc gives the wrong Account group order

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the second review of branch `calummoore/seoul-1i6o`.
- **Location:** `src/app/key-code-layers.md:22`
- **Reason:** The wrong sentence was already on `main`, and the Stats change did not touch it.

- **Terms:**
  - **Account group:** the group of the Settings tab of the command palette that lists the sections and tabs of the Account page.
- **Background:**
  - `accountSettingIds` in `src/app/palette/commands.ts:155` lists the Account group: Sign-in, GitHub, Agents, Favourites, New workspaces, Keyboard shortcuts, and This Mac last. Favourites joined on 22 November 2026, with the model favourites change.
  - `src/app/key-code-layers.md:22` says that "This Mac follows Sign-in in the Mac app" and that "the group ends with Keyboard shortcuts".
- **Problem:** The doc gives an order that the code does not have.
- **Impact if no action:** A reader of the doc expects This Mac after Sign-in, and can move the row to match the doc.
- **Root question:** How does the app doc give the order of the Account group of the palette?
- **Options:**
  - **A.** Say that This Mac ends the group in the Mac app, after Keyboard shortcuts. Effort: Small.
  - **B.** Remove the order from the doc, and point to `accountSettingIds`. Effort: Small.
- **Left out:** Fewer than three approaches are real. The doc can only be corrected or stop restating the order.
- **Wider fix:** None. The `documentation` skill already says to keep the docs up to date with the code.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the doc useful and matches the code.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the change that found it.
