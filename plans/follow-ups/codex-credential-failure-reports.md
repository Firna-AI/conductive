# Report hidden ChatGPT credential failures

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from finding 8 of the integration review on `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/codex-auth/device.ts:120-215`, `worker/codex-auth/renew.ts:81-184`, `worker/codex-auth/oauth.ts:49-53`, `worker/model-gateway/codex-auth.ts:23-33`, and `worker/error-reporting/entry.ts:39-46`.
- **Reason:** Reporting is missing only after an unexpected provider or internal fault. The fix has the same cost after merge and needs no migration.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Worker:** The server that handles Conductive requests.
  - **Device poll:** A request that checks whether a person approved ChatGPT device sign-in.
  - **Renewal:** The exchange that replaces an expiring ChatGPT access token.
  - **Credential task owner:** `CodexTaskOwner`, which keeps credential work alive through the request's `execution.waitUntil`.
  - **Report:** A filtered error event that Conductive sends to Better Stack.
- **Background:** The Worker owns ChatGPT device sign-in and renewal. These services can save a failed state instead of throwing the original error. `docs/protocol/error-reporting.md` requires a report when a catch hides an unexpected failure. Expected refusals stay silent.
- **Problem:** A claimed device poll can turn an OpenAI HTTP 500 into a saved failed state and HTTP 200. Renewal can turn that fault into `codex_reconnect_required`, then gateway HTTP 403. The catches report nothing, and final-status capture ignores both replies. The corrupt-login catch and raw gateway read failures can also hide unexpected causes.
- **Impact if no action:** Sign-in can fail or Codex work can stop with no Better Stack event. Workers Logs show only the successful or refused request. Operators depend on user reports.
- **Root question:** How does ChatGPT credential recovery report each unexpected failure once while keeping expected refusals silent?
- **Options:**
  - **A.** Capture in each hidden-failure catch before it replaces the cause. Use typed OpenAI status and expected replacement results. Capture renewal failures inside the shared task. Include corrupt-login and raw gateway read failures. Future catches can still omit reporting. Effort: Medium.
  - **B.** Use one credential recovery owner to classify, report, and apply the existing recovery action. Run it inside each owned poll and the shared renewal task. Make it the only caller of guarded failure writes. Give joined waiters a typed handled failure, and let gateway readers report only their own raw faults. Effort: Medium.
  - **C.** Return typed private failure outcomes to account and gateway adapters. Retain outcome observers through the task owner. This carries causes through more callers and can report a shared renewal once per joined request. Effort: Medium.
  - **D.** Make guarded failure writes own reporting. Give each write an expected reason or unexpected error. Report only when its update changes a row. Move all six calls, including corrupt-login recovery. Shared-task failures with no write and raw gateway turn-check failures still need separate captures. A fault racing login replacement stays silent. Effort: Medium.
  - **E.** Add a lint for catches that neither report nor rethrow, with markers for normal results. This is a repository-wide detection alternative. It adds a gate and needs user approval. It is not recommended. Effort: Large.
- **Left out:**
  - Change nothing or log only. Neither meets the existing reporting requirement.
  - Turn failed polls or renewals into HTTP 5xx. It changes the current sign-in and gateway contract.
  - Report every failed credential operation. Expected refusal, expiry, identity change, and login replacement must stay silent.
  - Observe only rejected tasks. The device task resolves after saving its failed state.
  - Report only in the OpenAI client. It misses D1, decryption, and encryption faults. It can also duplicate the device-start request's final 502.
  - Attach causes only to the final response. Owned tasks can outlive it, and one renewal can serve several responses.
  - Narrow the gateway catch to return 502 for raw faults as part of this fix. Keep current public results. The separate status investigation records that question.
  - Declare provider and internal credential faults normal. It removes their only operator signal.
  - Add a class-wide catch test. It needs user approval. The specific regression cases below remain necessary.
- **Wider fix:** B. A recovery transition cannot lose its reporting decision when one owner performs both actions. D covers only transitions with a write. E is an unselected detection alternative.
- **Previous examples:** `plans/follow-ups/software-image-failure-reports.md` and `plans/follow-ups/routine-caught-failure-reports.md` record hidden recovery failures in other owners. Main commit `d970f263` adds these credential paths.
- **Related:**
  - `plans/follow-ups/software-image-failure-reports.md` and `plans/follow-ups/routine-caught-failure-reports.md`: the same hidden-catch class, with separate recovery owners. Their optional lint alternatives share E. None of these tasks waits for that unselected lint.
  - `plans/follow-ups/gateway-stream-failure-reports.md`: the same final capture. It covers faults after headers. Credential tasks can outlive a request or serve multiple requests, so its late-response outcome alone does not fix this task.
  - `plans/follow-ups/workspace-remote-failure-reports.md`: a rejected turn-check call can reach the gateway catch here. Its scope-only wrapper adds no rethrowing capture, so reporting that raw rejection here does not duplicate an event.
  - `plans/follow-ups/relayed-start-failure-reports.md`: adapter captures can repeat one shared cause across scopes. B reports in the single shared task. Its private claim mechanism can mark that rejection if it ships first.
  - `plans/follow-ups/shared-worker-reporting-routes.md`: these reports use the initiating request template. Its direct ChatGPT route correction and this task improve the same gateway reports. Neither fix waits.
  - `plans/follow-ups/typed-worker-error-codes.md`: the same device feature, but a different field. This task adds missing events, not an HttpError code type.
  - `plans/follow-ups/gateway-credential-fault-status.md`: separately verifies the intent of the current raw-fault-to-403 mapping. This reporting fix keeps that reply unchanged.
