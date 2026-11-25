# The app tree model scans for each remove

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the wider fix that the agent split off review finding 152 of round 8.
- **Location:** `src/files/model/tree-model.ts:46`.
- **Reason:** The direct fix removed the scan for absent paths, and the index reaches the tree model and its row reader, which needs its own review.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Performance.
- **Location:** See the header.
- **Background:** The app applies each tree delta in `applyTreeDelta`. A remove of a held folder scans every entry of the tree to drop its descendants. A folder deletion arrives as one remove per entry, so each remove scans again. A measurement over 50,000 entries took 1,008 ms for a 482-entry folder deletion. The fix of finding 152 returns early for a path that the tree does not hold.
- **Problem:** Removes of held folders, kind changes, and folder moves still scan the whole tree per operation.
- **Impact if no action:** A large folder deletion in a large tree can stall the Files panel for about a second.
- **Root question:** How does the app apply a delta of many removes over a large tree without a scan per remove?
- **Options:**
  - **A.** Build a path index for each delta in `applyTreeDelta`, and use it for descendant lookups. Effort: Medium.
- **Left out:** Work split across frames, because the index removes the work.
- **Wider fix:** A.
- **Previous examples:** Review finding 152 of the same branch.
- **Related:** `plans/follow-ups/large-changed-folder-first-draw.md` covers the first draw of a large tree.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the direct fix already removed the measured absent-path cost.
