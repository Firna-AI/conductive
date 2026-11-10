# A chat fence at any indent ends a list item

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, the check of finding 4 of review round 3.
- **Location:** `src/chat/components/agent-text.ts`, the function `isFence`.
- **Reason:** the chat showed the same output on `origin/main` before the nested-list branch.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Fence:** a line of three backticks that opens or closes a code block of an agent message.
- **Background:**
  - `docs/protocol/chat-markdown.md` says that a code block stands between two lines that start with three backticks.
  - `isFence` accepts such a line at any indent. CommonMark accepts a fence only with up to three spaces before it, relative to its container.
- **Problem:** A fence line with four spaces under `100. Parent` ends the item and opens a code block to the end of the message. CommonMark keeps the line as text of the item.
- **Impact if no action:** A rare agent message shows the rest of its text as code.
- **Root question:** Which indent of a fence line opens a code block in the chat?
- **Options:**
  - **A.** Accept a fence with up to three spaces before it, relative to its container, as CommonMark and the file preview do. Effort: Small.
  - **B.** Keep a fence at any indent. Effort: Small.
- **Left out:** None.
- **Wider fix:** `plans/follow-ups/one-markdown-reader-for-chat-and-preview.md` covers one block reader for both views.
- **Previous examples:** None found.
- **Recommendation:** A. It matches CommonMark and the file preview.
- **Action:** ask the user, because A changes which agent messages show a code block, and the protocol doc states no indent.
