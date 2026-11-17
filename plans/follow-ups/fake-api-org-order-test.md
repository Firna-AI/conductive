# A test checks only the fake org moves

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the check of review finding 2 of the branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** `src/test-support/fake-org-order-routes.test.ts:7`.
- **Reason:** The test came with PR #293 on `origin/main`, outside the terminal tabs change.

- **Source:** Review.
- **Category:** Test.
- **Terms:**
  - **FakeApiServer:** the in-memory copy of the Worker API in `src/test-support/fake-api.ts`, which app tests and development pages use.
- **Background:** The `testing` skill says that test harness internals never get a test. The terminal tabs change removed `src/test-support/fake-terminal-routes.test.ts` for this reason (review finding 2).
- **Problem:** `fake-org-order-routes.test.ts` calls `FakeApiServer` directly and checks its own org move rules. It can pass while the Worker's org move is broken, and the Worker has its own tests of that route.
- **Impact if no action:** The gate keeps a test of a second implementation that protects no production behaviour.
- **Root question:** How do the tests protect the org order without testing the fake itself?
- **Options:**
  - **A.** Remove the test under the removal rule of the `testing` skill, after a check that the Worker route tests and the app tests that use the fake cover the org move. Effort: Small.
  - **B.** Keep the test. Effort: Small.
- **Left out:** A lint that rejects tests under `src/test-support/`. It is a new gate, which needs the user.
- **Wider fix:** None. The `testing` skill rule is in force.
- **Previous examples:** Review finding 2 of the terminal tabs change.
- **Recommendation:** A. It follows the testing rule in force.
- **Action:** fix after merge, apply A, because the test is outside the diff.
