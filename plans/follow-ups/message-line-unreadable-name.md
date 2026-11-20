# An open message line has no name

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, the independent check of review round 2, finding 3. Updated on 2026-11-17 on branch `calummoore/output-summary-f7sm`, after the shared Markdown parser replaced the chat reader.
- **Location:** `src/chat/components/MessageLine.tsx:82`, the condition `split && lead.length === 0`.
- **Reason:** The same control-name gap exists on `origin/main` before the heading change.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Message line:** The control that opens an agent message in the folded work of a finished turn.
  - **Lead blocks:** The parts before the first table, which remain inside the open control.
- **Background:**
  - A message line shows a table below its open control, because a summary cannot hold a table.
  - When the lead blocks draw nothing, the control needs a hidden copy of its closed text as its readable name.
  - `src/chat/message-lines.md` describes that hidden copy.
  - `agentBlocks` in `src/chat/markdown/agent-blocks.ts` leaves out a heading that shows no words, such as one of white-space code, and an empty quote. So only those count as no block before the table.
- **Problem:**
  - An empty code block gives no readable text.
  - A paragraph of only an image with no alt text that opens nothing, such as `![](x)`, also draws no text. The old chat reader showed it as typed text, so this case came with the shared parser.
  - When either comes before a table, the control keeps that lead block and adds no hidden name.
  - Its icon is hidden from screen readers, so the open control has no readable name.
  - The same `lead.length === 0` condition is on `main`.
  - A paragraph of only `**` now shows `**`, because the shared parser reads an unpaired mark as text.
  - A DOM probe of 17 November 2026 gave an empty name for the code block and for the image, and the name `**` for the paragraph of `**`.
- **Impact if no action:** A screen reader cannot name this message control after the user opens it.
- **Root question:** How should an open message control keep a readable name?
- **Options:**
  - **A.** Add direct readable-text checks for paragraphs and code blocks to the fallback condition. More block kinds need separate checks. Effort: Small.
  - **B.** Share one readable-text reader for transcript blocks and use it to decide when the hidden name is needed. Effort: Small.
  - **C.** Always set the control name from the complete plain-text message. Normal controls would then name content below the line too. Effort: Small.
- **Left out:** CSS cannot give the control a readable name. Changing nothing keeps the unnamed control.
- **Wider fix:** B. One block reader gives each content kind the same readable-name rule.
- **Previous examples:** Commit `712afd8f` introduced the earlier block-count condition. No other example was found in the focused check.
- **Related:**
  - `plans/follow-ups/formatting-only-chat-heading.md` covers the same control when its lead is a heading that shows no words, such as the heading of an image with no alt text. Its recommended reader of shown words can serve both items.
  - The fix of the closed item [Formatting marks leave an empty heading](https://github.com/Firna-AI/conductive/blob/66682a1679dbf3a208427591c9d88cea11fcca82/plans/follow-ups/formatting-only-chat-heading.md) gave a heading of formatting marks alone empty text in the old chat reader, so the fallback added the hidden copy for these lead blocks. `heading` in `src/chat/markdown/agent-paragraphs.ts` now leaves out a heading of white-space code in the same way. A heading of an unpaired mark, such as `## **`, shows the mark as typed, so its text names the control. That fix does not correct paragraphs or code blocks, so this gap stays.
- **Recommendation:** B. Check readable block content in one place while keeping the normal control names.
- **Action:** fix after merge, apply B, because the problem already exists on main and does not come from the heading change.

Add the image-before-table and empty-code-before-table cases to the
existing `MessageLine.dom.test.tsx` control-name test. Verify that the
hidden copy names the open control and contains no focusable chip.
