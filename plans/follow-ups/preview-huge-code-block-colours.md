# Huge coloured preview blocks freeze the tab

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-26, from branch `calummoore/auto-color-code-blocks-f7cr`, implementation item of the coloured code blocks milestone.
- **Location:** `src/files/markdown/preview-blocks.ts`, the `fence` case, and `src/files/code/CodeText.tsx`.
- **Reason:** the fix adds a limit that `docs/protocol/chat-code-blocks.md` does not state, so the user decides.

- **Source:** Implementation. **Category:** Performance.
- **Background:** The Markdown file preview parses each file in a module worker, up to the 5 MiB read limit. Since 2026-11-26, the worker also colours each code block with a known fence label and posts the coloured tokens to the page. The page draws one span for each token with `CodeText`. A file tab of a code file draws its spans in the same way.
- **Problem:** One measurement of a 5 MiB file with one block:
  - Rust code, no label: parse 24 ms, copy to the page 3 ms.
  - Rust code, label `rust`: parse 348 ms, 419,424 tokens, copy 197 ms.
  - Crafted `1+1+…`, label `rust`: parse 492 ms, 5,079,009 tokens, copy 2,224 ms.
  After the copy, the page draws millions of spans. Before the change, such a block was one text node.
- **Impact if no action:** A huge or crafted Markdown file freezes its preview tab for seconds. A file tab of the same code costs the same today.
- **Root question:** How does the preview stay responsive for a huge labelled code block?
- **Options:**
  - **A.** Change nothing. The preview costs the same as a file tab of the same code. Effort: Small.
  - **B.** Colour a block only up to a size cap, such as 200 KB. A larger block shows plain text. Add the cap to `docs/protocol/chat-code-blocks.md`. Effort: Small.
  - **C.** Draw only the lines that are in view, in the preview and in file tabs. Effort: Large.
- **Left out:** A compact reply format from the worker, because the page still draws millions of spans.
- **Wider fix:** C.
- **Previous examples:** The preview already caps the empty table cells that it adds at 65,536 for each file.
- **Recommendation:** B. It keeps the page responsive with little code. C protects the codebase best, at a much higher cost.
- **Action:** ask the user, because the protocol says a block with a known label shows colours, and no recorded decision allows a size cap.
