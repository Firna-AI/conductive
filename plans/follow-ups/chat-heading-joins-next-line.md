# A chat heading joins the line under it

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, the finding check of review round 2, finding 2.
- **Location:** `src/chat/components/agent-text.ts`, the paragraph lines of `parseLines`.
- **Reason:** `origin/main` already joined them before the nested-list branch, and that branch did not change how a heading shows.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Agent message:** one message of the agent in a turn, which the chat formats with its own small Markdown parser.
- **Background:**
  - `docs/protocol/chat-markdown.md` says that a heading shows as the text of a paragraph, without its `#` marks, and that the lines of one paragraph show as one paragraph.
  - The chat parser adds the text of a heading line to the paragraph that is open, and adds the next line to it too.
  - Since the nested-list branch, a heading closes the paragraph state, so a list can start under it. Its text still joins the paragraph.
- **Problem:** `## Summary` above `The change does X.` shows as one paragraph, `Summary The change does X.`.
- **Impact if no action:** A heading of an agent message runs into the sentence under it.
- **Root question:** How does the text of a chat heading show apart from the paragraph under it?
- **Options:**
  - **A.** Show each heading as a paragraph of its own: end the paragraph before and after a heading line. Effort: Small.
  - **B.** Show each heading as a paragraph of its own, in strong text. It changes the look that the protocol doc states, so it needs the user. Effort: Small.
- **Left out:** Real headings, because the protocol doc rejects the headings of the file preview for the chat.
- **Wider fix:** None, because the protocol rule is clear.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the text of each heading and the sentence under it apart, as the protocol doc's "the text of a paragraph" says.
- **Action:** fix after merge, apply A, because the nested-list branch did not change the heading rule.
