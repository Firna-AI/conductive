# An empty list item takes the blocks after it

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, review round 3, finding 5.
- **Location:** `src/markdown/list-items.ts`, the blank-line branch of `itemLines`.
- **Reason:** the input is unusual, and the fix costs the same after the merge.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Shared list reader:** `readList` of `src/markdown/list-items.ts`, which the chat and the file preview use to read the items of a list.
  - **Empty item:** a list item whose marker line has no text, such as `-` or `1.` alone.
- **Background:**
  - On 10 November 2026, the user chose that the chat reads lists by the CommonMark list rules of the file preview. `docs/protocol/chat-markdown.md`, section Lists, records it.
  - CommonMark says that a list item can begin with at most one blank line. The empty marker line counts as that line, so the next blank line ends an empty item (CommonMark example 280).
  - `itemLines` adds every blank line to the item, also a second blank line under an empty marker line. The file preview had the same rule since commit `68a53b65`, and the nested-list branch moved the chat onto it.
- **Problem:** For `-`, a blank line, then `  Outside`, both views put `Outside` inside the item. CommonMark keeps the item empty and shows `Outside` after the list. Any indented block after the blank line joins the item, also `  - inner`, which then shows as a nested list.
- **Impact if no action:** A paragraph or a list after an empty item shows under the wrong item.
- **Root question:** How should both views end a list item that starts empty, so that no later block joins it?
- **Options:**
  - **A.** In `itemLines`, when the marker line has no text, skip the blank lines after it, then end the item. A sibling marker after them still continues the list, so `-`, a blank line, `- b` and `1.`, a blank line, `2. Second` each stay one list. Check the text of the marker line before the task box is removed, so `- [ ]` above a blank line keeps its indented text. Add the case to the item-end test in `src/chat/components/agent-text.test.ts`. Effort: Small.
  - **B.** Read both views with one CommonMark engine, as `plans/follow-ups/one-markdown-reader-for-chat-and-preview.md` describes. Effort: Large.
  - **C.** A, and add a seeded property test that compares the list structure of both views with satteri, which `@astrojs/markdown-satteri` already provides. It needs `fast-check`, it fails until `plans/follow-ups/list-lazy-line-read-as-block.md` is fixed, and it is a test for the class, which needs the user's approval. Effort: Medium.
- **Left out:** Changing nothing, because it fails the goal. Recording the gap in the protocol doc, because it breaks the user's choice of the CommonMark list rules. A fix in each parser, because A is one change, and a parser sees the item only after the task box is removed.
- **Wider fix:** B. Only a CommonMark library removes the class. The file preview's own parser has the same defect.
- **Previous examples:** A one-time comparison by the check of the finding ran 38,299 seeded documents through the file preview and commonmark.js 0.31.2. All 41 distinct inputs that A repairs have an empty marker line above a blank line, and A made no input worse.
- **Related:** `plans/follow-ups/list-lazy-line-read-as-block.md` fixes the same loop of `readList`, and one branch can fix both, with shared tests.
- **Recommendation:** A. One change in the shared reader fixes both views.
- **Action:** fix after merge, apply A, because the input is unusual, and the fix costs the same later.
