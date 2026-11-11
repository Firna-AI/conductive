# An open message line has no name

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, the independent check of review round 2, finding 3.
- **Location:** `src/chat/components/MessageLine.tsx:190`.
- **Reason:** The same control-name gap exists on `origin/main` before the heading change.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Message line:** The control that opens an agent message in the folded work of a finished turn.
  - **Lead blocks:** The parts before the first table, which remain inside the open control.
- **Background:**
  - A message line shows a table below its open control, because a summary cannot hold a table.
  - When the lead blocks draw nothing, the control needs a hidden copy of its closed text as its readable name.
  - `src/chat/agent-text.md` describes that hidden copy.
- **Problem:**
  - A paragraph containing only `**` draws no text after inline formatting.
  - An empty code block also gives no readable text.
  - When either comes before a table, the control keeps those lead blocks and adds no hidden name.
  - The current fallback recognizes only empty heading blocks.
  - Its icon is hidden from screen readers, so the open control has no readable name.
  - On main, the earlier `lead.length === 0` condition has the same gap.
- **Impact if no action:** A screen reader cannot name this message control after the user opens it.
- **Root question:** How should an open message control keep a readable name?
- **Options:**
  - **A.** Add direct readable-text checks for paragraphs and code blocks to the fallback condition. More block kinds need separate checks. Effort: Small.
  - **B.** Share one readable-text reader for transcript blocks and use it to decide when the hidden name is needed. Effort: Small.
  - **C.** Always set the control name from the complete plain-text message. Normal controls would then name content below the line too. Effort: Small.
- **Left out:** CSS cannot give the control a readable name. Changing nothing keeps the unnamed control.
- **Wider fix:** B. One block reader gives each content kind the same readable-name rule.
- **Previous examples:** Commit `712afd8f` introduced the earlier block-count condition. No other example was found in the focused check.
- **Related:** `plans/follow-ups/formatting-only-chat-heading.md` covers the same control when its lead is an empty heading. Its parser fix does not correct paragraphs or code blocks.
- **Recommendation:** B. Check readable block content in one place while keeping the normal control names.
- **Action:** fix after merge, apply B, because the problem already exists on main and does not come from the heading change.

Add the paragraph-before-table and empty-code-before-table cases to the
existing `MessageLine.dom.test.tsx` control-name test. Verify that the
hidden copy names the open control and contains no focusable chip. The
review confirmed the gap by reading the code and did not run a
reproduction.
