# Background Boat retries wait a fixed 30 seconds

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-19, from the branch `calummoore/conductive-sandbox-loading-issue`, the wider fix of the archive retry hotfix.
- **Location:** `worker/lifecycle/archive-retry.ts` (the archive wait to share), `worker/lifecycle/archive-state.ts:161` (the safety alarm before the archive work), `worker/lifecycle/workspace-alarm.ts:183` and `:198`, `worker/lifecycle/durable-alarm.ts:82`, `worker/lifecycle/durable-scheduling.ts:74`, `worker/lifecycle/start-storage.ts:195`, `worker/lifecycle/workspace-suspension.ts:152` and `:187`, `worker/lifecycle/computer-stop-task.ts:60` and `:73`, `worker/lifecycle/image-coordinator.ts:104`, and "The provider" in `docs/protocol/workspaces-and-sandboxes.md:42`.
- **Reason:** On 2026-11-19 the user chose to ship the archive fix first as a hotfix, and this shared wait after the merge, because it reaches about a dozen alarm sites in other files. Implementation found the unresolved disk-expiry question below. The shared wait stays approved, but closure waits for that answer.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Start:** Boat's count of each create, resume, and fork. Boat plans limit starts per minute, hour, and day. Above the included count, each start costs $0.03 to $0.07 from the wallet of the Boat account. With an empty wallet, Boat refuses each start with `429`.
  - **Alarm retry:** the Durable Object alarm that a background step of a workspace or an image coordinator sets after a failure, so that the step runs again.
- **Background:**
  - On 2026-11-19, two archived workspaces of the Mokly org called Boat resume every 30 seconds for more than 24 hours. Boat answered `409 sandbox_stopping`, because an earlier stop still held each machine.
  - Boat very likely counted each attempt as a start. While the wallet had money, about 250 attempts reached Boat in 75 minutes. In the same time the app made 2 new workspaces and 1 image build.
  - The app's Boat account used up its starts, and the wallet emptied. From about 05:59 UTC, Boat refused every create and resume of every workspace with `429`.
  - The hotfix in `worker/lifecycle/archive-retry.ts` makes a failed Archive step wait 30 seconds. Each further failure doubles the wait, up to 1 hour. The wait is at least Boat's `Retry-After`, up to the same hour. A step that succeeds ends the wait.
  - The hotfix also writes the retry time to `workspaces.next_disk_keepalive_at`. The 15-minute repair Cron Trigger wakes an archived workspace when that time is more than 15 minutes overdue. Without the write, it wakes the retry early.
  - `WorkspaceArchive.advance` in `worker/lifecycle/archive-state.ts` makes no provider call before the saved retry time, also when another run wakes it early. `WorkspaceArchive.repair` moves that time to now and keeps the failure count. So an owner change or a suspension lift still gets one attempt at once, as `docs/protocol/suspension-workspaces.md` and `docs/protocol/operator-actions.md` require. `WorkspaceArchive.finishStop`, the stop that Restore needs, does not wait. Each site of this item needs the same check.
  - The other alarm retries in the location list still wait a fixed 30 seconds after a failure. They have no limit, and they ignore `Retry-After`. Some of them retry Boat calls that create, resume, or stop a sandbox.
  - `worker/lifecycle/provider-retry.ts` gives starts and builds a 10-minute retry window with a growing wait and `Retry-After`. That policy ends the job after the window. Background work cannot end that way, because it must keep its disk, its stop, or its cleanup.
- **Problem:** A background step that fails the same way each time calls Boat every 30 seconds with no end. When the step resumes or creates a sandbox, it can use up the starts of the app's Boat account.
- **Impact if no action:** Another stuck sandbox in a disk retention restart, a start step, or a suspension stop can again use up the starts and block every workspace of every org.
- **Root question:** How does every background retry of a Boat call wait, so that one stuck sandbox cannot use up the starts of the account?
- **Options:**
  - **A.** Move the wait of `archive-retry.ts` into a shared helper. Use it at each alarm site in the location list that retries a Boat call. Each site saves its own failure count and retry time with its state. The executor of each site checks that time when another run wakes it early, so that no caller skips the wait, as `WorkspaceArchive.advance` in `worker/lifecycle/archive-state.ts` does for Archive. Add the rule to "The provider" in `docs/protocol/workspaces-and-sandboxes.md`: background work waits at least Boat's `Retry-After`, and waits longer after each failure, up to 1 hour. Effort: Medium.
  - **B.** Give the alarm scheduler, `WorkspaceAlarms`, a failure report. Each owner reports its failure, and the scheduler picks the next time with the same wait. The scheduler then runs no owner before its time, also not for a run with no due owner or a recovering run. Add the same protocol rule. Effort: Large.
