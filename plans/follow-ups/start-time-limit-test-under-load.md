# A start time limit test can time out under load

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from the `Outside the scope` list of the focused review of the deploy fixes on the primary branch `calummoore/conductor-alternative-architecture`, which decision 141 asked for.
- **Location:** `worker/lifecycle/start-job-time-limit.test.ts:64`.
- **Reason:** the test is outside the reviewed commits.

- **Terms:**
  - **Gate:** `npm run check`, the complete set of checks that CI runs.
  - **Backend fixture:** the lifecycle test setup, with a local D1 database and a fake sandbox provider.
- **Background:** The case `gives each resume its own deadline and restores an old saved start when its computer never becomes ready` runs a create and several resumes on the backend fixture. Each test has 15 seconds, as decision 113 set.
- **Problem:** During the review, the case timed out after 15 seconds while other tests used Miniflare and D1 at the same time. It passed when it ran alone.
- **Impact if no action:** The gate can fail now and then on a busy machine, and an agent must run it again.
- **Root question:** How does this case finish well under its limit, also under load?
- **Options:**
  - **A.** Measure the case alone and under load. Split it into one case for each requirement, or remove its slow steps. Effort: Small.
  - **B.** Do A as part of the harness speed work in `harness-test-speed.md`. Effort: Medium.
- **Left out:** A longer time limit for this case, because it hides the slow path.
- **Wider fix:** B.
- **Previous examples:** decision 113, which raised the time limit of the slow harness tests.
- **Recommendation:** A. It is small and removes the flake at its source.
- **Action:** fix after merge, apply A, because the test is outside the reviewed commits.
