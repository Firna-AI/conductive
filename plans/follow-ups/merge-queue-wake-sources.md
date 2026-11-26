# Queue waits need a wake source

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, finding 6 of `calummoore/merge-queue-k2ep`.
- **Location:** `worker/merge-queue/merges.ts:167`, `worker/merge-queue/queue-alarm.ts:19`, and `worker/merge-queue/local-work.ts:16`.
- **Reason:** Wake sources for all waits reach the shared workspace file and lifecycle paths. The queue can already recover from local-work waits with a bounded retry.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Queue wake:** A request that schedules the next step on the repository's merge queue object.
- **Background:** A queued pull request can merge only after its cloud computer has no unpushed work. A push produces a GitHub event. Discarding local edits and recovering from a failed computer read can clear the wait without a GitHub event.
- **Problem:** An isolated Worker test found no alarm after a local-work wait. The queue merged after the test supplied an explicit wake. The queue now retries a local-work wait after 30 seconds. It doubles the delay up to 15 minutes and clears it when the wait ends. It still has no common way to name the event or timer that can clear each wait.
- **Impact if no action:** A local revert can wait for the next retry even when the app already knows the work is clean. Other waits can still depend on unrelated events if their source is missing.
- **Root question:** How can each queue wait resume when its condition clears?
- **Options:**
  - **A.** Keep the local-work retry. It covers a revert and a failed read with periodic checks. Effort: Small.
  - **B.** Give each wait a source. Use local-work reports and workspace lifecycle changes for local work. Use bounded retries where no event can arrive. Cover each source through the coordinator. Effort: Medium.
  - **C.** Sweep all nonempty queues on a slow timer. It also rechecks conditions that need a member and adds routine GitHub reads. Effort: Large.
- **Left out:** Push events alone. A local revert produces no push.
- **Wider fix:** B. A new wait must say what rechecks it.
- **Previous examples:** Commit `f22adccf5` keeps a lifecycle cleanup pending after a failed schedule. `worker/merge-queue/merge-guards.test.ts` verifies the saved retry after a local revert.
- **Recommendation:** B. It can wake the queue when the workspace reports a change and keep a fallback for missed events.
- **Action:** Fix after merge, apply B. The shared file and lifecycle reporting need their own tests.
