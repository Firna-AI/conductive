# Smoke-test the merge queue in production

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-24, from `calummoore/merge-queue-k2ep`.
- **Location:** None.
- **Reason:** The test needs the merged and deployed change, real GitHub, and real cloud computers.

- **Background:** The merge queue lands the pull requests of one repository into its default branch, in an order that members control, as one GitHub stack (`docs/protocol/merge-queue.md`). Its tests use local D1 and a fake GitHub server, so the whole path has not run against GitHub.
- **Task:** In production, queue three real pull requests of `Firna-AI/conductive`, or of another repository of the org. Re-order them once. Check that:
  - each pull request restacks once onto the one below it,
  - one merge lands the green layers,
  - the next layer syncs after GitHub rebases it,
  - the bar line, the sidebar group, and Merge with N ahead match the mockups at `app/merge-queue` and `app/banner/merge-queue`.
- **Impact if no action:** A difference between GitHub and the fake server can stall the queue for real users.
- **Needs:** The deployed change, and three pull requests that are safe to merge.
- **Done when:** Three pull requests merged through the queue, and each check above passed or has a follow-up item.
