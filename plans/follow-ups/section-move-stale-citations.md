# A moved doc section leaves stale citations

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-25, from branch `calummoore/remove-repo-from-menu-ouc2`, wider fix of review finding 5.
- **Location:** None
- **Reason:** The rule lives in the shared skills repository `futex-ai/skills`, outside this repository.

- **Background:**
  - The branch moved the "Repository changes" part of `docs/protocol/org-image.md` to `docs/protocol/org-image-repositories.md`.
  - Seven live lines in plans and follow-up items still credited the old page. The branch fixed them.
  - The `documentation` skill and "Removals and renames" in the `git-commit` skill ask for a search for a moved name. A line that credits only the old page, with no section name, escapes that search.
- **Problem:** A section move can leave live citations that point to the wrong page.
- **Impact if no action:** A later agent looks for or edits a rule in the wrong doc.
- **Root question:** How does a section move find every live line that credits the old page?
- **Options:**
  - **D.** In `futex-ai/skills`, say that a move of a section to another page is a rename, in the `documentation` skill and in the `git-commit` skill. The search then covers the old page path, and each hit is checked. Effort: Small.
  - **E.** Cite a protocol section in follow-up items as a link to its heading, so that a future link check sees a move. Effort: Medium.
- **Left out:** Pointer headings in the old page: no one knows when to remove them.
- **Wider fix:** D.
- **Previous examples:** `plans/follow-ups/doc-references-unchecked.md`.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because the rule lives in another repository.
