# Legal pages doc omits the recipients file

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/untitled-v4`, the full read of the legal pages for its protocol doc change.
- **Location:** `src/marketing/legal-pages.md`, the paragraph that names the files of the legal pages, and the legal pages rule in `AGENTS.md`.
- **Reason:** the branch did not change the legal pages or their docs.

- **Source:** Implementation. **Category:** Docs or spec.
- **Background:**
  - `AGENTS.md` says: when a change touches a fact in the architecture doc or a protocol doc, read both legal pages in full. It names them as `src/marketing/terms.ts` and `src/marketing/privacy.ts`.
  - `src/marketing/legal-pages.md` says that `terms.ts` with `terms-org.ts`, `privacy.ts` with `privacy-uses.ts`, and `legal-text.ts` hold the words of the legal pages.
  - `privacy.ts` also imports `privacyRecipientsSection` from `src/marketing/privacy-recipients.ts`. That file holds the recipients section of the Privacy page.
- **Problem:** Neither doc names `privacy-recipients.ts`, and `AGENTS.md` names none of the section files.
- **Impact if no action:** An agent that reads only the named files can miss a sentence of the Privacy page that restates a changed fact.
- **Root question:** How does an agent find every file that holds the words of the legal pages?
- **Options:**
  - **A.** Add `privacy-recipients.ts` to the file list in `legal-pages.md`. Effort: Small.
  - **B.** Do A, and make the `AGENTS.md` rule link to that list instead of naming two files. Effort: Small.
  - **C.** Keep each legal page in one file. It undoes the split that keeps each file under the length limit. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B, because one list then names every file, and the rule points to it.
- **Previous examples:** None found.
- **Recommendation:** B. One list stays the single place that names the files.
- **Action:** fix after merge, apply B, because the files are outside the branch that found the gap.