- **Left out:** A cap on the number of retries, because background work would then stop with no notice, and a disk, a stop, or a cleanup could be lost. A longer fixed interval, because it keeps one fixed rate and still ignores `Retry-After`.
- **Wider fix:** A. One helper at every site removes the fixed retry, and a new site copies the helper with the pattern.
- **Previous examples:** The archive loop of 2026-11-19 in `worker/lifecycle/archive-state.ts`, which the same branch fixed. `plans/follow-ups/failed-start-finish-retries-forever.md` records a start finish that retries every 30 seconds.
- **Related:** `plans/follow-ups/failed-start-finish-retries-forever.md` has the same fixed 30-second retry. Its root question is how a failed start ends, so it stays a separate item.
- **Recommendation:** A. It reuses the tested archive wait, and each site keeps its own error handling. B also protects future alarm owners, but it changes the shared scheduler of every owner.
- **Approved action:** fix after merge, apply A, because the user chose on 2026-11-19 to ship the archive hotfix first and this wider change after the merge.

## Open during implementation on 20 November 2026

The question below is still open. No orchestrator message chooses an option for Cal.

### 1. Retry waits can pass disk expiry

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/background-retry.ts:9`, `worker/lifecycle/archive-state.ts:160`, `worker/lifecycle/disk-retention-state.ts:70`, and "The provider" in `docs/protocol/workspaces-and-sandboxes.md:55`.
- **Terms:**
  - **Retention restart:** The app briefly starts and stops a stopped sandbox so that its provider keeps the disk.
  - **Disk expiry:** The earliest time when the provider can delete a stopped disk, estimated from its saved stop time.
  - **Saved wait:** The persisted failure count and earliest time for another provider call.
  - **Retry-After:** A provider error header that asks the app to wait before another call.
- **Background:**
  - Cal chose the shared Archive wait on 19 November 2026. It grows from 30 seconds to 1 hour.
  - Decision 43 requires retention restarts on Boat near day 14. The code first attempts one on day 13.
  - Boat can delete a disk after 14 stopped days. Its API gives no exact expiry time.
  - E2B has no stopped-disk expiry. Every option keeps the shared wait for both providers elsewhere.
  - Every option keeps the 20-minute restart limit in `docs/protocol/workspace-life.md` and this task's unlimited background recovery.
  - Every option keeps the present provider storage policy. Decision 43 rejects a disk copy in the app's storage.
- **Problem:** Archive's 30th refusal leaves no call in the final 56 minutes 30 seconds before disk expiry. Its next saved call is 3 minutes 30 seconds after expiry. A provider that recovers in that gap can delete the disk before the app tries again.
- **Impact if no action:** A retry wait can prevent an attempt that could save files, agent sessions, and unpushed work. The user gets no notice.
- **Root question:** Which wait rule applies to the last opportunity to keep a disk before expiry?
- **Options:**
  - **A.** Keep the strict saved wait. State explicitly that it can miss the final retention opportunity. Update each legal or guide sentence that would promise more. This accepts the resulting risk of lost work. Effort: Small.
  - **B.** Add a latest time to the shared retry policy. Reserve one persisted final opportunity before disk expiry when the app's own wait would pass it. Leave enough time for the 20-minute restart limit and provider calls. Keep the failure count and real disk dates. A provider's `Retry-After` still wins, so it can prevent that opportunity. Afterward, normal recovery continues without a retry cap. Add this narrow exception to the protocol. Effort: Medium.
  - **C.** Apply B, but let the final opportunity also override `Retry-After`. This gives the disk priority over the provider's request. A rate-limit refusal can still prevent success. Effort: Medium.
- **Left out:**
  - An earlier first restart does not settle the last opportunity. A longer outage can still leave the same final gap.
  - Resetting the count at each 20-minute window defeats the approved growing wait. It also permits a final gap.
  - Timing hourly calls from a fixed origin gives no guarantee. Reply times, provider headers, and access repairs move that origin.
  - A final status read cannot renew the disk. The incident included successful status reads and refused resumes.
  - A new provider or a disk backup changes the storage policy outside this item's scope. Recorded decisions reject app disk copies and Archive snapshots.
  - Repeated immediate final attempts can recreate the outage. A persisted single opportunity bounds the extra calls.
  - No implementation can guarantee provider success or alarm execution during an outage. The promise must concern the app's scheduled attempt.
- **Wider fix:** B. A shared latest-time input and a persisted consumed opportunity cover ordinary retention and Archive.
- **Previous examples:** Archive has this gap since #539, commit `1f6311268`. The finite policy in `worker/lifecycle/provider-retry.ts` already distinguishes its own wait from the provider's `Retry-After`.
- **Recommendation:** B. It bounds the extra calls and preserves the provider's requested wait. Choose C if the final attempt must take priority over that request.
- **Action:** ask the user, because no recorded choice settles expiry against the saved wait, and the new exception changes the approved rule.
