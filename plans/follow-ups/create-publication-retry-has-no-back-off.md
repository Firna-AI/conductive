# Create publication retry has no back-off

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-21, from branch `calummoore/cut-waits-in-workspace-start-and-resume-fvs3`, review round 1.
- **Location:** `worker/lifecycle/start-storage.ts:262-263`, `worker/lifecycle/creation-publication.ts`.
- **Reason:** `origin/main` already has this fixed 1 s retry, so the start-loop change did not cause it.

- **Terms:**
  - **Create publication:** the D1 write of a finished create's result. The workspace Durable Object stores it under `lifecycle:create-publication`, and it retries the write when it fails.
- **Background:** When a workspace create ends, its Durable Object writes the result to D1. When that write fails, `schedulePublication` sets the next try 1 s later, with no limit and no back-off. The lifecycle run makes this write before it advances a start of the same workspace.
- **Problem:** During a D1 outage, each workspace with a pending publication sends one slow write to D1 every second. A slow failed write also uses time from the same lifecycle run.
- **Impact if no action:** A D1 outage gets more load from these retries. Since the start-loop change, a slow write no longer blocks a start, because the first start advance of each run always runs.
- **Root question:** How often should a failed create publication try again?
- **Options:**
  - **A.** Keep the fixed 1 s retry. Effort: none.
  - **B.** A capped back-off, for example 1 s doubling to 30 s, with an attempt count in the stored publication record. The `changed` retry already waits 30 s. After a short outage, the result reaches D1 later. The 1 s values in `worker/lifecycle/workspace-publication-retry.test.ts` change. Effort: Medium.
- **Left out:** a time limit on the write: a D1 call cannot be cancelled, so the write would keep running outside the queue turn of the run.
- **Wider fix:** B. One back-off rule for this retry.
- **Previous examples:** commit `9b8616bbc` separated the publication alarm.
- **Recommendation:** B, only if D1 load during an outage becomes a concern.
- **Action:** ask the user, because the choice trades recovery speed against D1 load, and no requirement sets either.
