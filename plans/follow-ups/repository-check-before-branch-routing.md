# Tag pushes and fork pull requests skip the repository check

- **Severity:** High. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/firna-ai-user-interface-discrepancy-lsqt`, finding 11 of review round 3.
- **Location:** `worker/github/webhook.ts:138-142`, `worker/github/webhook-routing.ts:79` and `:95`, `worker/github/repository-values-check.ts`, and `worker/github/README.md:29`.
- **Reason:** the review found it after the two fix rounds that the review rules allow, and it needs a rare order of events.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Saved values:** the `full_name` and `default_branch` columns of the `repositories` table.
  - **Repository check:** `checkRepositoryValues` in `worker/github/repository-values-check.ts`. It compares the repository name and default branch of a webhook payload with the saved values. When they differ, it reads GitHub, saves through the guarded writer, and wakes the image coordinators.
  - **Branch router:** `webhookRoute` in `worker/github/webhook-routing.ts`. It names the branch of an event for workspace refreshes, push image refreshes, and automation runs, or returns null for an event that those consumers ignore.
- **Background:**
  - On 18 November 2026 the user chose that push, pull request, check, and status webhooks repair the saved values after a missed repository webhook. `docs/protocol/repository-changes-on-github.md`, section "A missed repository webhook", states it.
  - `handleGitHubWebhook` in `worker/github/webhook.ts` calls the repository check only after the branch router accepted the event and after `isProcessed` and `recordDelivery`.
  - The branch router returns null for a tag push (`refs/tags/...`) and for a pull request from a fork. The handler then answers 204 before the repository check. Both events still carry the base repository's `full_name` and `default_branch` in the top-level `repository` object.
- **Problem:** A tag push or a fork pull request never runs the repository check, although the protocol says that push and pull request webhooks do.
- **Impact if no action:** When the saved values are already old, and the repository then gets only tag pushes or fork pull requests, the saved values and the org image keep the old name or default branch. A later branch push, a same-repository pull request, or a check or status webhook still repairs them.
- **Root question:** How does every push, pull request, check, and status webhook of a saved repository compare its repository values with the saved values?
- **Options:**
  - **A.** Give the branch router a repository-only result for tag pushes and fork pull requests, and run the check for it. Effort: Small.
  - **B.** Read the verified repository and installation IDs separately, and run the repository check once before `webhookRoute`. Keep the router filters for the branch consumers. Add a regression with changed values in a tag push and a fork pull request. Update the "routed webhook" sentence of `worker/github/README.md`. Effort: Small.
  - **D.** Narrow the protocol: only branch pushes, same-repository pull requests, and check and status webhooks run the check. This changes the text of the user's answer of 18 November 2026, so it needs the user. Effort: Small.
- **Left out:** Removing the fork and tag filters of the router breaks `docs/protocol/pull-request-runs.md` and refreshes workspaces for tags. Repeating the check in each ignored branch is worse than B on every point.
- **Wider fix:** B, because no later router filter or router error can then skip the check.
- **Previous examples:** `plans/follow-ups/deleted-fork-webhook.md` records another router assumption about valid fork events.
- **Related:** `plans/follow-ups/repository-wiring-native-test.md` can send a tag push with changed values once B is in.
- **Recommendation:** B. One call before the router covers every event of the four families.
- **Action:** fix after merge, apply B, because the review found it after the two allowed fix rounds and the case is rare.
