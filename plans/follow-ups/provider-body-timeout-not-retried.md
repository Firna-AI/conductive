# Provider body time-outs skip the transfer retry

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from `calummoore/error-resolution-b5gz`, review finding 2.
- **Location:** `worker/sandbox/transport.ts:104`, `worker/chat/attachment-transfer-failure.ts:25`.
- **Reason:** The case needs a provider that sends its headers and then stalls, which is rare, and Try again still works, so the transport change can wait for its own branch.

- **Terms:**
  - **Provider:** the sandbox service (Boat) that runs each cloud computer. The Worker calls it through `BoatTransport` in `worker/sandbox/transport.ts`.
  - **Transfer retry:** when a step of a file check or a file download gets no answer from the provider, the Worker runs that check or download once more. `retryUnanswered` in `worker/chat/attachment-transfer-failure.ts` does it. A failure counts as no answer when its `ProviderError` has the kind `unavailable` and a status of 500 or more.
- **Background:** The user chose the transfer retry on 18 November 2026. `docs/protocol/attachment-transfers.md`, section "The transfer", states it: no answer is a request that times out, or an answer with a server error. `BoatTransport.request` aborts each request at its deadline: 30 seconds for most routes, 65 seconds for a file read, and 610 seconds for a synchronous command. When the fetch itself fails or aborts before the headers arrive, `requestWithinDeadline` throws `ProviderError('unavailable', 503)`. When the headers arrive and the body read then fails, it throws `ProviderError('invalid_response', 502)` for a 2xx answer, or the status kind for an error status.
- **Problem:** A provider can send HTTP 200 headers and then stall in the JSON body. The deadline then aborts the body read, and the error has the kind `invalid_response`. The transfer retry does not count it as no answer. A review reproduced it with the production client, the download process, and the retry helper: the result was one attempt, one request, step `start`, `unanswered: false`, and provider kind `invalid_response` with status 502. The test `worker/sandbox/boat-command-timeouts.test.ts` holds the fetch before the headers, so it does not cover this case.
- **Impact if no action:** In this case the turn fails after one try with "The attached files could not reach the cloud computer. Try again." The member must select Try again.
- **Root question:** How should the provider client report a request whose answer does not arrive in full before its deadline, so that the transfer retry counts it as no answer?
- **Options:**
  - **A.** Keep a time-out marker on the error when the body read fails at the deadline, and make the transfer retry read that marker. Add a regression for a stalled body. Cost: one more error field that each consumer must keep. Effort: Small.
  - **B.** In `BoatTransport.request`, throw `ProviderError('unavailable', 503)` when its own deadline aborts the fetch or the body read. Keep `invalid_response` for a complete body that does not parse or does not validate. Keep `providerError(response, null)` for an error status, so that a 404 with a stalled body stays `not_found` and a file check still reports a missing file. Add a regression for a 2xx answer whose body stalls until the deadline, with fake timers. Effort: Small.
  - **C.** Treat each 2xx body that does not arrive in full as no answer, also after a reset or a broken stream, not only at the deadline. This changes the protocol definition of no answer, so it needs a user decision and the full read of the legal pages and the public guides that the repository rules ask for. Effort: Small.
  - **D.** Add a typed time-out cause through the provider client, the transfer retry, and the warning summaries. Effort: Medium.
- **Left out:** Retrying every `invalid_response` also retries a malformed answer, which the user's choice does not cover. A second timer in the attachment code cannot cancel the provider request and counts a slow but complete answer as no answer. Changing nothing leaves a timed-out request without its retry.
- **Wider fix:** B. The component that owns the deadline then classifies every deadline failure, in each phase of the request.
- **Recommendation:** B, because it fixes the case inside the existing protocol definition, with no change of requirement.
- **Action:** fix after merge, apply B, because the case is rare, Try again still works, and the fix belongs to the shared provider client.