- **Recommendation:** B. Keep classification, the accepted report, and recovery inside the owned task. Mark shared failures so each waiter stays silent for a cause already owned there.
- **Action:** fix after merge, apply B, because the trigger is Rare, severity is Medium, and the fix has the same cost after merge.

The static paths and required classification:

- `pollCodexDevice` claims the device inside `tasks.run`. The existing case in `worker/app-api/codex-device-failure.test.ts:70-72` supplies OpenAI HTTP 500.
- `readReply` in `worker/codex-auth/oauth.ts` throws a plain `Error` for that non-OK reply. The poll catch discards it and calls `failCodexDevice` with fixed failed-state text. The account route returns HTTP 200.
- The poll catch can also see missing or undecryptable codes, encryption faults, and D1 faults. These unexpected causes need a report.
- The changed-login fetch wrapper saves its normal failure, then throws a plain `Error`. An expected exchange refusal must also stay silent.
- Renewal uses the same reply reader. Its catch saves the reconnect cause and throws HTTP 401. The gateway maps it to terminal HTTP 403.
- The renewal catch can see provider, network, invalid-reply, encryption, and D1 faults. A refused refresh token or a 4xx identity-change error stays silent.
- The decrypt catch at `worker/codex-auth/renew.ts:81-95` also saves a reconnect cause with no report. Include this corrupt-login path.
- A replaced login makes a guarded renewal write return false. The loop reads the newer login. Expired device codes are checked outside the device catch. Keep those normal outcomes quiet.
- `readCurrent` can hide a raw D1 error from `freshCodexLogin`, or a rejected turn check from the route's read callback. Report those causes here.
- Keep `readCurrent` silent for a renewal failure already owned by the shared task, a saved reconnect condition, or the request lifetime's expected cancellation.

Classification design call, 11 November 2026:

- Preserve enough typed OpenAI reply information to distinguish the documented refusal from a provider fault. Today every non-OK reply becomes the same plain `Error`.
- Use a typed normal replacement outcome, or let the guarded write decide it. Today changed-login recovery also throws a plain `Error`.
- Do not assume that every upstream 4xx is an expected refusal. A provider block or a rate limit needs its documented classification.
- Keep every current public status, saved cause, credential write, and privacy filter. The protocol already requires a failed-state poll and a terminal HTTP 403 after renewal failure.

Ownership requirements for B:

- Create the capture in the owned device task or inside the single shared renewal task. The request scope and `execution.waitUntil` then retain it after the response ends.
- Joined gateway requests get the same renewal rejection but have separate scope claim sets. Capturing in every waiter's catch can duplicate the report.
- Mark the shared failure privately for silent waiters. Report a raw gateway failure only when it belongs to that reader.
- Keep abandoned claims silent. No cause exists for the lost attempt in a previous request.
- Keep raw OAuth replies, tokens, code values, ciphertext, and account data out of every event.
- A final HTTP 403 still creates no request report. The source catch owns the unexpected OpenAI 500 instead. This gives one report for one failure.

Evidence limits and native proof before the fix:

- The reviews read code, tests, docs, and history only. Neither observed an event or measured runtime scope retention.
- Prove that an owned task can report after its initiating response returns, through `execution.waitUntil` within the background-task limit.
- Make one shared renewal get OpenAI HTTP 500 while two gateway requests on different routes wait. Require exactly one filtered event. Keep both HTTP 403 replies and the reconnect cause.
- Make a device poll get OpenAI HTTP 500. Require one filtered event and the same HTTP 200 failed state.
- Require no event for a refused refresh, a changed login, an expired code, or an identity change.
- Keep all public body, credential, cleanup, and saved-cause assertions. Show that each new report assertion fails before the fix. Run changed asynchronous cases ten times afterward.
- Existing device tests call the route outside reporting. The renewal test covers an OpenAI 401 refusal. No existing gateway test supplies a renewal 5xx and collects its report.
