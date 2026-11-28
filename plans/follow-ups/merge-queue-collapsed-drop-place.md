# A collapsed Merge queue group announces the wrong place

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from round 2 of the review of branch `calummoore/remove-drag-to-merge-queue-p999`.
- **Location:** `src/shell/list/MergeQueueGroup.tsx` (`DropZone`, its status text).
- **Reason:** the branch did not change the status text of the zone.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Drop zone:** the dashed box "Drop here to add to the merge queue" in the Merge queue group.
- **Background:** While the group is collapsed, a dragged row over it shows the drop zone. A screen reader hears where the row joins the queue.
- **Problem:** The zone always announces place 1. A drop adds the workspace at the end of the queue of its repository, so the place is wrong when that queue has entries.
- **Impact if no action:** A screen reader user hears a wrong place for the drop.
- **Root question:** How does the zone announce the place where the row actually joins?
- **Options:**
  - **A.** Give the zone the count of the entries of the row's repository, and announce that count plus 1. Effort: Small.
- **Left out:** Removing the place from the text, because the other drop targets announce it.
- **Related:** `plans/follow-ups/merge-queue-zone-jump.md`, the same zone.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
