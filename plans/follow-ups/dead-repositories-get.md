# A route branch for org repositories never runs

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/command-palette-mockups`, review round 2, a new problem of the check of finding 5.
- **Location:** `worker/app-api/shell.ts:44`, and the route order at `worker/routes.ts:47`.
- **Reason:** both files are on `origin/main`, and the command palette branch did not change them.

- **Terms:**
  - **Route order:** the order in which the Worker gives a request to its route handlers. The first handler that answers wins.
- **Background:** The shell route of the Worker answers a GET of the org repositories path, `orgSettingsPaths.repositories(orgId)`, with the repositories from D1. The router calls `featureShellRoute` before that shell route, and the check of the review found that `featureShellRoute` answers the same request first.
- **Problem:** The GET branch of the shell route for the org repositories never runs, so it is likely dead code beside the answer that the app uses.
- **Impact if no action:** Two code paths seem to answer one request. A change to the dead one changes nothing, which misleads the next reader.
- **Root question:** Which handler answers a GET of the org repositories, and does the other path have a use?
- **Options:**
  - **A.** Confirm with a search and a test that `featureShellRoute` answers the request in each case. If it does, delete the dead branch and the tests that cover only it, as the dead-code steps of the `git-commit` skill say. Effort: Small.
  - **B.** Keep the branch and add a comment that names the handler that answers first. Effort: Small.
- **Left out:** Change nothing, because two paths for one request stay.
- **Wider fix:** None. The dead-code predicate of the `git-commit` skill already covers the class.
- **Previous examples:** None found.
- **Recommendation:** A, after the search proves the branch dead under each condition of the predicate.
- **Action:** fix after merge, apply A, because the Worker routes are outside the diff of the palette.
