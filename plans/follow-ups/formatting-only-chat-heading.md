# Blank images and code leave an empty heading

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, review round 2, finding 3. Updated on 2026-11-17 on branch `calummoore/output-summary-f7sm`, after the shared Markdown parser replaced the chat reader.
- **Location:** `src/chat/markdown/agent-blocks.ts:87` (`heading`), `src/chat/markdown/answer-parts.ts:162` (`imageParts`), `src/chat/components/AgentText.tsx:52`, `src/chat/components/LineBlocks.tsx:97`, and `src/chat/components/MessageLine.tsx:73`.
- **Reason:** only a heading of an image with no alt text that opens nothing, or of inline code of spaces, meets it, and the fix costs the same later.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Heading block:** the heading value that `agentBlocks` in `src/chat/markdown/agent-blocks.ts` makes, and that the answer and the message line draw.
  - **Answer parts:** the text, code, links, and chips that `answerParts` in `src/chat/markdown/answer-parts.ts` makes from the inline tree of a block.
  - **Message line:** the control that opens an agent message in the folded work of a finished turn.
- **Background:**
  - The chat reads each agent message with the shared `markdown-it` parser, through `agentBlocks`. `answerParts` then makes the parts that the chat draws.
  - `docs/protocol/chat-markdown.md` requires that a heading with no text shows nothing and still ends the paragraph above it. Reason: a screen reader meets no empty heading.
  - `agentBlocks` leaves out a heading whose inline tree has no node after the line-break rule. It counts nodes, not the words that the parts show.
  - No picture loads in the chat, as `docs/protocol/chat-links.md` says. When the alt text of an image is empty, an image of a file of the tree shows the file name. An image at a web address shows its address in that case. Any other image shows its alt text only.
  - An open message line gets a hidden copy of its closed text as its name only when no block comes before its first table, at `MessageLine.tsx:73`.
- **Problem:**
  - The inputs of the first report now show text, as CommonMark reads an unpaired mark: `## **`, `` ## ` ``, and `**` above `---` give a heading of `**` or of a backtick.
  - `## ![](x)` draws an empty `h2` when `x` is no file of the tree and no web address. An image of a file draws an empty `h2` while the chat has no tree.
  - `` ## ` ` `` draws a heading that holds only a code box with one space.
  - Before a table, such an image heading stops the open message line from adding its hidden name. The line then has an empty accessible name.
  - The old chat reader showed `![](x)` as typed text. So the image case came with the shared parser. The code case is older.
  - A DOM probe of 17 November 2026 showed each case with `AgentText` and `MessageLine`.
- **Impact if no action:** A screen reader can meet an empty heading or an unnamed message control.
- **Root question:** How does a heading remain absent until it has readable content?
- **Options:**
  - **A.** Check the shown words of the parts at each empty check: the heading of `Block` in `AgentText.tsx`, the heading of `LineBlock` in `LineBlocks.tsx`, and the hidden-name condition of `MessageLine.tsx`. Effort: Small.
  - **B.** Share one reader of the words that answer parts show. Both renderers and the hidden-name condition call it to decide emptiness. Effort: Small.
  - **C.** Show an image that shows no words as the agent typed it, as a link that opens nothing shows. It changes the image rule of `docs/protocol/chat-links.md`, and it leaves the code case. Effort: Small.
  - **D.** Decide emptiness where `heading` makes each heading block, and leave out a heading whose nodes show no words. It decides the code case. It cannot decide the image case, because the tree and the web reader of the chat decide whether an image shows words, when the chat draws it. Effort: Small.
- **Left out:**
  - Changing nothing fails the requirement.
  - CSS cannot name the open line, and `:empty` misses a code box with a space.
- **Wider fix:** B. One reader of the shown words keeps each renderer and the name check from drawing or counting an empty block.
- **Previous examples:** The old chat reader drew `## **` as an empty heading, until the shared parser read the unpaired mark as text. Commit `712afd8f` added the earlier block-count name check.
- **Related:** `plans/follow-ups/message-line-unreadable-name.md` covers the same unnamed control when a paragraph or a code block comes before the table. B can serve both items.
- **Recommendation:** B. One reader decides emptiness for both renderers and the name check, also for an image whose words depend on the tree. The first review recommended B, and the first record recommended D.
- **Action:** fix after merge, apply B, because only an unusual heading meets it, and the fix costs the same later.

Add the reader beside `answerParts` in `src/chat/markdown/answer-parts.ts`.
The parser already ends the paragraph above each heading, so a renderer
can draw nothing for a heading without words. Add the image and code cases to
`src/chat/components/AgentText.dom.test.tsx`, and the image heading before
a table to `src/chat/components/MessageLine.dom.test.tsx`. Update the
heading rule in `src/chat/agent-text.md` and the hidden copy in
`src/chat/message-lines.md`.

While the agent writes, an unpaired mark now shows as typed. So the live
text no longer shows an empty heading for one update, as it did with the
old reader.
