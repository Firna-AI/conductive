# Workspace remote calls lose hidden failure reports

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from finding 6 of the main integration review on `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/tools/workspace.ts:37-69`, `worker/workspace-lifecycle.ts:252-257`, `worker/chat/authenticated-runner.ts:38-49`, `worker/lifecycle/workspace-state-projection.ts:91-99`, and `worker/error-reporting/scope.ts:25-54`.
- **Reason:** The failure needs an unusual database fault. The fix has the same cost after merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Remote method:** A method of one workspace's Cloudflare Durable Object that the Worker calls through a stub.
  - **Reporting owner:** The workspace's `WorkspaceErrorReporting` object. It holds the reporting runtime, `context.waitUntil`, and the `component: workspace` field.
  - **Reporting scope:** The async-local context that supplies a reporting owner and the set of causes that it already reported.
  - **Runner:** The program in a cloud computer that runs the agents and connects to its workspace.
  - **Better Stack:** The error service that receives Conductive's filtered failure reports.
- **Background:** Session tools save an accepted message before they flush pending commands to the target runner. The flush checks the runner's access and updates the workspace state. `docs/protocol/error-reporting.md` requires one report when a catch hides an unexpected failure. The reporting branch adds those captures.
- **Problem:** `writeAgentSession` and `checkTurnToken` can reach the flush without entering a reporting scope. A rejected runner access query then reaches a capture that sends nothing. A caught workspace state update failure under the same flush also sends nothing.
- **Impact if no action:** Better Stack receives no event for these failures. A session tool message remains saved, but its runner can close with no warning or report.
- **Root question:** How does each hidden unexpected failure in work that a workspace remote method starts give one report, as fetch, alarm, and socket work do?
- **Options:**
  - **A.** Wrap `writeAgentSession` and `checkTurnToken` in `this.reporting.run`. Add a regression through the session tool remote write. This covers both confirmed captures, but later remote methods can omit the scope. Effort: Small.
  - **B.** Make `AuthenticatedRunner` enter the reporting scope in its `ChatDependencies` before capturing an authorization failure. Reuse `reporting.run` for cause deduplication. This repairs the access capture but misses the state update capture. Effort: Small.
  - **C.** Return a typed authorization result with its unexpected cause. Make the runner adapters report it once. Preserve acceptance, connection closure, and public responses. This changes several callers and still misses the state update capture. Effort: Medium.
  - **D.** Add one base-class helper that runs a remote method in `this.reporting.run`. Move remote methods with no scope to it. The static check estimated about 20 such methods, but did not trace every method. A later method can omit the helper. Effort: Medium.
  - **E.** Run every workspace remote method in `this.reporting.run` by default. Walk the prototype chain once, as the installed SDK does. Skip `constructor`, `fetch`, `alarm`, and the three socket callbacks. Internal calls keep the current scope and its reported causes. The wrapper touches the untyped remote surface and needs protection against a second wrap. Effort: Medium.
  - **F.** Give `ChatStore.run` an optional scope function from `dependencies.reporting.run`. Each queue task opens the workspace scope or joins its caller's scope. This covers the confirmed paths and later queue users. Remote work outside the queue stays without a scope. Effort: Small.
- **Left out:**
  - Change nothing or log only. Neither meets the existing requirement for hidden failures.
  - Report every denied access check. A normal denial must stay silent.
  - Rethrow the query failure. It changes the successful acceptance response of a saved message.
  - Scope only `RunnerChannel.flush`. Other work of the same remote method stays without a scope.
  - Report in the Worker through a new remote result field. C can report inside the workspace object with its exact owner and no extra result field.
  - Use the SDK's Durable Object instrumentation without the custom scope registry. Its scope has no registered reporting owner. E reuses only its prototype walk.
- **Wider fix:** E. A remote entry gets its scope by default, so later capture sites do not depend on individual callers.
- **Previous examples:** `plans/follow-ups/gateway-stream-failure-reports.md` records another unreliable reporting scope. The existing fetch, alarm, socket, and lifecycle entries already establish workspace scopes. Main commit `80401a06` added the affected session tool remote call. Commit `a200a532` added the earlier turn-check flush.
- **Related:** `plans/follow-ups/gateway-stream-failure-reports.md` changes the same `checkTurnToken` path. This item must only establish its scope. A new capture that rethrows would duplicate that item's planned Worker-side report. Scope-only fixes do not conflict, and neither item waits for the other. `plans/follow-ups/relayed-start-failure-reports.md` must create claims only for accepted captures. A missing scope then leaves the final request report available. Neither fix waits. `plans/follow-ups/codex-credential-failure-reports.md` reports a raw rejected turn check at the Worker. This scope-only wrapper adds no rethrowing capture, so the fixes do not conflict or wait.
- **Recommendation:** E. It covers both hidden captures and later remote callers. The first review recommended B, which misses the state update capture. A is the least invasive complete direct fix, and F is the cheaper structural alternative.
- **Action:** fix after merge, apply E, because the likelihood is Rare, severity is Medium, and the fix does not get harder after merge.

