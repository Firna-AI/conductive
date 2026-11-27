# One registry of Claude task runs

- **Severity:** Medium. **Effort:** Medium.
- **Kind:** Wider fix of review findings 2, 3, and 5.
- **Added:** 2026-11-27, from the review of branch `calummoore/background-task-missing-work-zqja`.
- **Location:** `runner/sdk-helper/src/providers/claude-background.ts` and `claude-orphans.ts`.
- **Reason:** it changes how both wait paths read task state, which is wider than the fix of the stalled turns.

- **Source:** Review. **Category:** Code structure.
- **Background:** The Claude adapter reads task state in two places: the live work that holds a turn open, and the orphan tracker for parked subagents. Each keeps its own maps of task IDs, run IDs, ends, and owners.
- **Problem:** Three review findings came from these parallel maps: a failed wake that ends the hold (2), an ending read from another run (3, fixed), and an ambient change read as an end (5).
- **Impact if no action:** Each new task field or event order can again reach one map and not the other.
- **Root question:** How do both wait paths read one consistent state for each task run?
- **Options:**
  - **A.** One registry keyed by task ID and run ID. It holds presence, the ambient flag, the owner, the terminal status, and the output. Derive live work and orphan waits from it. Effort: Medium.
- **Left out:** More parallel maps, because they repeat the class.
- **Wider fix:** This item.
- **Previous examples:** Review findings 2, 3, and 5 of branch `calummoore/background-task-missing-work-zqja`.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it reaches both background wait paths.
