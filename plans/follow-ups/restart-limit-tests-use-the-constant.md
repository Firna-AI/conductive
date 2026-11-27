# Restart limit tests compute their boundary from the constant

- **Severity:** Low. **Effort:** Small.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from the finding checks of branch `calummoore/background-task-missing-work-zqja`.
- **Location:** `worker/lifecycle/software-restart.test.ts` (lines 70 and 74) and `worker/lifecycle/durable-restart.test.ts` (line 92).
- **Reason:** the files are outside the diff of the branch.

- **Source:** Review. **Category:** Test.
- **Background:** `docs/protocol/restart-the-software.md` gives a restart limit of 3 minutes. The tests build both sides of the boundary from the imported `SOFTWARE_RESTART_LIMIT_MS`.
- **Problem:** A change of the constant still passes the tests.
- **Impact if no action:** The gate accepts a wrong restart limit.
- **Root question:** How do the tests catch a restart limit other than 3 minutes?
- **Options:**
  - **A.** Use literal values on both sides of the 3-minute boundary. Effort: Small.
- **Left out:** A lint for timer constants in tests, because it is a new gate.
- **Wider fix:** None. The testing skill already requires literal expected values.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the files are outside the diff.
