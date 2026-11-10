# Routine failures can bypass error reporting

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from finding 3 of the main integration review of `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/routines/schedule-scan.ts:58-68`, `worker/routines/run-starter.ts:121-150`, `worker/github/composition.ts:54-65`, and `worker/application-scheduled.ts:22-28`.
- **Reason:** The failure needs an unusual service or database fault. The fix has the same cost after merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Routine:** A saved agent task that runs from a schedule, a GitHub event, or Run now.
  - **Report:** A filtered error event sent to Better Stack.
  - **Reporting scope:** The request or scheduled context that owns safe report fields, cause deduplication, and background reporting work.
- **Background:** The minute schedule scan and webhook background tasks start stored routine runs. Run now calls the same starter. Each operation can keep a run queued or store its failure without throwing. The error reporting protocol requires one report when a catch hides an unexpected failure. Normal refusals and user script failures stay silent.
- **Problem:** The scan catches failed claims and retries with a warning only. The starter can keep a run queued with a warning, or store a generic failure with no warning. The webhook background catch also only warns. Each path returns normally, so the outer cron or request entry reports nothing.
- **Impact if no action:** Better Stack receives no event for these failures, even with reporting enabled. The operator must inspect Workers Logs or routine results. Run states and retries still work.
- **Root question:** How does routine recovery report each unexpected failure once while keeping normal refusals, existing reports, run states, and retries unchanged?
- **Options:**
  - **A.** Add capture calls to the existing catches. Extend the claim and recovery tests. Each catch must identify already reported failures, and future catches can still omit capture. Effort: Small.
  - **B.** Add one routine recovery helper that reports the unexpected cause and applies the existing retry or failed-state action. Move the recovery catches to it. Keep failed workspace attempts silent because the workspace owns their reporting. Effort: Medium.
  - **C.** Return typed private failure outcomes from routine work. Report them in the schedule, webhook, and Run now adapters. Preserve public responses and run states. More adapters must inspect each outcome, and the type alone cannot force inspection. Effort: Medium.
  - **D.** Add a lint for catches that neither rethrow nor report, with a marker for normal results. It detects the class across the Worker. It needs user approval because it adds a lint. Effort: Large.
- **Left out:**
  - Change nothing or log only. Neither meets the reporting requirement.
  - Rethrow each failure. It can stop other due routines and change successful webhook responses.
  - Throw one aggregate after the scan. It reports several failures as one, changes the cron result, and leaves the other entry points uncovered.
  - Report every failed run. Expected access refusals, user script failures, and already reported workspace failures must remain silent.
  - Report from the generic failed-run writer. Failed claims and queued retries make no failed-state write.
  - Report every warning by policy in the logger. The failed starter branch logs nothing, and the logger cannot identify already reported workspace failures.
- **Wider fix:** B. One recovery owner combines the reporting decision with the action that keeps the run valid. D is a blocked detection alternative.
- **Previous examples:** `worker/application-scheduled.ts` reports caught maintenance failures before continuing. The software-image and gateway-stream reporting follow-ups record other failures hidden from the outer entry. Their failure owners differ from routine recovery.
- **Related:**
  - `software-image-failure-reports.md`: the same cause class, in separate code. Its guarded data write cannot fix a queued routine or a failed claim.
  - `gateway-stream-failure-reports.md`: its private late-outcome hook could support webhook reporting if it ships first. Routine recovery can also report inside an explicit background scope. Neither item waits for the other.
- **Recommendation:** B. The recovery owner knows whether the run stays queued, has a new unexpected cause, or already failed inside a workspace. The first review recommended C. The independent check recommended B because moving captures to three adapters gives no better scope or forced handling.
- **Action:** fix after merge, apply B, because severity is Medium, likelihood is Rare, and the fix does not get harder after merge.

Evidence and regression requirements:

- `worker/routines/schedule-claim.test.ts:116-151` injects a rejected database claim. The scan completes and logs `routine_schedule_failed`.
- `worker/routines/run-recovery.test.ts:24-111` injects a failed workspace-link write and rejected first-message acceptance. The run remains queued and logs `routine_queued_start_failed`.
- Cover the queued-run retry catch and the starter branch that records a generic failure without a warning.
- Preserve scan continuation, stable claim and first-message identities, run states, retry timing, failure counts, the Run now response, and successful webhook responses.
- A failed workspace admission becomes a new `WorkspaceStartError` across the object boundary. The workspace already reports its unexpected start failure and keeps user-script failures silent. Do not report that failed-attempt branch again. Object-local cause deduplication cannot prevent a second report in another object.
- Show one filtered report for an unexpected claim, queued retry, first-message acceptance, link write, or background start failure. Show no routine report for expected refusals or failed workspace attempts.
- Prove that webhook reports still leave through `waitUntil` after the response. Keep the cause private and every ID outside the report.
- Stored trigger or schedule parsers can throw 400 for saved data. Determine the right internal classification before treating all such errors as normal refusals. This is a proof requirement, not a confirmed additional defect.
- Keep all existing assertions. Show the new report assertions fail before the fix. Run changed asynchronous cases ten times. Run the complete gate.
