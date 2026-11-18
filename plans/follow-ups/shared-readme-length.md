# The shared README passes 300 lines

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the second merge of `main` into the branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** `src/shared/README.md`.
- **Reason:** Main grew the file to 310 lines, and the terminal tabs change does not touch it.

- **Source:** Implementation.
- **Category:** Repository rule.
- **Background:** The always-on rules say to keep files near 200 lines and to split a file that passes 300. The lint checks only code files, so it does not catch a Markdown file.
- **Problem:** `src/shared/README.md` has 310 lines on main.
- **Impact if no action:** The file is harder to read, and it breaks the length rule.
- **Root question:** How does the shared README stay under the length limit?
- **Options:**
  - **A.** Split it into linked pages by topic, and keep the anchors that other files link to. Effort: Small.
  - **B.** Leave it. Effort: Small.
- **Left out:** A lint for Markdown length. It is a new gate, which needs the user.
- **Wider fix:** None. The rule is in force.
- **Previous examples:** This branch split `src/terminal/README.md` and `src/shell/workspace/screen-parts.md` for the same rule.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the file is outside the diff.
