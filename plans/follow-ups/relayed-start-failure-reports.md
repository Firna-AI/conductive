# Relayed start failures can report twice

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from finding 7 of the integration review on `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/lifecycle/start-coordinator.ts:229-238`, `worker/lifecycle/start-storage.ts`, `worker/lifecycle/workspaces.ts:131-132`, `worker/tools/composition.ts:79-82`, `worker/lifecycle/workspace-start.ts:19-26`, and `worker/error-reporting/entry.ts:42-46`.
- **Reason:** The duplicate needs an unexpected start failure while a request waits. The fix has the same cost after merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Worker:** The Conductive server that handles HTTP requests on Cloudflare.
  - **Workspace object:** The Cloudflare Durable Object that stores and runs one workspace's server state.
  - **Start result:** The stored success or failure that the workspace object returns when a cloud computer start finishes.
  - **Report:** A filtered error event that Conductive sends to Better Stack.
  - **Reporting claim:** A record that a reporting scope accepted a capture under the policy. It does not confirm delivery or limiter admission.
- **Background:** The workspace object reports an unexpected start failure before it saves the failed result. An agent tool request waits for that result. Browser and tool create requests also wait for creation admission. Each caller converts a failed result into an HTTP error. The Worker reports each final 5xx response.
- **Problem:** The stored result carries no reporting claim. `workspaceStartFailure` creates a fresh error, so final request capture cannot recognize the failure already reported in the workspace object. The two scopes cannot compare the same error identity.
- **Impact if no action:** One failed start can create two Better Stack issues or alerts and use the event quota twice. The request report gives a second view of the same failure.
- **Root question:** How does a failed start give one report across its workspace object and a waiting request that returns HTTP 5xx?
- **Options:**
  - **A.** Carry an internal ownership flag through the failed start result. Let the tool adapter mark its reconstructed error. Preserve HTTP 502. This repairs the tool creation wait but misses admission waits. The native regression requires both reporting owners. Effort: Medium.
  - **B.** Give internally handled failures one typed transport representation. Centralize their conversion to local errors with their reporting claims. Migrate `workspaceStartFailure` and its start-result producers. Preserve public replies, encrypted logs, and privacy filters. Effort: Medium.
  - **C.** Give each failure attempt one durable claim. Both owners submit through it, and only one sends. This adds storage and coordination. Effort: Large.
  - **D.** Add a required reporting claim to the failed start result and stored job failure. Set it when a scope accepts the capture of the error that ends the job. Have `workspaceStartFailure` mark the rebuilt error. Read an absent saved claim as unclaimed. This covers the tool creation wait and both admission waits, but not other relays. Effort: Medium.
- **Left out:**
  - Change nothing. It keeps two reports for one unexpected failure.
  - Disable start reports. A browser-created start can fail after its admission response and would lose its report.
  - Disable final 5xx capture. Other request failures would lose their required report.
  - Change the tool's error status or restore a stored status. This changes existing public behavior. Keep the current 502 conversion and its existing suspension exceptions.
  - Merge repeat-limit keys. Isolates have separate limiters, and unrelated failures could suppress each other.
  - Infer a claim from the public error code. The same code can identify a failure that no workspace scope reported.
  - Defer reporting while a request waits. The request can end first, and later browser starts have no waiter.
  - Rely on Better Stack to merge an event ID or fingerprint. It still sends two events and depends on unverified service behavior.
  - Change the protocol to report each component. The at-most-one rule stays, and the extra request report adds only request-layer frames.
  - Add a class-wide test or lint for relay conversions. It needs user approval. B prevents the class through the representation.
- **Wider fix:** B. A failure keeps its reporting claim through serialization and conversion. D covers only start results.
- **Previous examples:** `plans/follow-ups/routine-caught-failure-reports.md` already requires routine recovery to keep failed workspace attempts silent. The rethrown `git_credential_failed` warning also stays silent so final request capture owns it. Neither example carries a claim through a stored result.
- **Related:**
  - `plans/follow-ups/routine-caught-failure-reports.md`: the same ownership concern. Its recovery helper can read the relayed claim instead of assuming ownership. A user-script marker also does not cross the boundary, so routine recovery keeps its own failed-attempt silence rule.
  - `plans/follow-ups/typed-worker-error-codes.md`: the same trusted relay. When both fixes exist, the new relay uses that code type. Neither fix waits.
  - `plans/follow-ups/workspace-remote-failure-reports.md`: the same scope claim mechanism. Start capture already has an alarm scope. Only an accepted capture may give a claim, so a missing scope leaves the request report available. Neither fix waits.
  - `plans/follow-ups/gateway-stream-failure-reports.md`: the same final request capture. Skip only claimed causes, so its late gateway outcome still reports. Neither fix waits.
