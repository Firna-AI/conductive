# Table header takes list, quote, and heading lines

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/output-summary-f7sm`, the check of the follow-up items after the shared Markdown parser replaced both readers. It takes the table case of `plans/follow-ups/list-lazy-line-read-as-block.md`.
- **Location:** `src/markdown/parser.ts`, where the shared parser sets the rules of `markdown-it`. The cause is the order of the block rules of `markdown-it` 15.0.3, in `node_modules/markdown-it/dist/markdown-it.mjs`.
- **Reason:** only a line that starts a list item, a quote, or a heading, holds a pipe, and has a separator row under it meets it, and the fix costs the same later.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Separator row:** the second row of a GitHub table, such as `--- | ---`. It makes the line above it the header row.
  - **Shared parser:** `markdownParser` in `src/markdown/parser.ts`. It is the `markdown-it` parser that reads agent messages and the file preview, with the tables of GitHub.
- **Background:**
  - Agent messages and the file preview read tables with the shared parser, as `docs/protocol/chat-markdown.md` and `docs/protocol/chat-tables.md` say.
  - GitHub opens a list item or a quote first, and reads a heading line as a heading. A table forms only from the lines of a paragraph.
  - `markdown-it` tries its `table` rule before every other block rule. The rule tests the indent and the pipes of the line. It does not test whether the line starts a list item, a quote, or a heading.
  - Before the shared parser, both views read `- a | b` above `--- | ---` as a table inside the list item.
- **Problem:** A probe of 17 November 2026 gave a table in both views for each of these, with the mark of the line in the first header cell:
  - `- a | b` above `--- | ---`, or above `  --- | ---`: the cell `- a`, and no list.
  - `1. a | b` above `--- | ---`: the cell `1. a`, and no list.
  - `> a | b` above `--- | ---`: the cell `> a`, and no quote.
  - `# a | b` above `--- | ---`: the cell `# a`, and no heading.

  The independent renderer `satteri` reads the GitHub way: a list item or a quote with one paragraph, a table inside the item when the separator row has the indent of the item, and a heading with a paragraph under it. A table under a line of text and a table indented in a list item read correctly in both views.
- **Impact if no action:** Such a line shows its list mark, quote mark, or heading mark as text in a table header, and the list, the quote, or the heading goes away.
- **Root question:** How do both views read a line that starts a list item, a quote, or a heading as that block before a table can take it?
- **Options:**
  - **A.** In `src/markdown/parser.ts`, wrap the `table` rule, so that it refuses a header line that starts a list item, a quote, or a heading. Cost: the wrapper copies the start tests of three rules. Effort: Small.
  - **B.** In `src/markdown/parser.ts`, move the `table` rule after the `list`, `blockquote`, and `heading` rules, with the same terminator list. A scratch parser with this order read each case above as `satteri` does. It changed the HTML of none of the 652 CommonMark 0.31.2 examples. The tests of the repository did not run with it. Effort: Small.
  - **C.** Report the order to the `markdown-it` project, and adopt the release that changes it. Cost: both views keep the defect until then. Effort: Small, with an unknown wait.
- **Left out:** Changing nothing, because both views then lose a list, a quote, or a heading. Another Markdown library, because it reverses Markdown parser decision 3 C of 16 November 2026 for a rare input.
- **Wider fix:** B. With the `table` rule after the rules of containers and headings, no line that starts another block can become a header row.
- **Previous examples:** The table case of `plans/follow-ups/list-lazy-line-read-as-block.md`, with the readers that the shared parser replaced.
- **Related:** `plans/follow-ups/list-lazy-line-read-as-block.md` records another defect of the block rules of `markdown-it`. Both fixes change `src/markdown/parser.ts`, so one branch can fix both.
- **Recommendation:** B. One change of the rule order fixes each case, and the CommonMark examples keep their results.
- **Action:** fix after merge, apply B, because only an unusual line meets it, and the fix costs the same later.
