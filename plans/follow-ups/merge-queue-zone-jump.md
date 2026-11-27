# The drop zone of a shown Merge queue group moves the list

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-27, from branch `calummoore/remove-drag-to-merge-queue-p999`, outside the scope of its review, with review finding 3 of that branch.
- **Location:** `src/shell/list/MergeQueueGroup.tsx` (the `zone` of `MergeQueueGroup`), `docs/mockups/src/components/workspaces/MergeQueueGroup.tsx`, `docs/mockups/design.md`, `docs/protocol/merge-queue-in-the-app.md` (section Drags).
- **Reason:** each option changes how the zone behaves or looks, and only the user chooses that.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Merge queue group:** the group at the top of the workspace list that shows the merge queue of each repository.
  - **Drop zone:** the dashed box "Drop here to add to the merge queue" in the group.
- **Background:** Branch `calummoore/remove-drag-to-merge-queue-p999` stopped the group from appearing during a drag while no queue has entries. While the group shows, it stays a drop target. The protocol says that the group shows a zone with a dashed outline when no shown block takes the dragged row.
- **Problem:** The group adds the drop zone at the start of a drag in two cases: the group is collapsed, or the dragged row's repository has no queue entries. The zone moves every section below it down by about 64 px. No mockup page draws the zone in a shown group, and `docs/mockups/design.md` no longer describes its look. The mockups on `origin/main` drew the zone only for an empty queue, so this gap is older than the branch.
- **Impact if no action:** The list still jumps under the pointer in these two cases, and the visual spec does not show the zone that the app draws.
- **Root question:** How does a shown group offer a drop for a row that no shown block takes, when the group is collapsed or the row's repository has no queue, without moving the list at the start of a drag?
- **Options:** Each option includes the mockup pages of its target for both cases and the look of the target in `docs/mockups/design.md`.
  - **A.** Keep the behaviour, and draw the zone in the mockups. Effort: Small.
  - **B.** Show the zone only while the pointer is over the group. The sections below move only then. Update the protocol rule. Effort: Small.
  - **C.** Never add a zone. Highlight the whole group while the pointer is over it, and give the reason of a row that cannot join in another place. Update the protocol rule. Effort: Medium.
- **Left out:** Reserving empty room for the zone at all times, because it adds space to the list when no drag runs.
- **Related:** `plans/follow-ups/merge-queue-display-model.md`, the same rule. The display model can encode whichever option is chosen, so neither item waits for the other. `plans/follow-ups/merge-queue-collapsed-drop-place.md`, the same zone: a mockup of the collapsed zone must use the fixed status text.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** B, because nothing moves at the start of a drag and the change is small.
- **Action:** ask the user, because options B and C change the protocol rule that a shown group shows a dashed zone when no shown block takes the row, and no user decision covers that change.
