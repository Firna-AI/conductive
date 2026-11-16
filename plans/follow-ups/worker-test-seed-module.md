# Worker tests repeat their D1 seed inserts

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/seoul-1i6o`, review finding 5.
- **Location:** `worker/operator/overview.test-support.ts:79`, `worker/members/members-test-support.ts:148`, `worker/operator/directory.test-support.ts:75`, `worker/app-api/account-stats.test-support.ts:20`, `worker/routines/runs.test-support.ts`, `worker/routines/run-routes.test-support.ts`, `worker/routines/first-turn.test-support.ts`, `worker/routines/schedule-scan.test-support.ts`, and `worker/routines/routes.test-support.ts`.
- **Reason:** The fix moves many test-support files outside the change that found it, so it needs its own branch.

- **Terms:**
  - **Test-support file:** a `*.test-support.ts` module beside the Worker tests. It holds helpers that put rows into the local D1 database of a test.
  - **D1:** the Cloudflare SQLite database of the Worker.
- **Background:**
  - The Worker tests put rows into D1 through helpers in test-support files.
  - `seedWorkspace` exists twice: in `worker/operator/overview.test-support.ts` and in `worker/members/members-test-support.ts`.
  - `addMember` exists in `worker/operator/directory.test-support.ts`.
  - The routine test-support files and `worker/app-api/account-stats.test-support.ts` each insert their own `routines` and `routine_runs` rows.
- **Problem:** Several files hold their own copy of the same insert SQL for one table.
- **Impact if no action:** A schema change to `workspaces`, `org_members`, `routines`, or `routine_runs` must update each copy. Each new test file can add one more copy.
- **Root question:** How do Worker tests insert a record of one table through one shared helper?
- **Options:**
  - **A.** Change nothing. Each copy stays small. Effort: Small.
  - **B.** Add one shared seed module for the D1 records under `worker/test-support/`: workspaces, members, routines, and routine runs, each with optional fields. Move each test-support file to it, and delete the copies. Effort: Medium.
- **Left out:** A lint for duplicate insert SQL in tests. It adds a new gate, which needs the user, and B removes the copies instead of finding them.
- **Wider fix:** B, a structural fix.
- **Previous examples:** The two `seedWorkspace` helpers above, and the five routine test-support files that each insert routine rows.
- **Recommendation:** B. One helper for each record stops new copies.
- **Action:** fix after merge, apply B, because it changes many test-support files outside the change that found it.
