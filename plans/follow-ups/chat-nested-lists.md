# Chat answers lose the nesting of their lists

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, after the user reported that a chat answer "looks off".
- **Location:** `src/chat/components/agent-text.ts` (`textBlocks`), `src/chat/components/AgentText.tsx`, `src/chat/components/MessageLine.tsx`, and the section "Formatting" of `docs/protocol/chat-markdown.md`.
- **Reason:** the approach waits for two open decision items: `plans/follow-ups/chat-nested-lists-approach.md` and `plans/follow-ups/chat-nested-lists-indent.md`.

- **Source:** Design. **Category:** Product bug.
- **Terms:**
  - **Nested list:** a list that an agent indents under an item of another list, such as lettered options under a numbered decision.
  - **Work fold:** the folded steps of an ended turn, above its answer. Each agent message in it is one line that opens to its full text, drawn by `MessageLine.tsx`.
- **Background:**
  - The chat formats each agent message with its own small parser, `textBlocks` in `src/chat/components/agent-text.ts`. The chat answer (`AgentText.tsx`) and the work-fold line (`MessageLine.tsx`) draw from that one parse.
  - The parser keeps every list flat. A change of list kind starts a new list beside the old one. A list of the same kind joins the outer list. A blank line ends a list.
  - The protocol doc `docs/protocol/chat-markdown.md` lists the Markdown that the chat formats. It does not say how content under a list item shows.
  - The user's screenshot showed numbered decisions, each with lettered options as a bulleted list indented 3 spaces under the number. The options showed as a separate list after each decision.
  - Branch `calummoore/markdown-formatting-issue` already fixed two parts that the current rules cover: a numbered list counts from the number of its first item, and a numbered list has the indent and margins of a bulleted list.
- **Problem:** An indented list shows after its item, at the same level. Only the order shows which options belong to which decision. A numbered list under a numbered item joins the outer list. For example, an outer `2.` after the indented items `1.` and `2.` shows as "4.".
- **Impact if no action:** Each answer with nested lists keeps a flat look. Agents nest lists in most reports with decisions.
- **Root question:** How should the chat show the content that belongs to each list item, so that an answer keeps the structure that the agent wrote?
- **Options:** The two decision items hold the options. `plans/follow-ups/chat-nested-lists-approach.md` chooses the approach. `plans/follow-ups/chat-nested-lists-indent.md` chooses the indentation rule, when the approach needs one.
- **Left out:** None.
- **Wider fix:** The approach item gives it.
- **Previous examples:** Commit `712afd8f`, "feat(chat): render Markdown tables in agent replies": tables showed as text with their pipes until then.
- **Related:** `plans/follow-ups/chat-nested-lists-approach.md` and `plans/follow-ups/chat-nested-lists-indent.md`. This work waits for their answers.
- **Recommendation:** Apply the answers of the two decision items. Update the protocol doc, the mockups, and `src/chat/agent-text.md` in the same branch.
- **Action:** ask the user, because the work depends on the two open decision items.
