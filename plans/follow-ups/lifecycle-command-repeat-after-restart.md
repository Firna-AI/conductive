# A restart can run a lifecycle command twice

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #40, branch `conductor/boat-native-remote-workspaces-milestone-5b`, a problem outside the scope of round 1.
- **Location:** `worker/lifecycle/start-coordinator.ts:193` and `worker/lifecycle/build-execution.ts:37`.
- **Reason:** the command steps are outside the diff of the branch that found it.

- **Background:** The lifecycle runs the install script and the startup script in the cloud computer, and it saves the process ID of each command to follow it.
- **Problem:** A restart after the command starts, but before its process ID is saved, runs the command again on the next alarm.
- **Impact if no action:** An install or a startup script can run twice, with its side effects twice.
- **Root question:** How does each lifecycle command run once, also across a restart?
- **Options:**
  - **A.** Save an intent with a command ID before the start, and give the command a marker file in the cloud computer. On a resume, find the running or finished command by its marker instead of starting it again. Effort: Medium.
  - **B.** Make each script safe to run twice, and document that rule for the org's scripts. Effort: Small.
- **Left out:** None.
- **Wider fix:** A.
- **Previous examples:** `plans/follow-ups/lifecycle-resource-intents.md`, the same pattern for resource creation, which Milestone 5b fixed.
- **Recommendation:** A. The org's own scripts cannot be trusted to be safe to run twice.
- **Action:** fix after merge, apply A, because the code is outside the diff that found it.
