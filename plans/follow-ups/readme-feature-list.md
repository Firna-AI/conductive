# The README calls every feature planned

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the `Outside the scope` list of the check of finding 5 of the focused review of the deploy fixes on the primary branch `calummoore/conductor-alternative-architecture` (decision 141).
- **Location:** `README.md:28`, the first line of "Features".
- **Reason:** the sentence was already stale before the reviewed commits.

- **Background:** The README lists the features of Conductive under "Features". The protocol docs state each one.
- **Problem:** The section starts with "These features are planned", but the code already has most of them, such as GitHub sign-in and chat.
- **Impact if no action:** A reader thinks that the features do not exist yet.
- **Root question:** How does the feature list stay true as features ship?
- **Options:**
  - **A.** Replace the sentence with one that stays true, such as "Conductive has these features. The protocol docs state each one.", and mark each feature that is not built yet. Effort: Small.
- **Left out:** A status for each feature in the README, because it goes stale with each change. The plan holds the progress.
- **Wider fix:** None. The `documentation` skill already says that a README gives current facts, not progress.
- **Previous examples:** finding 5 of that review, the deployment status of the README.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
