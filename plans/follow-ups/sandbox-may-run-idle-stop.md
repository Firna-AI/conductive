# One rule for the idle stop of a running sandbox

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/clickable-dropdown-restart-server-6gn7`, review item 1.
- **Location:** `worker/lifecycle/durable-alarm.ts`, `worker/lifecycle/durable-scheduling.ts`, `worker/lifecycle/durable-restart.ts`.
- **Reason:** The rule changes the alarm of every error state, outside the purpose of the Restart branch.

- **Terms:**
  - **Lifecycle alarm:** the timer of the workspace Durable Object. `advanceLifecycleAlarm` in `durable-alarm.ts` runs the 30-minute idle stop.
- **Background:** The idle stop and the alarm schedule check the state name. They skip the idle stop for `error` and poll every 5 seconds, because each error used to come with a stopped or deleted sandbox. A failed Restart is the first error whose sandbox still runs. The Restart branch added `isFailedRestart` as a special case.
- **Problem:** Each new error that leaves the sandbox running needs the same special case. A missed case leaves a sandbox running with no idle stop.
- **Impact if no action:** A later error path can keep a cloud computer running and costing provider time without end.
- **Root question:** How does every state whose sandbox may run get the idle stop?
- **Options:**
  - **A.** Keep the special case of `isFailedRestart`. Effort: Small.
  - **B.** Add one helper, "the sandbox may run", meaning not confirmed stopped. The idle rule and the scheduler use it in place of state names. Check each error path. Effort: Medium.
- **Left out:** A test for the class, because B removes the wrong case.
- **Wider fix:** B.
- **Previous examples:** Review item 1 of the Restart branch.
- **Related:**
  - `plans/follow-ups/failed-restart-keeps-running-sessions.md`: a shared wider fix. Its option E merges option B here, and also reads the running turns from the committed chat. Apply the two in one branch.
  - `plans/follow-ups/failed-restart-error-hidden-by-turn-end.md`: its option D uses the helper of option B here, so that a turn end keeps each error state whose sandbox may run.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because it changes the alarm of every error state.
