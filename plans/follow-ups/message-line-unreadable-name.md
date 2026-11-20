# An open message line has no name after a blank image

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, the independent check of review round 2, finding 3. Updated on 2026-11-17 on branch `calummoore/output-summary-f7sm`, after the shared Markdown parser replaced the chat reader. Updated on 2026-11-20, at the third merge of `main` into that branch, which carried the fix of `main` pull request #564 into the parser code.
- **Location:** `blockShowsText` and `showsWords` in `src/chat/markdown/readable-text.ts`, and the `unnamed` check of `src/chat/components/MessageLine.tsx`.
- **Reason:** only an image with no alt text that opens nothing meets it, and the fix costs the same later.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Message line:** The control that opens an agent message in the folded work of a finished turn.
  - **Lead blocks:** The parts before the first table, which remain inside the open control.
- **Background:**
  - A message line shows a table below its open control, because a summary cannot hold a table.
  - When the lead blocks show no readable text, the control adds a hidden copy of its closed text as its readable name. `blockShowsText` decides it, from the blocks alone, as `main` pull request #564 decided it in the old reader. `src/chat/message-lines.md` describes that hidden copy.
  - So an empty code block before a table now names the control through the hidden copy.
  - The check counts an image as text. Whether an image shows words depends on the tree and the links of the screen, when it draws: its alt text, the name of its file, or its address.
  - A paragraph of only `**` shows `**`, because the shared parser reads an unpaired mark as text, so it names the control. Pull request #564 hid that text in the old reader and added the hidden copy. The third merge kept the typed mark, by the rule of `docs/protocol/chat-markdown.md` that a mark without its pair shows as typed, and left that choice to the user.
- **Problem:**
  - A paragraph of only an image with no alt text that opens nothing, such as `![](x)` when `x` names no file of the tree and no web address, draws no text.
  - When it comes before a table, the control keeps that lead block and adds no hidden name.
  - Its icon is hidden from screen readers, so the open control has no readable name.
  - The old chat reader showed the image as typed text, so this case came with the shared parser. Pull request #564 did not meet it for that reason.
- **Impact if no action:** A screen reader cannot name this message control after the user opens it.
- **Root question:** How should an open message control keep a readable name when its lead is an image whose words depend on the tree?
- **Options:**
  - **A.** Count an image with no alt text as no text in `blockShowsText`. The control then always keeps a name, but it also adds the hidden copy when the image shows the name of its file or its address. Effort: Small.
  - **B.** Decide the hidden name from the words that the answer parts of the lead blocks show, as `answerParts` reads them with the tree and the links of the screen. The check then runs again at each change of the tree, not once for each text. Effort: Small.
  - **C.** Always set the control name from the complete plain-text message. Normal controls would then name content below the line too. Effort: Small.
- **Left out:** CSS cannot give the control a readable name. Changing nothing keeps the unnamed control.
- **Wider fix:** B. One reader of the words that answer parts show decides the hidden name and the empty heading of `plans/follow-ups/formatting-only-chat-heading.md`.
- **Previous examples:** Commit `712afd8f` introduced the earlier block-count condition. `main` pull request #564 replaced it with the text-only reader that this branch carries.
- **Related:** `plans/follow-ups/formatting-only-chat-heading.md` covers the same control when its lead is a heading of such an image. Its recommended reader of shown words can serve both items.
- **Recommendation:** B. One reader decides the hidden name from the words that the line shows, also for an image whose words depend on the tree.
- **Action:** fix after merge, apply B, because only an image with no alt text that opens nothing meets it, and the fix costs the same later.

Add the image-before-table case to the existing `MessageLine.dom.test.tsx`
control-name test. Verify that the hidden copy names the open control and
contains no focusable chip.
