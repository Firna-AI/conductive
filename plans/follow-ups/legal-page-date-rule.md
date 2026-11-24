# The effective date rule names only the Terms

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, wider fix split from finding 55 of the review of branch `calummoore/object-memory-history-and-files-state-14g5`.
- **Location:** `AGENTS.md:169-172`, `src/marketing/README.md:137`, `src/marketing/privacy.ts:263-267`.
- **Reason:** The fix edits repository rules outside the files of the branch that found it.

**Terms**
- **Legal pages:** the Terms page in `src/marketing/terms.ts` and the Privacy page in `src/marketing/privacy.ts`.

**Background:** `AGENTS.md` and `src/marketing/README.md` say that a change to the Terms text sets the effective date at the top of the Terms. They say nothing about the Privacy page. The Privacy page itself promises, under "Changes to this notice", that the operator updates its effective date. Of the last 60 commits on `main` that touched the Privacy source files, 18 changed the text but kept an older date, for example `335942653`, `d0f24d1b3`, `d8489ebe7`, and `9983ba58b`.

**Problem:** An editor of the Privacy page finds no work rule for its effective date.

**Impact if no action:** Privacy text keeps changing without a new effective date, against the page's own promise.

**Root question:** How does every editor of a legal page find its effective date step?

**Options:**
- **A.** Change the date sentence in `AGENTS.md` and `src/marketing/README.md` to: "A change to the text of a legal page sets the effective date at the top of that page to the date of the change." Keep the sentence about the Terms revision. Effort: Small.
- **B.** Add a digest of the Privacy text, as `TERMS_VERSION` does for the Terms. It adds a new check, which needs the user. Effort: Medium.

**Left out:** None.

**Wider fix:** A is the rule for the class.

**Recommendation:** A. Confirm the `AGENTS.md` wording with Cal, because `AGENTS.md` holds the repository rules.

**Action:** fix after merge.
