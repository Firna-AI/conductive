# Base branches describe an obsolete Archive check

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, during main integration in the E2B provider branch.
- **Location:** `docs/protocol/base-branches.md`, the paragraph about an Archive check.
- **Reason:** Main added this unrelated base-branch text while the provider change was under review.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Terms:**
  - **Base branch:** The branch from which a workspace starts its own branch.
  - **Archive:** The action that stops a workspace computer and retains it for a 14-day Restore window.
- **Background:** Pull request routine workspaces have a recorded base branch. The base-branch protocol describes their Git behavior.
- **Problem:** The page says that an Archive check excludes pull request commits from unpushed work. Archive now performs no Git work check.
- **Impact if no action:** Readers can infer a work check that the app does not run.
- **Root question:** How should the base-branch page describe current Archive behavior?
- **Options:**
  - **A.** Replace the obsolete check statement with a link to the current Archive requirements. Keep pull request Git rules in their own paragraphs. Effort: Small.
  - **B.** Add a Git check to Archive. This changes the selected immediate Archive behavior and requires a user decision. Effort: Medium.
- **Left out:** Keeping the statement fails accuracy. A prose test is not appropriate. These two approaches differ in which behavior remains authoritative.
- **Wider fix:** None. The documentation skill already requires fact alignment across protocol pages.
- **Previous examples:** The old public credential guides also retained facts after the gateway behavior changed.
- **Recommendation:** A. It follows the existing Archive choice without changing product behavior.
- **Action:** fix after merge, apply A, because this is a small documentation issue outside the provider change.

The current requirement is `docs/protocol/workspace-life.md#archive`.
It says that Archive acts at once, with no work check and no question.
Read that section before changing the base-branch paragraph.
