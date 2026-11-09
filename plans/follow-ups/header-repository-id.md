# The header shows the internal repository ID

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/command-palette-mockups`, review round 2, a new problem of the check of finding 5.
- **Location:** `src/shell/workspace/WorkspaceHeader.tsx:59`.
- **Reason:** the header is on `origin/main`, and the command palette branch did not change it.

- **Terms:**
  - **Repository ID:** the internal ID of a repository of an org, in the form `github-<org>-<number>`.
- **Background:** The header of a workspace names its repository, such as `acme/storefront`. It finds the name in the repositories of the org, which the app reads apart from the workspace. While that read runs, or after it fails, the header shows `workspace.repositoryId` in place of the name.
- **Problem:** The person sees an internal ID, such as `github-acme-1`, in the header for a moment, or for good after a failed read. The `product-ui` skill forbids code identifiers in text that users read.
- **Impact if no action:** Each open of a workspace can flash an internal ID, and a failed read leaves it in the header.
- **Root question:** What does the header show while the name of the repository is not known?
- **Options:**
  - **A.** Show nothing in the place of the repository until the name is known, and keep the branch. Effort: Small.
  - **B.** Send the repository name with the workspace record or with the workspace list, from D1, which already holds it. The header then never waits for a second read. Effort: Medium.
- **Left out:** A spinner in the header, because it draws attention to a detail that the branch already gives.
- **Wider fix:** B. The name then comes with the workspace, so no screen waits for a second read.
- **Previous examples:** The same read also leaves the command palette without repository names. The palette shows a status part while they load or after they fail, as `docs/protocol/command-palette-states.md` says. Decision 164 rejected sending the names with the list for the palette.
- **Recommendation:** A, because it removes the internal ID with a small change in the header. B best protects the codebase, because the name then comes with the workspace.
- **Action:** fix after merge, apply A, because the header is outside the diff of the palette.
