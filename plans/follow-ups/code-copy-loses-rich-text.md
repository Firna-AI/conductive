# A code copy loses its colours in rich editors

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, from the branch `calummoore/selecting-code-context-jlro`, a check of review finding 7.
- **Location:** `src/files/code/CodeBox.tsx` (the copy handler), `src/files/code/code-selection.ts`.
- **Reason:** The branch fixed the plain text of the copy first, and an HTML copy needs its own check in rich editors.

- **Terms:**
  - **Code box:** `CodeBox` of `src/files/code/CodeBox.tsx`, the focusable scroll region of the text view of a file tab. With the source of the view, it builds the copied text itself.
- **Background:** Since 23 November 2026, a copy of a selection in the text view of a file gives the source text of the selection, with its empty lines. The code box cancels the browser's copy and writes only `text/plain`. Before, the browser also wrote `text/html`, with the colours and the code font of the view, but it left out every empty line.
- **Problem:** A paste of copied code into a rich editor, such as a document or a mail, has no colours and no code font.
- **Impact if no action:** Members who paste code into rich documents lose the look of the code.
- **Root question:** Should a code copy also give rich text, and with which look?
- **Options:**
  - **A.** Also write `text/html`: a `pre` element with the source text and the code font, with no colours. Effort: Small.
  - **B.** Also write `text/html` with the coloured tokens of the selected lines, as inline styles. Effort: Medium.
  - **C.** Change nothing. Plain text is what code editors expect. Effort: Small.
- **Left out:** The browser's own HTML, because it leaves out the empty lines.
- **Wider fix:** None. Only the code box builds its own copy of rows.
- **Previous examples:** None found.
- **Recommendation:** A. A paste then keeps the code font and every line, with little code.
- **Action:** fix after merge, apply A, because rich editors need a check of their own.
