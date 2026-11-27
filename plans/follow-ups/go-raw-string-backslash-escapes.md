# Go raw strings read a backslash as an escape

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from the review of branch `calummoore/auto-color-code-blocks-f7cr`.
- **Location:** `src/files/code/languages.ts:47`, `src/files/code/highlight.ts:22`.
- **Reason:** `origin/main` has the same defect, and the code block colours branch does not change the Go rules.

- **Source:** Review. **Category:** Product bug.
- **Background:** The shared colourer `highlightLines` in `src/files/code/highlight.ts` colours file tabs, diffs, chat code blocks, and the Markdown preview. Go files use the C family of `src/files/code/languages.ts`. Its backtick string is a multi-line string, which Go uses for raw strings, where a backslash is literal.
- **Problem:** `closeAt` skips the character after a backslash in every string. So in ``strings.Split(p, `\`)`` the closing backtick is skipped, the string stays open, and the next lines show in the string colour.
- **Impact if no action:** A Go file or block with a backslash at the end of a raw string shows wrong colours below it.
- **Root question:** How does a Go raw string keep its backslash literal?
- **Options:**
  - **A.** Give the backtick rule of the C family the flag that says a backslash does not escape. The Rust raw string fix of 2026-11-26 added such a flag to the string rules. Add a regression test. Effort: Small.
  - **B.** Give Go its own family, with Go keywords, and the flag. Effort: Medium.
- **Left out:** A colour library, because code colours decision 1 A of 2026-11-26 rejected it.
- **Wider fix:** None. The string rule flag is already the structural fix.
- **Previous examples:** The Rust raw string fix of branch `calummoore/auto-color-code-blocks-f7cr`.
- **Recommendation:** A. It is one flag and one test.
- **Action:** fix after merge, apply A, because the code is outside the scope of the branch that found it.