- **Recommendation:** B. A shared internal representation preserves the owner through each conversion. Its migration must cover both admission waits and the tool creation wait. D is the complete direct fix if the wider work is split off.
- **Action:** fix after merge, apply B, because the trigger is Rare, severity is Medium, and the fix has the same cost after merge.

The confirmed static path:

1. An app-owned `fetch`, `branch`, or `terminal` command exits with a nonzero code. `worker/lifecycle/start-command-execution.ts:89-100` throws `WorkspaceStartError`.
2. Only an exited command in the `startup` phase gets the `userCommandFailure` marker. The branch command in `worker/lifecycle/start-command.ts` runs app-owned git steps, not a user script.
3. The start coordinator runs through `worker/lifecycle/workspace-alarm.ts` in the workspace alarm scope. `runWorkspaceLifecycle` keeps that scope's reported causes.
4. `worker/lifecycle/start-coordinator.ts` captures `workspace_start_failed`. The policy accepts the unexpected branch failure.
5. `worker/lifecycle/start-provider-retry.ts` retries only transient provider errors. The terminal path calls `failedStartJob` and `finishFailedStart` in `worker/lifecycle/start-failure.ts`.
6. `worker/lifecycle/start-types.ts` and `worker/lifecycle/start-storage.ts` keep only the failure code, message, and log. `worker/lifecycle/workspace-transport.ts` copies this data without an error identity or claim.
7. `worker/tools/composition.ts` waits for the result. `workspaceStartFailure` constructs a fresh `WorkspaceStartError` with HTTP status 502.
8. `worker/tools/handler.ts` and `worker/http.ts` remember that fresh error and create the final response. `worker/error-reporting/entry.ts` captures it as `request_failed`.
9. `worker/error-reporting/scope.ts` can compare causes only within one scope. `worker/error-reporting/runtime.ts` also keys repeat limits on classification, type, route, and frame. These reports differ, and the two isolates have separate limiters.

The same conversion also occurs in `worker/lifecycle/workspaces.ts:131-132`. An unexpected failure before creation admission becomes a fresh HTTP 502 for a browser or tool create request. This has the same cause and fix as the later tool creation wait.

Requirements for the claim and conversion:

- `docs/protocol/error-reporting.md` requires a report for each final 5xx response and each hidden unexpected failure. It also permits at most one report for one failure.
- Existing same-scope deduplication lets an earlier capture own a final response's failure. Preserve that rule across the result boundary.
- Keep the workspace report with its original frames and phase. It is the only report when no request waits.
- A claim records acceptance by a reporting scope under the policy. It does not wait for delivery or depend on a limiter accepting an event.
- Set the claim in the catch that writes the terminal `job.failure`. The coordinator also captures transient errors before it retries them. An earlier transient capture must not claim a different terminal failure.
- A failure that the workspace kept silent still gets its required final 5xx report. This includes a user startup script failure or a normal refusal that the existing conversion maps to 502.
- Preserve all public statuses and response bodies, the encrypted logs, normal 4xx silence, and both privacy filters. Do not restore a stored status that the current conversion drops.
- The claim crosses the object boundary as plain internal data. Do not transport a raw error, secret, or user log as proof of ownership.
- Existing saved results with no claim remain readable as unclaimed. Add no new rejection or gate.

Evidence limits and native proof before a fix:

- Both reviews traced the complete code path. Neither ran a runtime reproduction or measured the two envelopes.
- The waiting request must remain open until the failed result arrives. An early branch or fetch failure meets this condition. A long wait can end before the second capture.
- Different classifications and frames support the inference of two Better Stack issues. Nobody observed those issues in the real service.
- Extend the native fixtures through the production requests. `worker/lifecycle/workspace-runtime-test-worker.ts` already collects workspace events through `nativeReportingFixture`. Collect Worker entry events through `dependencies.errorReporting` too.
- For a tool create with a failed branch command, require one filtered `workspace_start_failed` event with phase `branch`, and the same HTTP 502 body.
- For a browser create with an unexpected records-phase failure before admission, require one filtered event and the same HTTP 502 body.
- For a tool create whose user startup script fails, keep the workspace reporter silent and require one `request_failed` event.
- Show that the first two cases give two events before the fix. Preserve every existing state and response assertion. Run each changed asynchronous case ten times after the fix.
- The current policy test checks duplicate captures only inside one scope. The tool failure test in `worker/tools/handler.create.test.ts` mocks the service and does not collect both reporting owners.
