# A long turn chip name overflows the row

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the options check of the turn end file limit on branch `calummoore/file-badges-display-limit`.
- **Location:** `docs/mockups/src/components/chat/TurnEnd.module.css:24`, the `.chip` rule.
- **Reason:** The turn end file limit changes how many chips show, not the width of one chip, so this fix needs its own change.

- **Terms:**
  - **Turn end:** the row at the end of a finished turn in the chat, with the duration and one file chip for each file that the turn changed.
  - **File chip:** a box with a file name and its line counts, such as "+4 −3". The app and the mockups share its style in `docs/mockups/src/components/chat/TurnEnd.module.css`.
  - **Attachment chip:** a box with the name and the size of a file that a message carries. Its style is in `docs/mockups/src/components/chat/AttachmentChips.module.css`.
- **Background:** The `.chip` rule of the turn end sets `white-space: nowrap`. It sets no maximum width, no hidden overflow, and no ellipsis. The attachment chip limits its width with `max-width: 100%`, and its `.name` part ends a long name with an ellipsis. On a phone, the chips of a turn end share a row of about 280 pixels with the duration. Nobody reproduced the overflow in a browser. A read of the CSS shows it.
- **Problem:** A file name longer than the row, such as a long test file name, makes its chip wider than the chat column on a phone.
- **Impact if no action:** The chip sticks out of the chat column, and the reader cannot see its line counts, or the chat scrolls sideways.
- **Root question:** How does a turn chip show a long file name on a narrow screen?
- **Options:**
  - **A.** Give the turn chip `max-width: 100%`, and end a long name with an ellipsis, as the attachment chip does. The full path stays in the name of the button for a screen reader. Effort: Small.
  - **B.** Let a long name wrap onto a second line inside the chip. The whole name shows, and the chip grows taller than its neighbours. Effort: Small.
  - **C.** One shared chip part for the turn chips and the attachment chips, with the width rule and the ellipsis. Each chip row then gets the same rule. Effort: Medium.
- **Left out:** A shorter name that cuts the middle of the file name, such as `homepage…spec.ts`. CSS cannot do it, and a script must measure each chip.
- **Wider fix:** C. Every chip row of the chat then shares one width rule.
- **Previous examples:** The attachment chip already ends a long name with an ellipsis.
- **Recommendation:** A. It copies the rule that the attachment chip uses and stays in one CSS file. C best protects the codebase.
- **Action:** fix after merge, apply A, because the turn end file limit does not change the width of a chip.
