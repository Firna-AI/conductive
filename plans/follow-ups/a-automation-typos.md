# "a automation" in docs and comments

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the merge of `origin/main` into branch `calummoore/delft-zjk2`.
- **Location:** `docs/protocol/account-stats.md` (two places) and comments in `worker/app-api/account-stats*.ts` (three places).
- **Reason:** the rename of routines to automations on `main` left these words, and the org login branch does not change these files.

- **Source:** Review. **Category:** UX wording.
- **Background:** On `main`, a rename changed "routine" to "automation" in the docs and the code. Five places now say "a automation", which needs the article "an".
- **Problem:** The words "a automation" are wrong English.
- **Impact if no action:** Readers of the protocol doc and of the code comments see the error. No product screen shows it.
- **Root question:** How do these five places use the right article?
- **Options:**
  - **A.** Change each "a automation" to "an automation". Effort: Small.
- **Left out:** A lint for articles, because it is a new gate for one rename.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the files are outside the org login change.
