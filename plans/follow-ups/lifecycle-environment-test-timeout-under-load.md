# Lifecycle environment test times out under suite load

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, scoped verification during fix round 1 of PR #60.
- **Location:** `worker/lifecycle/runner-environment.test.ts`, its backend fixture, and the shared lifecycle start harness.

- **Terms:**
  - **Lifecycle environment test:** the integration case that checks captured env settings on create, resume, an already-running resume, and disk retention.
  - **Hang guard:** the test runner's existing 15,000 ms limit for a test that does not finish.
- **Background:** The test uses local D1, fake providers, and the real lifecycle start flow. A selected Worker run covered 44 tests in 17 files. This branch removed obsolete private runner-list expectations from the case. Its start and resume steps did not change.
- **Problem:** The case failed with `Test timed out in 15000ms`. Its body took 15,565 ms. The other 43 tests passed. The same case passed alone on its one isolated rerun, whose command took 8.33 seconds. Concurrent Miniflare load is the suspected source, not a proved cause. Changed startup plumbing can also affect its cost.
- **Impact if no action:** A correct change can get a failed gate under load. An isolated pass does not make the suite deterministic.
- **Root question:** How can this lifecycle case remain stable under the load of the full suite?
- **Options:**
  - **A.** Reproduce the timing difference and measure fixture steps before changing them. Remove unnecessary harness work or replace the proved nondeterminism with controlled state. Keep every assertion and the existing guard. Effort: Medium.
  - **B.** Split create/resume and retention into independent isolated cases, while retaining every assertion. Extra setup can increase total test cost. Effort: Medium.
  - **C.** Change the hang guard after measuring the expected loaded duration. This needs user approval and can hide slow work without fixing its cause. Effort: Small.
- **Left out:** Skips, retries, sleeps, weakened assertions, and concurrency changes hide or avoid the failure. No evidence yet selects a production performance change.
- **Wider fix:** A. A proved fixture cause permits a structural fix instead of another timing allowance.
- **Previous examples:** No matching follow-up item was found before this item was added.
- **Recommendation:** A. Find the actual slow or nondeterministic step before changing a test boundary.
- **Action:** fix after merge, apply A, because the functional review fixes pass their repeated regressions and this timing investigation needs its own scope. Add no timeout increase, retry, skip, or configuration change without the required approval.
