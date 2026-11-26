# Second parses lose the context of the message

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/output-summary-f7sm`, review round 3, the wider fix of finding 101 and a problem that its check found.
- **Location:** `src/markdown/token-read.ts`, `linesInline`. `src/chat/markdown/live-marks.ts`, `closedMarks`. `src/markdown/parser.ts`, `parseMarkdownTokens`.
- **Reason:** the direct fix of finding 101 landed in its branch. The wider fix touches both views, and the deep-text case is rare.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Second parse:** a read of part of a message or a file again, after the parse of the whole text.
  - **Reference definition:** a line such as `[1]: https://e.com/a` that gives the address of the reference link `[docs][1]`.
- **Background:**
  - The chat and the file preview read Markdown with one `markdown-it` parser (Markdown parser decision 3 C).
  - Two places parse text a second time. `closedMarks` reads the block where live text ends, to close its open marks (decision 9 C). `linesInline` reads the source lines of a list or a quote deeper than 16 levels as paragraph text, in both views.
  - Finding 101 found that `closedMarks` lost the reference definitions of the message. Its direct fix passes `references` from `parseMarkdownTokens` to `closedMarks` by hand, next to the `chat` switch that it already copied.
- **Problem:** `linesInline` still reads deep text without the reference definitions. In both views, `[docs][1]` in a list or a quote deeper than 16 levels stays typed, and its address shows nowhere. Each new field of the parse context must also be copied by hand into each second parse.
- **Impact if no action:** in deep lists and quotes only, a reference link shows as typed. A later change to the parse context can miss a second parse again.
- **Root question:** How does each second parse read text with the same context as the parse of the whole text?
- **Options:**
  - **A.** Pass `references` to `linesInline` too, by hand, as the fix of finding 101 does. Effort: Small.
  - **C.** One helper in `src/markdown/parser.ts` builds the context of each second parse from the context that the parse ends with, without the table budget fields. `parseMarkdownTokens` returns that context. `closedMarks` and `linesInline` require it. Tests: a deep reference link in both views, and a definition in the cut tail of the file preview that stays out after a table stop. Effort: Medium.
- **Left out:** B of finding 101, which closes live marks inside the first inline pass: it fixes only the live block, and it must also move the live underline read of `heading()` into the shared parser.
- **Wider fix:** C. One helper removes the class for every second parse.
- **Previous examples:** finding 101 of review round 3. Finding 22 of review round 1, whose fix made `closedMarks` copy the `chat` switch by hand.
- **Related:** finding 27 of review round 1: after a table stop, the context that the caller passed in still holds the definitions of the cut tail, so C must use the context that the parse ends with.
- **Recommendation:** C. It removes the cause in both views.
- **Action:** fix after merge, apply C, because the remaining case is rare, low in harm, and the direct fix already landed.
