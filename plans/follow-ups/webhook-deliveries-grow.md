# The webhook delivery table grows without a limit

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-18, from branch `calummoore/firna-ai-user-interface-discrepancy-lsqt`, a new problem of the check of review finding 11.
- **Location:** `worker/github/data.ts:58` (`recordDelivery`) and the `github_webhook_deliveries` table.
- **Reason:** the code is on `origin/main`, and the branch does not change it.

- **Source:** Review. **Category:** Performance.
- **Background:**
  - `recordDelivery` adds one `github_webhook_deliveries` row for each GitHub webhook delivery that the Worker processes. `completeDelivery` sets its `processed_at`. `isProcessed` reads it, so a repeated delivery does nothing.
  - No code deletes old rows.
  - GitHub lets an owner of the GitHub App send a delivery again only within 3 days.
- **Problem:** The table keeps every delivery forever.
- **Impact if no action:** The D1 database grows with each push, pull request, check, and status event of every connected repository.
- **Root question:** How long does the app keep a webhook delivery record?
- **Options:**
  - **A.** Delete rows older than 7 days in an existing scheduled maintenance step, in small batches. Effort: Small.
  - **B.** Keep the rows, and record the growth rate to decide later. Effort: Small.
- **Left out:** Deleting rows at the time of each delivery adds a write to each webhook.
- **Wider fix:** None, because the class is one table.
- **Previous examples:** None found.
- **Recommendation:** A. A record older than 3 days cannot meet a redelivery, and 7 days leaves a margin.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch.
