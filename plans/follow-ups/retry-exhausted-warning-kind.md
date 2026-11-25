# Ended retry windows log a generic error kind

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from `calummoore/repo-load-issue-e68j`, review round 1, a new problem of the finding check.
- **Location:** `worker/lifecycle/provider-retry.ts:12-16`, `worker/warning-values.ts` (`errorSummary`).
- **Reason:** `origin/main` has the same code, so the branch did not cause it.

- **Terms:**
  - **`ProviderRetryExhausted`:** the error that the Worker throws when a temporary provider error does not clear within its retry window.
- **Background:** `errorSummary` gives a fixed kind for known error classes and `{ kind: 'error' }` for a plain `Error`.
- **Problem:** `ProviderRetryExhausted` is a plain `Error`. So each warning of an ended retry window, such as `image_build_failed`, logs `error: { kind: 'error' }` and does not say that the window ended.
- **Impact if no action:** Operators cannot tell an ended retry window from any other unexpected error in the logs.
- **Root question:** How does a warning say that a provider retry window ended?
- **Options:**
  - **A.** Give `errorSummary` a fixed kind, such as `retry_exhausted`, for `ProviderRetryExhausted`, with the provider status of the last error. Effort: Small.
  - **B.** Add a `retry` field to each warning that a job can end with. Effort: Medium.
- **Left out:** Logging the error message breaks the rule that no free text reaches the logs.
- **Recommendation:** A. One place covers every warning.
- **Action:** fix after merge, apply A, because the defect is outside the scope of the branch that found it.
