# Streaming gateway failures lose error reports

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from finding 2 of the main integration review of `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/error-reporting/entry.ts:39-47`, `worker/error-reporting/scope.ts:52-63`, `worker/model-gateway/route.ts:99-108`, `worker/model-gateway/stream.ts:16-53`, and `worker/model-gateway/request-lifetime.ts:122-164`.
- **Reason:** The failure needs an unusual network, service, or timing fault. The fix has the same cost after merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Model gateway:** The Worker service that forwards agent model requests to Anthropic or OpenAI.
  - **Turn check:** A call that confirms whether an agent turn can continue.
  - **Report:** A filtered error event sent to Better Stack.
  - **Reporting scope:** The request context that supplies the reporter, its safe fields, and its background work.
- **Background:** The gateway returns headers before the streamed answer ends. It checks turn access while the answer continues. The request reporter checks the HTTP status when the route returns. `docs/protocol/error-reporting.md` requires a report when a catch hides an unexpected failure. It keeps normal results silent and permits at most one report per failure.
- **Problem:** After HTTP 200, an upstream read rejection only cancels the answer. A failed later turn check also only cancels it. A lease timer cancels an answer whose turn check does not return. None of these paths reports. The request reporter has already accepted 200. `WorkspaceLifecycle.checkTurnToken` has no separate reporting wrapper.
- **Impact if no action:** Better Stack receives no event for these failures. The operator can see a successful request record while the agent receives an interrupted answer. User reports are the workaround.
- **Root question:** After a gateway response returns its headers, how does each unexpected failure give one report, while normal endings give none?
- **Options:**
  - **A.** Report directly from the late read failure, failed turn check, and lease expiry. Preserve expected cancellation and avoid reports before headers return. This repeats decisions across catches and needs proof that each callback has a reporting scope. Effort: Medium.
  - **B.** Give the gateway request lifetime one typed terminal outcome. Distinguish expected cancellation from unexpected failure. Preserve the cause internally and report once. This still needs a reliable reporting scope after the request returns. Effort: Medium.
  - **C.** Add a shared Worker response-stream reporting adapter. Give the gateway typed normal cancellation causes. This reaches more infrastructure. Preview and file streams must also identify faults in user code as normal. Effort: Large.
  - **D.** Attach B's late outcome to the gateway response. Let the request entry observe it in its own reporting scope and background work. Report each unexpected failure once. Preserve the existing streaming and cancellation behavior. Effort: Medium.
- **Left out:**
  - Change nothing. It fails the reporting requirement.
  - Buffer the answer. It breaks the gateway's streaming requirement.
  - Report every cancellation. It incorrectly reports normal turn endings and client disconnects.
  - Report only at the workspace turn check. That code cannot see a failed call, a hung check, or an upstream read failure.
  - Report only at the upstream fetch dependency. It cannot see failed or hung turn checks.
- **Wider fix:** D. The reporting entry can honor a late outcome that a streaming route attaches, as it already honors a remembered response error.
- **Previous examples:** `worker/lifecycle/build-stream.ts` captures a late response failure. `worker/terminal/connections.ts` captures a failed periodic access check. `plans/follow-ups/software-image-failure-reports.md` records another failure hidden behind HTTP 200. Its guarded database write cannot own a response stream after headers return.
- **Related:** `plans/follow-ups/workspace-remote-failure-reports.md` establishes the workspace scope of `checkTurnToken`. It must not add a capture that rethrows, because this item reports a rejected turn check in the Worker. The scope-only change and the late-outcome change do not conflict, and neither item waits for the other. The claim check of `plans/follow-ups/relayed-start-failure-reports.md` must skip only claimed causes, so a late gateway outcome still reports. The fixes do not wait for each other.
- **Recommendation:** D. It keeps B's single outcome owner and uses the entry's reporting scope, background work, and one-report guard. The first review recommended B. The independent check recommended D because a late callback's current reporting scope is unproved.
- **Action:** fix after merge, apply D, because the likelihood is Rare, severity is Medium, and the fix does not get harder after merge.

The concrete paths are:

1. `routeModelGateway` returns the upstream status, normally 200, with `gatewayStream` as its body.
2. `workerFetchEntry` checks that status once. It observes no later body failure.
3. `reader.read()` can reject after headers return. The stream catch replaces the original cause and cancels.
4. A scheduled turn check can throw. Its catch also cancels.
5. The lease timer can expire while a turn check hangs. It cancels the answer without a report.

Keep these contracts when applying D:

- Preserve streaming, response statuses, access checks, cancellation, and backpressure from `docs/protocol/model-gateway.md`.
- Keep normal turn endings, denied turn access, client disconnects, and complete provider event streams silent.
- Preserve the original unexpected failure internally. Send only the existing filtered fields.
- Report once for a late read rejection, failed turn check, or lease expiry.
- Keep failures before headers return under the existing final 5xx reporting rule. Avoid a second report.
- Carry the late outcome through `transferResponseError`, beside the metadata that `rememberResponseError` already supplies.
- Observe the outcome through the entry's reporting scope and `waitUntil`. Do not rely on the consumer's later stream read having that scope.

The existing stream and lease tests verify cancellation through `requestBodyEntry(routeModelGateway)`. They do not install `workerFetchEntry` or a reporting fixture. Extend them through the reporting entry. Assert one filtered report for each of the three unexpected late failures. Assert none for normal completion, turn end, denied access, or client disconnect. Keep every cancellation assertion. Show the new assertions fail before the fix. Run each changed asynchronous case ten times, then run the complete gate.

The independent check also noted two unverified concerns. A client disconnect before headers return can become 502, which the final-status rule reports. The current build-log stream capture relies on a reporting scope inside `pull`. No runtime check established request-signal behavior or scope propagation for those observations. Use runtime evidence to check them while proving D. They are not confirmed defects. Do not change a reporting requirement without a user decision.
