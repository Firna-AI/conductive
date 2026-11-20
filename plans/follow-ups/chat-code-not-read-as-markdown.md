# Sent messages read code with single backticks only

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, finding 4 of review round 1, with the problems that its check found. Updated on 2026-11-17 on branch `calummoore/output-summary-f7sm`, after the shared Markdown parser took over the agent messages. Changed to Needs decision on the same day, from finding 61 of review round 1 of that branch.
- **Location:** `src/chat/links/chat-tokens.ts:108`, the backtick branch of `tokens`, and line 91, its comment that states the rule. `src/chat/links/chat-parts.ts:75`, `chatParts`. `docs/protocol/file-mentions.md:83-86`, the code rule of a sent message, where the answer goes.
- **Reason:** Option F changes what a sent message shows after a backtick with no pair, and no protocol doc or user decision states that rule.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Sent message:** a message of a member, or a tool message that an agent sends with the `send_message` workspace tool. `UserBubble` in `src/chat/components/TranscriptItem.tsx` draws it.
  - **Sent message tokenizer:** `tokens` in `src/chat/links/chat-tokens.ts`. `chatParts` uses it to split a sent message into text, code, links, and file mentions.
  - **Fence:** a line of three or more backticks or tildes that starts or ends a code block in Markdown.
  - **File mention:** `@` and a path, such as `@README.md`, which a sent message shows as a file chip.
  - **Shared parser:** `markdownParser` in `src/markdown/parser.ts`. It is the `markdown-it` parser that reads agent messages and the file preview, by the rules of CommonMark.
- **Background:**
  - A sent message shows its text as the member typed it. It shows each workspace link and each file mention outside code as a chip.
  - `docs/protocol/file-mentions.md` keeps a mention in inline code or in a code block as code. `docs/protocol/workspace-links.md` keeps a workspace link in longer code or in a code block as code.
  - Agent messages read code with the shared parser. So the part of this item for agent messages is done. That part was the extra step of the earlier option E.
  - The sent message tokenizer pairs single backticks. It knows no tildes and no fence lines. A backtick with no pair makes the rest of the text code.
  - No protocol doc says what a backtick with no pair does in a sent message. Only the comment of `tokens` states the rule. The answer of this item goes into `docs/protocol/file-mentions.md`, next to its code rule under "Chips of files and folders".
  - On 16 November 2026, the user chose the `markdown-it` parser for agent messages and the file preview. That choice does not cover sent messages, which keep their own tokenizer.
- **Problem:** A probe of 17 November 2026 gave a chip in a sent message for each of these texts. The code rules of CommonMark keep the mention or the link as code:
  - a tilde block: `~~~`, `@README.md`, `~~~`
  - a block of four backticks: `` ```` ``, `@README.md`, `` ```` ``
  - a block of three backticks that holds one backtick: `` ``` ``, ``a ` b``, `@README.md`, `` ``` ``
  - inline code of two backticks: ``` `` @README.md ` x `` ```
  - a workspace link in a tilde block

  The reverse also happens. In ``It's `x then @README.md``, the backtick with no pair makes the rest code, so the mention shows no chip. CommonMark reads a backtick with no pair as text. Agent messages give the CommonMark result for all six texts.
- **Impact if no action:** Some code examples in sent messages show live chips in place of literal text. A sent message and an agent message with the same text read code in different ways.
- **Root question:** Which text of a sent message shows as code, also after a backtick with no pair?
- **Options:**
  - **A.** Add fences of backticks and tildes to the sent message tokenizer alone. It leaves inline code of two backticks and the backtick with no pair. Effort: Small.
  - **B.** Find the fences and the indented code of a sent message with the block tokens of the shared parser, before the tokenizer reads mentions and links. Keep the pairing of single backticks for inline code. It leaves inline code of two backticks and the backtick with no pair. Effort: Small.
  - **D.** Find all code of a sent message with the shared parser: fences and indented code from the block tokens, and code spans from the inline tokens. Read chips, links, and mentions only outside the code. Keep the rule that a backtick with no pair makes the rest of the text code. Cost: `markdown-it` gives an inline token no place in the source, so the change must find the place of each code span in the typed text. Effort: Medium.
  - **F.** D, and read a backtick with no pair as text, as agent messages do. Then a mention after it gives a chip. Cost: saved sent messages change too. Effort: Medium.
  - **G.** Apply F after the merge without a question to the user. Its reason: F stays inside the contract, because no protocol doc states the rule of a backtick with no pair. Cost: F still changes what existing sent messages show. That rule is behaviour on `origin/main` that no user chose to change. Effort: Medium.
- **Left out:** Drawing sent messages as Markdown with the reader of agent messages, because `docs/protocol/chat-links.md` requires that a sent message shows the text as the member typed it. Storing chip positions with the message, because it needs a new message format.
- **Wider fix:** F. It gives every path of chat text one code grammar, the one of the shared parser.
- **Previous examples:** The reader of agent messages had the same defect until the shared parser replaced it.
- **Related:** `plans/follow-ups/one-tokenizer-for-chip-text.md` changes the same tokenizer for links and mentions. One branch can do both. The fix of the closed item [Long lines of brackets slow the chat link scan](https://github.com/Firna-AI/conductive/blob/25ffc4de99c7bea5c470415adf683794ffbf3f09/plans/follow-ups/link-label-scan-quadratic.md) changed how the same tokenizer finds the end of each Markdown label, with `lineLabelEnds` of `src/markdown/markdown-labels.ts`. Keep that one-pass read with each option.
- **Recommendation:** F. One code grammar for sent messages and agent messages prevents the class in each shape.
- **Action:** ask the user, because F changes how sent messages on `origin/main` read a backtick with no pair, and no doc or user decision covers it.
