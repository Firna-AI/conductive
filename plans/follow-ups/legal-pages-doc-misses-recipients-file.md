# Keep one list of legal page sources

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from branch `calummoore/untitled-v4`, the full read of the legal pages for its protocol doc change.
- **Location:** `src/marketing/legal-pages.md`, the paragraph that names the files of the legal pages, and the legal pages rule in `AGENTS.md`.
- **Reason:** The reporting branch already fixes the missing-file complaint. The remaining source-list consolidation stays separate from this merge.

- **Source:** Implementation. **Category:** Docs or spec.
- **Background:**
  - The reporting branch adds `privacy-recipients.ts` to the lists in `AGENTS.md`, `src/marketing/README.md`, and `src/marketing/legal-pages.md`.
  - Those lists also name `privacy.ts`, `privacy-uses.ts`, and `privacy-transfers.ts`. The legal pages doc names `terms.ts`, `terms-org.ts`, and `legal-text.ts` too.
  - `privacy.ts` imports `privacyRecipientsSection` from `src/marketing/privacy-recipients.ts`. That file holds the recipients section of the Privacy page.
  - The factual missing-file fix came in commit `3e7e2ead`. The recommended single-list consolidation remains separate work.
- **Problem:** Several docs repeat the legal-source file list. The current lists include the recipients file, but a later section move can leave one list stale.
- **Impact if no action:** Each later section move must update all copies. A stale copy can direct an agent to an incomplete Privacy page.
- **Root question:** How does an agent find every file that holds the words of the legal pages?
- **Options:**
  - **A.** Keep the complete explicit lists. The earlier missing-file addition is done, but every later section move must update each list. Effort: Small.
  - **B.** Keep the complete list in `legal-pages.md`. Link to it from the legal-pages rule in `AGENTS.md` and from `src/marketing/README.md`, instead of repeating the section filenames. Effort: Small.
  - **C.** Keep each legal page in one file. It undoes the split that keeps each file under the length limit. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B, because one list then names every file, and the rule points to it.
- **Previous examples:** The recipients section moved to its own file before every source list named it. The reporting branch repaired those lists in `3e7e2ead`.
- **Recommendation:** B. One list stays the single place that names the files.
- **Action:** fix after merge, apply B, because the current lists are complete and their consolidation is separate documentation work.
