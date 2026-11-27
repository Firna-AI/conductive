# Merge queue in the app passes the doc length target

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from the review of branch `calummoore/remove-drag-to-merge-queue-p999`.
- **Location:** `docs/protocol/merge-queue-in-the-app.md`.
- **Reason:** the doc already had 261 lines on `origin/main`, before this branch.

- **Source:** Review. **Category:** Docs or spec.
- **Background:** The documentation rules keep each protocol doc near 250 lines, and split a longer doc into linked pages.
- **Problem:** The doc has more than 260 lines.
- **Impact if no action:** The doc is harder to read and review.
- **Root question:** How does the doc return under the length target?
- **Options:**
  - **A.** Move the Drags and Add to merge queue sections to a linked page. Effort: Small.
- **Left out:** A new length lint for Markdown, because it is a new gate that needs the user.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
