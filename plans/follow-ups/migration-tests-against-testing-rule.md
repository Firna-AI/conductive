# Migration tests contradict the testing rule

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from branch `calummoore/milan-mq6q`, review round 1.
- **Location:** `worker/app-api/new-workspace-view-migration.test.ts` and three other `*-migration.test.ts` files under `worker/`
- **Reason:** The tests are on `main` and outside the diff of the branch that found them.

- **Terms:**
  - **One-time migration:** a SQL file under `migrations/` that D1 applies once. A merged migration never changes.
- **Background:** The `testing` skill says that a migration never gets a test. Its proof is a one-time run whose output the branch keeps. Four test files on `main`, among them `worker/app-api/new-workspace-view-migration.test.ts`, test one-time migrations. They are `worker/app-api/agent-login-migration.test.ts`, `worker/app-api/new-workspace-view-migration.test.ts`, `worker/github/summary-migration.test.ts`, and `worker/members/org-order-migration.test.ts`.
- **Problem:** The repository and the testing rule disagree. Either the tests break the rule, or the rule misses a case that these tests cover.
- **Impact if no action:** The gate keeps running tests of code that never runs again, and agents get two signals about migration tests.
- **Root question:** Do one-time migrations get a test in this repository?
- **Options:**
  - **A.** Remove the four tests under the removal rule of the `testing` skill, with its proof. Effort: Small.
  - **B.** Keep the tests and add the case to the `testing` skill, for example a migration that rewrites existing rows. Effort: Small.
- **Left out:** Change nothing: the disagreement stays.
- **Wider fix:** None. The `testing` skill is the rule in force.
- **Previous examples:** None found.
- **Recommendation:** A. The rule in force says that a migration gets no test.
- **Action:** ask the user, because A removes tests that are on `main`, which needs the user's approval.
