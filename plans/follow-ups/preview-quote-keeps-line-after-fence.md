# A preview quote keeps a line after its fence

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, the finding check of review round 2, finding 1.
- **Location:** `src/files/markdown/markdown-blocks.ts`, the method `quote` of `BlockParser`.
- **Reason:** the nested-list branch changed how a list item ends, and it did not change the quote reader.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **File preview:** the view that shows a Markdown file of the repository, parsed by `src/files/markdown/`.
  - **Lazy line:** a line without the `>` of a quote, or without the indent of a list item, that CommonMark adds to the open paragraph of that quote or item.
- **Background:**
  - The quote reader collects each line that starts with `>`, and each following line that is not blank and starts no block. Then it parses the collected lines as the content of the quote.
  - CommonMark adds such a line to the quote only while a paragraph of the quote is open.
  - The nested-list branch fixed the same rule for list items: `readList` now passes the lazy lines of an item to its parser, which stops at the first one that continues no paragraph.
- **Problem:** In a quote that holds a closed code fence, the next line without `>` stays in the quote. CommonMark ends the quote before that line.
- **Impact if no action:** The file preview shows such a line inside the quote, unlike GitHub.
- **Root question:** How does a quote of the file preview end at a line that continues no paragraph of the quote?
- **Options:**
  - **A.** Pass the lazy lines of a quote to `nested`, as list items do, and stop the parse at the first one that continues no paragraph. Effort: Small.
  - **B.** Change nothing, and keep the quote reader as it is. Effort: Small.
- **Left out:** A rule that drops all lazy lines of a quote, because CommonMark keeps lazy paragraph lines in a quote.
- **Wider fix:** The item `plans/follow-ups/one-markdown-reader-for-chat-and-preview.md` covers one block reader by CommonMark.
- **Previous examples:** Finding 1 of review round 2 of the nested-list branch, the same rule for list items.
- **Recommendation:** A. It reuses the mechanism that list items already use.
- **Action:** fix after merge, apply A, because the nested-list branch did not change the quote reader.
