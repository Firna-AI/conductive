# The drop zone of a shown Merge queue group moves the list

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-27, from branch `calummoore/remove-drag-to-merge-queue-p999`, outside the scope of its review.
- **Location:** `src/shell/list/MergeQueueGroup.tsx` (the `zone` of `MergeQueueGroup`), `docs/mockups/src/components/workspaces/MergeQueueGroup.tsx`.
- **Reason:** the user asked to keep the drag into the group while the group shows. This case needs the user's choice.

- **Source:** Review. **Category:** Product bug. **Likelihood:** Common.
- **Terms:**
  - **Merge queue group:** the group at the top of the workspace list that shows the merge queue of each repository.
  - **Drop zone:** the dashed box "Drop here to add to the merge queue" in the group.
- **Background:** Branch `calummoore/remove-drag-to-merge-queue-p999` stopped the group from appearing during a drag while no queue has entries. While the group shows, it stays a drop target.
- **Problem:** When the group shows, and the dragged row's repository has no queue or the group is collapsed, the group adds the drop zone at the start of the drag. The zone moves every section below it down by about 64 px. No mockup page shows this zone now.
- **Impact if no action:** The list still jumps under the pointer in this case.
- **Root question:** How does the group offer a drop for a repository without a queue, without moving the list at the start of a drag?
- **Options:**
  - **A.** Keep the behaviour. Add a mockup page of the zone in a shown group. Effort: Small.
  - **B.** Show the zone only while the pointer is over the group. The sections below move only then. Add a mockup page. Effort: Small.
  - **C.** Never add a zone. Highlight the whole group while the pointer is over it, and give the reason of a row that cannot join in another place. Effort: Medium.
- **Left out:** Reserving empty room for the zone at all times, because it adds space to the list when no drag runs.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** B, because nothing moves at the start of a drag and the change is small.
- **Action:** ask the user.
