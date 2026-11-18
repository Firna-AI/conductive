# The first 15-minute cron step has no catch

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from the review of the branch `calummoore/record-step-times-for-builds-and-2nqj`.
- **Location:** `worker/application.ts:274`
- **Reason:** The problem is older than that branch, and one fix should reach every open branch that adds a cron step.

- **Terms:**
  - **15-minute cron:** the `*/15 * * * *` Cron Trigger of the Worker. `scheduled` in `worker/application.ts` runs its maintenance steps one after another.
- **Background:**
  - The 15-minute cron runs, in order: `cleanupCodexDevices`, `cleanupOldJobRecords`, `cleanupDeletedOrgs`, `repairLifecycleAlarms`, `repairSoftwareImages`, and `retryApprovalEmails`.
  - `cleanupOldJobRecords`, `repairSoftwareImages`, and `retryApprovalEmails` catch their own errors and warn.
  - `cleanupCodexDevices` runs first and has no catch.
- **Problem:** one D1 error in `cleanupCodexDevices` ends the cron run. Every later step is skipped until the next run, also the org purge, the alarm repair, and the deletion of job step records after 90 days.
- **Impact if no action:** a lasting failure in that one step stops all maintenance. The Privacy page promises the deletion of job step records after 90 days.
- **Root question:** how does one failed maintenance step leave the other steps of the cron running?
- **Options:**
  - **A.** Catch the errors of `cleanupCodexDevices` and warn, as the other steps do. Effort: Small.
  - **B.** Run each step of the 15-minute cron through one helper that catches and warns with the name of the step. Effort: Small.
- **Left out:** run the steps at the same time, because the order matters: the org purge comes before the alarm repair.
- **Wider fix:** B. A new step then gets the catch without any extra code.
- **Previous examples:** `repairSoftwareImages` and `retryApprovalEmails` each got their own catch in `worker/application.ts`.
- **Recommendation:** B. It covers every step and every step that a later change adds.
- **Action:** fix after merge, apply B, because the problem is outside the scope of the branch that found it.
