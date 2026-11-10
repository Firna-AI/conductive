# Chat text reads code with single backticks only

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, finding 4 of review round 1, with the problems that its check found.
- **Location:** `src/chat/links/chat-parts.ts:91-96`, `src/chat/components/agent-text.ts:29` and `:35`.
- **Reason:** only unusual code input meets it, and the fix is as easy after the merge.

- **Terms:**
  - **Chat tokenizer:** `tokens` in `src/chat/links/chat-parts.ts`, which splits a sent message or an answer into text, code, links, and file mentions.
  - **Fence:** three or more backticks or tildes that start and end a code block in Markdown.
  - **File mention:** `@` and a path, such as `@src/app.ts`, which a sent message shows as a file chip.
- **Background:** A sent message and an answer show each workspace link and each file mention outside code as a chip. `docs/protocol/file-mentions.md` keeps a mention in inline code or in a code block as code, and `docs/protocol/workspace-links.md` does the same for a link. The Files screens read fences with `openingFence` and `closesFence` in `src/files/markdown/markdown-lines.ts:17` and `:27`, and inline code with `codeSpans` in `src/files/markdown/markdown-spans.ts:78`.
- **Problem:** The chat tokenizer pairs single backticks and knows no tildes. These texts give a chip that should stay code:
  - a tilde block, such as `~~~` then `@README.md` then `~~~`
  - a block of four backticks, or a block of three backticks that holds one backtick
  - inline code of two backticks, such as ``` `` @README.md ` x `` ```
  - a workspace link in such a block, also before this branch
  One lone backtick also makes the rest of a member message code, so a later mention shows no chip. The block split of answers in `src/chat/components/agent-text.ts:29` and `:35` finds only lines that start with three backticks, so a tilde block in an answer becomes a paragraph, and a workspace link in it gives a chip.
- **Impact if no action:** Some code examples show live chips in place of literal text, and the two text views read code in different ways.
- **Root question:** How does each path of chat text read code with one grammar?
- **Options:**
  - **A.** Add complete fence handling to the chat tokenizer alone, with tests of a tilde block and a block that holds a backtick. Effort: Small.
  - **B.** Use the fence readers of the Files screens in the chat tokenizer before it reads mentions. Effort: Small.
  - **D.** Read code in the chat tokenizer with the readers of the Files screens for every token kind: fences for blocks and `codeSpans` for inline code. Keep the rule that an unclosed backtick runs to the end. Effort: Small.
  - **E.** Do D, and give the block split of answers the same fence readers. Keep the rule that a fence can have any indent, because agents indent fences in list items. Effort: Medium.
- **Left out:** Rendering member messages through the full Markdown parser, because it changes how every message shows and needs a decision. Storing chip positions with the message, because it needs a new message format.
- **Wider fix:** E. It gives every path of chat text one code grammar.
- **Previous examples:** None found before this branch.
- **Recommendation:** E. One reader for each path of chat text prevents the class in each shape.
- **Action:** fix after merge, apply E, because only unusual code input meets it, and the fix does not get harder later.
