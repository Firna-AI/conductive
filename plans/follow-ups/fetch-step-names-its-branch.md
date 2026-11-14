# The fetch step does not name the branch

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-14, from the review of branch `calummoore/delft-39rk` (workspace starts from another branch), the check of review item 2.
- **Location:** `worker/lifecycle/start-progress.ts:38`, `worker/lifecycle/creation-fetch-label.ts:22`, `worker/lifecycle/start-step-label.ts:4`, `docs/mockups/src/fixtures/starting.ts:21`.
- **Reason:** The direct fix shipped, and the wider fix changes a label that already ships on `main`, which needs the user.

- **Source:** Review.
- **Category:** UX wording.
- **Terms:**
  - **Start step:** a progress line that a new workspace shows while its cloud computer starts, such as "Fetching the default branch".
- **Background:**
  - A new workspace that starts from another branch shows "Fetching develop of storefront", with the short repository name.
  - A create from the default branch, a scheduled routine run, and Run now show "Fetching the default branch", and their branch step does not name the branch.
  - The mockups in `docs/mockups/src/fixtures/starting.ts` name the branch in both steps, and they use the full repository name, such as `acme/storefront`.
- **Problem:** The fetch step uses two shapes of words, and the product and the mockups disagree on the default create and on the repository name.
- **Impact if no action:** A member sees a generic label for a default create, and the visual spec stays out of step with the product.
- **Root question:** How does each start step name the branch and the repository that it fetches?
- **Options:**
  - **A.** No change. Effort: Small.
  - **B.** Send every create fetch through `creationFetchLabel`, so each label names its branch, such as "Fetching main of storefront". Change the mockups to the short name. Effort: Small.
  - **C.** B, with the full repository name in the product, as the mockups show. Effort: Small.
- **Left out:** A label that the browser builds, because agent creates and routine runs have no draft.
- **Wider fix:** B. One label path leaves no generic fetch text.
- **Previous examples:** None found.
- **Recommendation:** B. The member then always sees which branch the workspace fetches.
- **Action:** ask the user, because B changes a label that ships on `main`, and the choice of the repository name is a choice between two correct texts.
