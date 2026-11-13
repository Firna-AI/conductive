# Bold restarts after inline code in chat text

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from branch `calummoore/delft-i3g7`, review round 2.
- **Location:** `src/chat/links/chat-parts.ts`, the handling of a `code` token in `chatParts`.
- **Reason:** the same behaviour is on `main` before that branch, so it needs its own change.

- **Terms:**
  - **`chatParts`:** the reader of chat text in `src/chat/links/chat-parts.ts`. It splits an answer into text, code, bold, and chips.
- **Background:** In an answer, `**` marks bold. Inline code turns bold off, as `docs/protocol/chat-markdown.md` keeps from earlier work. The reader then still waits for the closing `**` of the bold before the code.
- **Problem:** In `` **`src/app.ts`** and more ``, the code turns bold off. The `**` after the code then turns bold on again, so " and more" shows bold until the end of the text.
- **Impact if no action:** A bold code span can make the rest of a paragraph bold.
- **Root question:** What closes bold that holds inline code?
- **Options:**
  - **A.** Keep the bold state through code, and draw the code inside the bold run. Effort: Small.
  - **B.** Keep the rule that code ends bold, but treat a `**` right after code that ended bold as the closing mark. Effort: Small.
- **Left out:** A full Markdown parser, because one of the small rules fixes the case.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. It matches Markdown, where bold can hold code.
- **Action:** fix after merge, apply A, because it is outside the scope of the branch that found it.
