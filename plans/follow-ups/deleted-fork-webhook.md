# A deleted fork's pull request event gets HTTP 400

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/routines-feature-brainstorm`, a new problem of the options check of the routines plan.
- **Location:** `worker/github/webhook-routing.ts:18-27` and `worker/github/webhook-routing.ts:73`.
- **Reason:** The routines plan does not change how the webhook route reads forks, and the event already starts no work.

- **Terms:**
  - **Webhook route:** `webhookRoute` in `worker/github/webhook-routing.ts`. It reads a verified GitHub webhook and names the repository and the branch that the event is about, or gives null for an event that the app ignores.
  - **Fork:** a copy of a repository under another GitHub account. A pull request from a fork has a head repository that differs from its base repository.
- **Background:**
  - The GitHub App sends `pull_request`, `pull_request_review`, and `pull_request_review_thread` events to `POST /v1/github/webhooks` on the machine hostname. `handleGitHubWebhook` in `worker/github/webhook.ts` checks the signature, then calls the webhook route.
  - The webhook route ignores a pull request from a fork. At line 73 it compares `id(head.repo)` and `id(base.repo)` with the repository of the event, and it gives null when they differ.
  - `id()` at lines 18-27 accepts only an object with a positive safe integer `id`. For any other value, it calls `invalid()`, which throws HTTP 400 with the code `github_webhook_invalid`.
  - GitHub sends `pull_request.head.repo` as null when the fork of the pull request was deleted.
- **Problem:** For a pull request whose fork was deleted, `id(head.repo)` throws. The route answers HTTP 400 for a valid, signed event, in place of null.
- **Impact if no action:** GitHub records each such delivery as failed, so the delivery log of the GitHub App shows false failures. The app loses no work, because it ignores pull requests from forks anyway.
- **Root question:** How does the webhook route treat a pull request event whose head repository no longer exists?
- **Options:**
  - **A.** Treat a null `head.repo` as a fork: the route gives null, and the handler answers 204 as for any ignored event. Add the case to the tests of the webhook route. Effort: Small.
  - **B.** As A, and give null for any pull request event whose head or base repository is missing or has no valid ID. Only a missing `repository` or `installation` at the top level stays a 400. Effort: Small.
- **Left out:** Answering 200 with a log line for each such event. It adds a log that nobody acts on, and A already stops the false failure.
- **Wider fix:** B. It covers every missing repository of a pull request, not only a deleted head fork.
- **Previous examples:** None found.
- **Recommendation:** B. It ends the false failures for each shape of a missing repository with the same small change.
- **Action:** fix after merge, apply B, because the problem is outside the scope of the routines plan, and it loses no work.
