# Webhooks answer after GitHub's 10-second limit

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/github-unavailable-error`, a problem found with the fix for "GitHub is not available" after a merge.
- **Location:** `worker/github/webhook.ts:130-162`.
- **Reason:** The fix after a merge does not change how a webhook runs its refreshes, and the Worker still finishes most of the work after GitHub stops waiting.

- **Terms:**
  - **Webhook delivery:** one event that GitHub sends to `POST /v1/github/webhooks`. The D1 table `github_webhook_deliveries` records `received_at` and, after the work, `processed_at`.
- **Background:**
  - `handleGitHubWebhook` in `worker/github/webhook.ts` refreshes each candidate workspace one after another, and only then answers GitHub.
  - GitHub waits 10 seconds for an answer. After that it closes the connection and records the delivery as failed. It does not send it again.
  - On 2026-11-11, the processed deliveries in production took 16 to 56 seconds on average in each hour, and up to 108 seconds.
- **Problem:** Most deliveries answer after GitHub's limit. GitHub records them as failed, also when the Worker finishes their work later.
- **Impact if no action:** The delivery log of the GitHub App shows false failures, so a real failure is hard to see. When the runtime stops a request after its client leaves, the work of that delivery is lost with no retry.
- **Root question:** How does the Worker accept a webhook within 10 seconds and still finish each refresh?
- **Options:**
  - **A.** Answer at once, and run the refreshes in `waitUntil` of the request. The runtime gives that work only about 30 seconds after the answer. Effort: Small.
  - **B.** Record the delivery, answer at once, and let each workspace object run its refresh from a stored request and its alarm, as scheduled reads do now. The work then survives a stopped request, and a failed read retries. Effort: Medium.
  - **C.** Send each delivery to a Cloudflare Queue, and refresh from the queue consumer with retries. It adds a new binding and a deploy setting. Effort: Medium.
- **Left out:** Faster refreshes alone. Fewer candidates help, but a large repository can still pass 10 seconds.
- **Wider fix:** B. Durable work with retries fixes the lost work and the false failures together.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/github-reads-exceed-app-rate-limit.md` has the same cause, and its option A makes each delivery faster.
- **Recommendation:** B. It keeps each refresh, retries a failed one, and needs no new binding.
- **Action:** fix after merge, apply B, because it changes how webhooks run, which is outside the merge fix, and the user may first choose how to cut the reads.
