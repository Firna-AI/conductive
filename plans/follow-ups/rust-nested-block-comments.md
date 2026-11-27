# Rust nested block comments end too early

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from the review of branch `calummoore/auto-color-code-blocks-f7cr`.
- **Location:** `src/files/code/highlight.ts:62`, `src/files/code/languages.ts`, the `rust` family.
- **Reason:** `origin/main` has the same defect, and nested comments are rare in Rust code.

- **Source:** Review. **Category:** Product bug.
- **Background:** The shared colourer `highlightLines` in `src/files/code/highlight.ts` colours file tabs, diffs, chat code blocks, and the Markdown preview. Rust has its own family in `src/files/code/languages.ts`. In Rust, block comments nest.
- **Problem:** The colourer ends a block comment at its first `*/`. So the end of `/* outer /* inner */ still comment */` shows as code.
- **Impact if no action:** A Rust file or block with a nested comment shows part of the comment in code colours.
- **Root question:** How does a Rust block comment end at its matching `*/`?
- **Options:**
  - **A.** Add a nesting flag to block comment rules, and keep a depth count in the comment mode, also across lines. Add a regression test. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** A colour library, because code colours decision 1 A of 2026-11-26 rejected it.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. A depth count stays linear.
- **Action:** fix after merge, apply A, because the code is outside the scope of the branch that found it.
