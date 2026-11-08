# A run of the workspace alarm can end without the next alarm

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a problem outside the scope of the check of finding 3 of PR #47, branch `conductor/boat-native-remote-workspaces-milestone-5c`, round 2. Corrected on 2026-11-09 by the check of finding 12 of PR #50 (Milestone 5d): the first text named the device broker, but the Mac connection attaches only in the broker object of each user (`worker/devices/broker-routes.ts:56`), so the broker never sets the alarm of a workspace object (`worker/devices/broker.ts:190`).
- **Location:** `worker/lifecycle/workspace-alarm.ts:57`, the `if (advancedStart) return` branch, and `worker/lifecycle/start-coordinator.ts:140`.

- **Terms:**
  - **Workspace object:** the Durable Object that owns one workspace's lifecycle and chat. It has one alarm.
  - **Alarm run:** one call of the object's alarm handler. Cloudflare deletes the alarm before the run, so a run that sets no new alarm leaves none.
- **Background:** The lifecycle sets the alarm for start polls, provider retries, idle stops, and disk restarts. Finding 12 of PR #50 found a successful start that consumed the alarm and set no next one. Milestone 5d fixes that path.
- **Problem:** Other runs can end the same way. A failed D1 write of a creation result is retried in a later run, which counts as an advanced start and returns before it sets the lifecycle alarm again, or the cleanup retry of a failed create. Each owner of the alarm must remember to set the next time.
- **Impact if no action:** An idle workspace can run past its 30-minute stop, or a failed create can keep its cloud computer, until another event sets the alarm.
- **Root question:** How does every alarm run leave the next alarm that the workspace still needs?
- **Options:**
  - **A.** Fix the creation retry path: after it advances the start, it sets the lifecycle alarm and the cleanup retry, as the normal path does. Add a regression test that deletes each alarm before the next run. Effort: Small.
  - **B.** Add one alarm scheduler to the object. Each owner reports its next due time, and the scheduler sets the alarm to the earliest at the end of each run. No owner calls `setAlarm` itself, so no run can end without the next alarm. Effort: Medium.
- **Left out:** A second object for some of the duties, because the lifecycle, the chat, and the start steps must stay in one serial queue.
- **Wider fix:** B.
- **Previous examples:** finding 12 of PR #50.
- **Recommendation:** B. It ends the class: the scheduler, not each path, sets the next alarm.
- **Action:** fix after merge, apply B, because the creation retry path is outside the diffs of PR #47 and PR #50.