The session tool path:

1. `worker/tools/session-write-composition.ts` calls `writeAgentSession` through the target Durable Object stub.
2. `worker/tools/workspace.ts` calls `WorkspaceChat.acceptToolWrite` without a reporting scope.
3. `worker/chat/workspace-operations.ts` saves the acceptance in its queue and awaits `flushRunner`.
4. `worker/chat/runner-channel.ts` calls the connected runner's `authorize` method.
5. `worker/chat/authenticated-runner.ts` catches a rejected access read, attempts capture, closes the runner, and returns `false`.
6. `worker/error-reporting/scope.ts` drops the capture because no scope is registered. The write still returns 201 or 202, so final 5xx capture reports nothing.

The second remote entry is `checkTurnToken` in `worker/workspace-lifecycle.ts`. The model gateway calls it through a stub. `worker/model-gateway/workspace.ts` fails a turn whose agent login changed or is unavailable, then flushes the runner at line 148. The same access failure can occur there without a scope.

The state update path starts in the same flush. `worker/chat/runner-delivery.ts` calls `turnDispatching`. The callback in `worker/chat/workspace-integration.ts` reaches `worker/lifecycle/runner-lifecycle.ts`, `worker/lifecycle/durable.ts`, `worker/lifecycle/durable-scheduling.ts`, and `worker/lifecycle/create-workspace-lifecycle.ts`. A failed title write in `worker/lifecycle/workspace-state-projection.ts:91-99` is caught and captured. That capture also finds no scope. A later lifecycle-alarm retry has a scope.

The owner and deduplication are already available:

- `worker/chat/workspace-integration.ts` creates one reporting owner with `context.waitUntil` and passes it to `WorkspaceChat`.
- `worker/chat/dependencies.ts` keeps that exact owner. `RunnerConnections` passes the dependencies to each `AuthenticatedRunner`.
- `ChatDependencies.reporting` is optional in its type. A fix at that boundary needs the ambient fallback used by `worker/chat/attachment-delivery.ts`.
- `reporting.run` passes `inheritClaims: true`. `withWorkerErrorScope` keeps the caller's reported causes when its runtime matches. The runtime is cached per isolate.
- A remote entry has no parent scope, so it needs a new set of reported causes. Internal calls must keep the caller's set.
- The reporting core cannot choose a default owner. One isolate can contain several workspace objects, each with its own background-work owner.

Static evidence and the proof required before a fix:

- The check traced both entries and captures, and read the installed Sentry SDK version 11.11.0. It ran no runtime reproduction.
- Without an async-local store, the SDK returns its default isolation scope. The custom registry registers only newly created scopes.
- `worker/chat/store.ts` runs each queued task in its caller's context. A scope of an earlier caller does not leak into it.
- The conclusion that a remote call starts without a store remains a runtime inference. The SDK's own remote-method wrapper uses the same default-scope check in `node_modules/@sentry/cloudflare/build/cjs/dev/durableobject.js`.
- Before changing code, reproduce the missing event through the native workerd fixture in `worker/lifecycle/real-runtime-test-support.ts`.
- Seed the target workspace, its org, and the sender. Connect a ready runner. Make the runner access read reject, then call `writeAgentSession` through the stub.
- Require one filtered `connection_authorization_failed` event with `component: workspace` and no `http.` field. Keep the accepted result, saved message, and closed runner.
- Require no event for a normal access read that returns `false`. The regression must fail on the current code with zero events.
- The existing fixtures split these controls. `worker/chat/runner-entry.test-support.ts:55-57` can reject the read but records no events. `worker/lifecycle/workspace-runtime-test-worker.ts:42-44` records events but cannot reject the read. One fixture needs both controls.
- For E, prove that a remote entry gets the workspace scope and that an internal call preserves cause deduplication. Keep every existing response, retry, privacy filter, and assertion.
- The check did not trace other remote methods with no scope, such as `suspendMemberLifecycle`. Their missing captures are unconfirmed. Do not treat them as separate defects without proof.
