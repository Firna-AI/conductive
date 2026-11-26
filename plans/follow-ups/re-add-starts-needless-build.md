# Adding back a removed repository builds needlessly

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from branch `calummoore/remove-repo-from-menu-ouc2`, the options check of the row menu Remove.
- **Location:** `src/shell/settings/RepositoriesTab.tsx:54`, `worker/app-api/feature-repositories-data.ts:89`
- **Reason:** The behaviour is on `main` and belongs to Done, not to the row menu change that found it.

- **Terms:**
  - **Org image:** the saved snapshot of the cloud computer of an org, from which each new workspace starts.
  - **Done:** the button that closes Edit on the Repositories tab of the org settings and saves its adds and removals.
- **Background:**
  - A removal starts no build, so the org image keeps a removed repository until the next build.
  - When an admin adds such a repository again before the next build, the org image still holds it, so it is ready at once.
  - Done still starts a build after every saved add, because the Worker reports a re-add as an add.
- **Problem:** Done starts a build that the org image does not need.
- **Impact if no action:** An admin who undoes a removal waits for a build, and the org pays for one more sandbox start.
- **Root question:** When does an add need a build of the org image?
- **Options:**
  - **A.** The Worker reports an add as `added` only when the newest org image does not hold the repository. Done then starts no build for a re-add. Effort: Small.
  - **B.** Done reads the repository notice state and starts a build only when a repository waits. Effort: Small.
  - **C.** Change nothing. A re-add before the next build is rare. Effort: Small.
- **Left out:** None.
- **Wider fix:** A. The Worker owns the facts about the org image, so every client gets the same answer.
- **Previous examples:** None found.
- **Recommendation:** A. The Worker already knows which repositories the newest image holds.
- **Action:** ask the user, because the change alters when Done starts a build, which decision 295 states.
