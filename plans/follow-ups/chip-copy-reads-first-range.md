# The chip copy reads only the first range

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the branch `calummoore/selecting-code-context-jlro`, a check of review finding 5.
- **Location:** `src/chat/links/mention-copy.ts` (the copy handler, about lines 63 to 72).
- **Reason:** The branch did not change the chat copy, and the trigger is a rare selection.

- **Terms:**
  - **Chip copy:** the copy handler of `src/chat/links/mention-copy.ts`, which turns a file chip of a chat message into its mention text when a member copies it.
- **Background:** Firefox can keep more than one range in a selection. A Ctrl+drag adds a range, and a drag across content that cannot be selected splits a range. The chip copy reads only `getRangeAt(0)`, and it then replaces the selection with that range.
- **Problem:** In Firefox, a selection of several ranges whose first range reaches a chip copies only that first range.
- **Impact if no action:** A member who copies such a selection pastes only part of it.
- **Root question:** How should the chip copy keep every range of a selection?
- **Options:**
  - **A.** Read each nonempty range in the order of the document, and keep the selection as it is. Effort: Small.
  - **B.** Hand a selection of more than one range to the browser's own copy. Effort: Small.
  - **C.** Share one reader of the nonempty ranges of a selection with the file view copy of `src/files/code/code-selection.ts` and the literal copy of `src/chat/device/LiteralText.tsx`. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C. One reader gives each copy handler the whole selection and leaves out carets.
- **Previous examples:** `src/chat/device/LiteralText.tsx` reads every range. `src/files/code/code-selection.ts` reads every range since 23 November 2026.
- **Recommendation:** C. It ends this class of bug for each copy handler.
- **Action:** fix after merge, apply C, because it changes chat code that the branch did not touch.
