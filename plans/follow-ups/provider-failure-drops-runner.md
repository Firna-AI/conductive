# A provider failure after a runner event drops the runner

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from branch `calummoore/agent-stopped-mn5l`, the investigation of "The agent process ended."
- **Location:** `worker/chat/runner-channel.ts:190`, `worker/chat/workspace-integration.ts:144`, and `worker/lifecycle/create-workspace-lifecycle.ts:70`.
- **Reason:** The problem is in the Worker, and the fix of that branch changes only the SDK helper.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **Runner connection:** the WebSocket of the agent runner to the Durable Object of its workspace.
  - **After-commit step:** the work in `worker/chat/runner-channel.ts` that runs after the workspace stores a runner event: the confirmation, the turn-end reports, and the runner hooks `runnerReady` and `runnerEventStored`.
  - **Provider:** the sandbox provider, Boat, that runs the cloud computers.
- **Background:** The hooks `runnerReady` and `runnerEventStored` in `worker/chat/workspace-integration.ts` report the runner state to the workspace lifecycle. The lifecycle can call the provider, for example in `extendDeadline` of `worker/lifecycle/create-workspace-lifecycle.ts`, which extends the deadline of the cloud computer. When a hook fails, the runner channel closes the runner connection. The Worker writes the warning `runner_message_failed` with the stage `after_commit`. On 18 November 2026, from 09:05 to 09:21 UTC, the workspace `GSKVPU45lZrnMEcFGREiOOj-KnKpZR5bo1UIkjF7f2A` got 21 such warnings. Their error was `{"kind":"provider","providerKind":"unavailable","status":500}`, and 4 times status 503. The runner connected again after each close, often within 2 seconds. A `send_message` workspace tool call to that workspace got HTTP 500 at 09:20:10.
- **Problem:** A short provider failure makes the runner connection close and open again in a loop, although the workspace already stored the event.
- **Impact if no action:** During a provider failure, commands and tool calls of the workspace can fail, and the lifecycle step of the event can stay undone.
- **Root question:** How should the workspace finish its lifecycle work after a stored runner event when the provider fails?
- **Options:**
  - **A.** Change nothing. Each new connection runs the hooks again. Effort: Small.
  - **B.** Catch a provider failure in the after-commit step. Write a warning, keep the connection, and retry the lifecycle step from the workspace alarm. Effort: Medium.
  - **C.** Option B, and also wait longer before the runner connects again after such a close. Effort: Medium.
- **Left out:** Retry the provider call inside the hook in a loop. It holds the runner message for as long as the provider fails.
- **Wider fix:** B. One retry path for each lifecycle step that a provider failure interrupts.
- **Previous examples:** None found.
- **Recommendation:** B. A stored event needs no new connection, and the alarm can retry the provider call later.
- **Action:** ask the user, because a retry of a lifecycle step from the alarm is new behaviour that no requirement covers.
