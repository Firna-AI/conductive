# The GitHub banner protocol doc is too long

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from branch `calummoore/firna-ai-user-interface-discrepancy-lsqt`.
- **Location:** `docs/protocol/github-banner.md`.
- **Reason:** the branch changed one sentence of the doc, and a split moves about 300 lines that the branch does not change.

- **Source:** Implementation. **Category:** Docs or spec.
- **Background:**
  - The `documentation` skill sets a target of about 250 lines for each protocol doc. It says that a change that touches a doc over the target splits it into linked pages.
  - `docs/protocol/github-banner.md` has about 257 lines. It holds the GitHub App, the state of a branch, the pull request bar, and its actions. On 2026-11-23 the merge queue branch `calummoore/merge-queue-k2ep` moved Merge, Ready for review, After the merge, and The merge record to `docs/protocol/github-banner-merge.md`, and kept a stub section for each.
  - The branch that added `docs/protocol/repository-changes-on-github.md` added the repository webhook to one sentence of the GitHub App section, with a link to the new doc.
  - `docs/architecture/protocol-docs.md` lists each protocol doc and its child pages.
- **Problem:** The doc passes the length target, and the touch did not split it.
- **Impact if no action:** Readers and reviewers must read a long doc to find one rule.
- **Root question:** How does the GitHub banner spec get back under the length target?
- **Options:**
  - **A.** Move the GitHub App section to its own page, such as `docs/protocol/github-app.md`. Link it from the GitHub banner doc and from `docs/architecture/protocol-docs.md`. Update each link to `github-banner.md#the-github-app`. Effort: Small.
  - **B.** Move the Merge and the Checks tab rules to their own page instead. Both have their own page now: `docs/protocol/github-banner-merge.md` holds the Merge rules, and `docs/protocol/github-banner-layouts.md` holds the Checks tab. Effort: Small.
- **Left out:** Shortening the text in place was left out, because each sentence holds a requirement.
- **Wider fix:** None, because the skill already sets the rule.
- **Previous examples:** None found.
- **Recommendation:** A. The GitHub App section is the part that other docs link to, so its own page is the clearest home.
- **Action:** fix after merge, apply A, because the split is outside the scope of the branch.
