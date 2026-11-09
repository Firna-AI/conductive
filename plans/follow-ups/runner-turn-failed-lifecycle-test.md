# No test moves a workspace to ready after a failed turn

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, a new problem of the check of finding 6 of review round 2 of branch `conductor/model-gateway-worker-model-proxy-decision-120`, outside its scope.
- **Location:** the `turn.failed` branch of the turn-end condition in `worker/chat/workspace-integration.ts:133-144`, and `worker/lifecycle/runner-lifecycle.ts:33-35`.
- **Reason:** the gateway branch did not change this path, so its fix belongs to a separate branch.

- **Terms:**
  - **Workspace lifecycle:** the stored state of a workspace, such as `working` or `ready`. It controls the idle stop of the cloud computer.
  - **Runner:** Conductive's program in each cloud computer. It sends the agent events of each turn, and one end for each turn.
- **Background:**
  - When an agent run fails, the runner sends its own `turn.failed` event (`runner/src/engine-finish.ts:65`).
  - The chat stores the event and reports the end of the turn to the workspace lifecycle. The lifecycle then leaves `working`, and becomes `ready` when no other turn runs.
  - No test checks that a runner's own `turn.failed` moves the workspace from `working` to `ready`. Tests cover `turn.completed`, and the gateway branch covers its own replacement `turn.failed`.
- **Problem:** A change that drops `turn.failed` from the lifecycle's turn-end handling passes every test.
- **Impact if no action:** A regression can leave a workspace `working` after a failed turn, until the next runner hello or the alarm repair, and the open tabs show the wrong state.
- **Root question:** How does a test prove that a failed agent turn returns the workspace to `ready` at once?
- **Options:**
  - **A.** Add one case to `worker/chat/integration/workspace-lifecycle-recovery.test.ts`, which runs the production workspace object: the runner sends `turn.failed`, and the workspace becomes `ready` with no hello and no alarm. Effort: Small.
- **Left out:** A spy on the lifecycle callback, because it cannot see the stored workspace state. Only one approach is real, because the requirement is one behaviour at one boundary.
- **Wider fix:** None. The `testing` skill already requires a test of each requirement at its boundary.
- **Previous examples:** Commit `cf2e41a` added lifecycle recovery tests for missed turn-end updates.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the gateway branch did not change this path.
