# A Unicode line separator hides a heading

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, the finding check of review round 1, finding 1.
- **Location:** `src/markdown/headings.ts` (`atxHeading`), `src/markdown/list-items.ts` (the item pattern of `listMarker`).
- **Reason:** agent text and Markdown files very rarely hold these characters, and the fix costs the same after the merge.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Line separator:** the characters U+2028 and U+2029. CommonMark reads them as plain text, not as line endings.
  - **Shared heading reader:** `atxHeading` in `src/markdown/headings.ts`, which the chat and the file preview use.
- **Background:** `atxHeading` reads a heading line with the pattern `/^ {0,3}(#{1,6})(?:[ ]+|$)(.*)$/`. In JavaScript, `.` matches no line terminator, and U+2028 and U+2029 count as line terminators. The list reader of `src/markdown/list-items.ts` uses the same `(.*)$` form. `docs/protocol/chat-markdown.md` says that both views read headings and lists by the rules of CommonMark.
- **Problem:** A heading line or a list line that holds U+2028 or U+2029 shows as text in the chat and in the file preview. CommonMark reads it as a heading or a list item. The list part is the same on `origin/main` before the heading branch.
- **Impact if no action:** Such a line shows its `#` marks or its list marker as text.
- **Root question:** How do the shared readers take a line separator as text inside a heading or a list item?
- **Options:**
  - **A.** Use the `s` flag on the patterns of `atxHeading` and `listMarker`, so that `.` also matches a line separator. Add one case with U+2028 to the heading tests of `src/chat/components/agent-text.test.ts`. Effort: Small.
- **Left out:** Removing line separators from the text before the parse, because it changes the text of a heading. Only one other approach exists, and it fails the goal.
- **Wider fix:** None. The fix sits in the shared readers, so both views get it.
- **Previous examples:** None found.
- **Related:** The fix of the closed item [The chat splits Markdown only at line feeds](https://github.com/Firna-AI/conductive/blob/6fa9e75c70f26df8d279521e54ab0f8feab54454/plans/follow-ups/markdown-line-endings.md) gave both views one line reader, `markdownLines` in `src/markdown/lines.ts`. It splits only at CRLF, CR, and LF, as CommonMark does. So a line separator stays inside its line and still reaches `atxHeading` and `listMarker`, and A still applies.
- **Recommendation:** A. It is a one-flag change in the shared readers.
- **Action:** fix after merge, apply A, because a Rare product bug of Low severity waits for a later branch under the fix rule.
