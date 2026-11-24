# Two operator fixtures disagree on one user

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from pull request #671, branch `calummoore/universal-expo-app-milestone-1-mockups-emjd`, a problem that a review check found outside the scope.
- **Location:** `docs/mockups/src/fixtures/operatorUsers.ts:109` and `docs/mockups/src/fixtures/operatorRuns.ts:149`.
- **Reason:** the two fixtures are on `origin/main`, and the branch that found the conflict did not change them.

- **Source:** Review. **Category:** mockup.
- **Background:**
  - The operator section of the mockups shows the Users tab from `docs/mockups/src/fixtures/operatorUsers.ts`, and Long runs on the Overview from `docs/mockups/src/fixtures/operatorRuns.ts`.
  - The Users tab gives `@li-wei` 1 org.
  - Long runs shows runs of `@li-wei` in two orgs, Northwind and Kestrel Labs.
- **Problem:** The two fixtures give one person two different counts of orgs.
- **Impact if no action:** a reader of the catalogue sees conflicting facts, and a new page for `@li-wei` must pick one of them.
- **Root question:** Which orgs does `@li-wei` belong to in the sample data?
- **Options:**
  - **A.** Give `@li-wei` 2 orgs on the Users tab. Effort: Small.
  - **B.** Move one of the two runs to another person. Effort: Small.
  - **C.** Derive the org count of the Users tab from one membership fixture that both screens read. Effort: Medium.
- **Left out:** None.
- **Wider fix:** C, because one source of memberships keeps the screens in step.
- **Previous examples:** None found.
- **Recommendation:** A. It is the smallest change, and Long runs keeps its rows.
- **Action:** fix after merge, apply A, because the fixtures are outside the branch that found the conflict.
