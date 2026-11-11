# The gateway never sees a client disconnect in production

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the check of finding 6 of review round 2 on branch `calummoore/openai-subscription-token-support` (pull request #177).
- **Location:** `wrangler.jsonc:5-6`, `worker/model-gateway/request-lifetime.ts:41-42` on `main`, and the requirement in the section "Streams" of `docs/protocol/model-gateway.md`.
- **Reason:** the setting and the code are on `main`, from the model gateway change (#173), so one fix in a separate branch reaches every open branch.

- **Terms:**
  - **Model gateway:** the Worker routes under `/v1/model/` that add the real agent login to the model requests of a cloud computer, in `worker/model-gateway/`.
  - **Compatibility flag:** a setting in `wrangler.jsonc` that turns on a Cloudflare Workers runtime behaviour for this Worker. The compatibility date turns on each behaviour of its date and earlier.
- **Background:**
  - `docs/protocol/model-gateway.md` requires: "When the agent program closes its connection, the gateway cancels the request to the upstream."
  - `GatewayRequestLifetime` in `worker/model-gateway/request-lifetime.ts` listens for the `abort` event of `request.signal`, and cancels the upload, the upstream request, and the answer.
  - The Worker runs with `"compatibility_date": "2026-11-06"` and the only flag `global_fetch_strictly_public`.
  - Cloudflare's changelog of 2 November 2026, "Request.signal enabled by default", says that `request.signal` reports client disconnects by default only from the compatibility date `2026-11-17`. An earlier date needs the flag `enable_request_signal`. "Existing Workers keep their current behavior until you change their compatibility date or flags."
  - The Node tests of the gateway abort the signal themselves, so they pass.
- **Problem:** In production, `request.signal` never fires on a disconnect, so the gateway does not cancel the upstream request when the agent program closes its connection.
- **Impact if no action:** A model request whose agent program left keeps streaming from Anthropic or OpenAI until it ends or the 30-second lease after the turn ends. It spends the member's subscription or API key for nothing. A later date change turns the behaviour on with no review of its effect.
- **Root question:** How does the gateway learn in production that the agent program closed its connection?
- **Options:**
  - **A.** Add `enable_request_signal` to `compatibility_flags` in `wrangler.jsonc`. Add a line to `docs/deployment.md` if it lists the flags. Effort: Small.
  - **B.** Move the compatibility date to `2026-11-17` or later. Cost: the date also turns on every other runtime change between the two dates, which each need a review. Effort: Medium.
  - **C.** Change nothing, and drop the requirement from the protocol doc. Cost: copied turn tokens and left requests spend the login until the lease ends. This needs a user decision. Effort: Small.
- **Left out:** A check of the connection with a timer fails the goal, because a Worker has no other signal of a disconnect.
- **Wider fix:** None. The flag is the runtime switch for this one behaviour.
- **Previous examples:** None found.
- **Recommendation:** A. It turns on the one behaviour that the requirement needs, and keeps the other runtime changes of the date for their own review.
- **Action:** fix after merge, apply A, because the setting is on `main` and one fix reaches every open branch.
