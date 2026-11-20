# Broken Line targets link in HTML preview doc

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from the review of branch `calummoore/expand-modal-preview-3fjj`.
- **Location:** `docs/protocol/html-file-preview.md:43`.
- **Reason:** the link was already broken on `origin/main`, and the Expand branch does not change that sentence.

- **Source:** Review. **Category:** docs or spec.
- **Background:** The HTML file preview doc links to the rules of line targets, such as `report.html:12`, for a Markdown file. The heading "Line targets" moved from `file-mentions.md` to `file-mentions-answers.md`. `docs/protocol/file-mentions.md:164` and `docs/protocol/workspace-tools.md:31` already link to the new place.
- **Problem:** The link `file-mentions.md#line-targets` points to a heading that does not exist.
- **Impact if no action:** A reader of the protocol doc lands at the top of the wrong doc. No command checks Markdown links.
- **Root question:** How does the doc point to the rules of line targets?
- **Options:**
  - **A.** Change the link to `file-mentions-answers.md#line-targets`. Effort: Small.
- **Left out:** A link check in the gate, because it is a new gate that the user must approve.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the link is outside the Expand change.
