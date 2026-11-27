# One display model for the Merge queue group

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-27, from review finding 1 of branch `calummoore/remove-drag-to-merge-queue-p999`.
- **Location:** `src/shell/list/useQueueGroup.tsx`, `src/shell/list/MergeQueueGroup.tsx`, `docs/mockups/src/components/workspaces/SectionList.tsx`, `docs/mockups/src/components/workspaces/queueList.ts`.
- **Reason:** the branch fixed the mockup copy of the rule in place. A shared model changes the app and the mockups together, so it is a separate change.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Merge queue group:** the group at the top of the workspace list that shows the merge queue of each repository.
- **Background:** The app and the mockups each decide when the group shows, which block takes a dragged row, when the dashed drop zone shows, and when the source row fades. The branch changed the rule in the app, and the mockups kept an old branch that drew the group during a drag with no queue entries.
- **Problem:** The rule lives in two places, so a change to one side can leave the other side stale.
- **Impact if no action:** The next change to the rule can make the mockups and the app disagree again.
- **Root question:** Which layer owns the display rule of the group, so that the app and the mockups follow one copy?
- **Options:**
  - **A.** Add a display model in `src/ui/components/workspaces/` with plain domain types. It gives whether the group shows, the target block, whether the zone shows, and whether the source row fades. The app and the mockups both read it, each through a small adapter. Effort: Medium.
  - **B.** Share only a helper that says whether the group shows. Effort: Small. It does not cover the target block, the zone, or the faded row.
- **Left out:** A lint or a test that compares the two copies, because a structural fix removes the second copy.
- **Wider fix:** A.
- **Previous examples:** Commit `93bcefa91` made the mockups use the app's chat readers for the same reason.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it changes how the app prepares the group.
