# A rollback can save a stale tree count

- **Severity:** High. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, review finding 50 of round 7. Cal's instruction of the same day keeps the residual as a deferred item.
- **Location:** `worker/files/bucket-delta.ts:184` on `main` (the previous Worker), and `worker/files/bucket-delta.ts` and `worker/files/state.ts` on the branch.
- **Reason:** Cal asked to keep the residual as a deferred item, and the chain needs a rollback across the change, so the fix can follow the merge.

- **Severity:** High. **Likelihood:** Rare. **Effort:** Small.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** See the header.
- **Terms:**
  - **Omitted count:** `omittedEntryCount`, the number of tree entries that a limited tree report leaves out. The Worker saves it in the manifest of the stored tree.
  - **Previous Worker:** The Worker release before the runner file report limits. A rollback returns to it.
- **Background:** The protocol says that a count is either correct for its list or unknown. Omitted totals that a list does not carry are unknown, not zero (`docs/protocol/file-reports.md`, "Omitted totals"). The new Worker saves the count with the tree. The previous Worker drops the field when it parses a report, but its delta writer copies all saved manifest fields and changes only the revision.
- **Problem:** The following chain saves a count that no longer matches its list:
  - The new Worker saves a limited tree with a count.
  - A rollback returns to the previous Worker. The runner reconnects, and it resends a delta that the new Worker had not confirmed. That delta changes the listed entries and carries a new count.
  - The previous Worker drops the new count, applies the entries, and copies the old count into the saved manifest.
  - The runner stops before its full tree after the reconnect lands.
  - After the re-upgrade, the new Worker serves the old count as a known value.
  The panel then shows a notice with a wrong number until the next full tree arrives. The next connect sends one, so the error ends there.
- **Impact if no action:** In a rare chain after a rollback, the All files notice can show a wrong number of left-out entries.
- **Root question:** How does the new Worker recognise a saved count that a previous Worker carried past a change of the list?
- **Options:**
  - **A.** Save the tree revision at which the count was set, beside the count. When the saved tree revision differs from that revision, treat the count as unknown. The previous Worker advances the revision and copies the old count revision, so the mismatch shows. A delta with a count sets both values. Effort: Small.
  - **B.** Ship the Worker storage of the count in a release before the runner limits, so that a rollback never reaches a Worker without the field. Effort: Medium.
- **Left out:** A fix in the previous Worker, because a rollback runs the code that is already on `main`.
- **Wider fix:** A. Every saved total then carries the revision that it describes.
- **Previous examples:** `plans/follow-ups/tools-refuse-older-worker-replies.md` records another rollback case where an older Worker's missing fields changed what a newer reader saw.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because Cal asked to keep the residual as a deferred item.
