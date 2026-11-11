# The query of @ reads one text node only

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, finding 1 of review round 1: the wider fix that the branch split off.
- **Location:** `src/chat/components/chip-field/mention-content.ts` (`$mentionQuery`, `$pickMention`).
- **Reason:** the branch fixed the only split that a query meets today, so this work only guards later splits.

- **Terms:**
  - **Waiting mention:** a `MentionTextNode` in the message field: a mention of a draft or a paste whose entry the file tree does not hold yet.
  - **Query:** the text from `@` to the caret, which filters the list of `@`.
- **Background:** The list of `@` reads its query from the one text node that holds the caret, in `$mentionQuery`. A pick replaces the query inside that node, in `$pickMention`. A restored draft such as `Read @addr` holds a waiting mention, so typed text used to go into a new node, and the list did not open. The branch now turns a waiting mention into ordinary text when typing continues it, so the query stays in one node.
- **Problem:** The query still depends on how the field splits its text. A later node type that splits plain text would break the list again.
- **Impact if no action:** A later change can make the list miss a query, as the restored draft did.
- **Root question:** How does the list read the text from `@` to the caret, whatever nodes hold it?
- **Options:**
  - **A.** Keep the conversion of waiting mentions, and add nothing. Effort: Small.
  - **C.** Read the query backwards from the caret across the text nodes of the line, up to a space or a chip, and let a pick replace that range with a selection. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** The restored draft `Read @addr` of review round 1 of this branch.
- **Recommendation:** C, when the field gets a new node type that holds plain text.
- **Action:** fix after merge, apply C, because no split remains that a query meets today.
