# Five protocol docs pass the length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a new problem of the check of finding 10 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1.
- **Location:** `docs/protocol/access-and-security.md` (384 lines on the primary branch), `docs/protocol/desktop-app.md` (323), `docs/protocol/workspaces-and-sandboxes.md` (316), `docs/protocol/chat-and-events.md` (266), and `docs/architecture.md` (256).
- **Reason:** the open branches of Milestones 5c, 7w, 8i, and 15m change the same docs, so one split after they merge avoids conflicts.
- **Updated:** 2026-11-09, from branch `calummoore/routines-feature-brainstorm`, Milestone 2 of `plans/routines.md`. The routine rules made `docs/protocol/operator-actions.md` pass the target too, and they grew `docs/architecture.md` and `docs/protocol/workspaces-and-sandboxes.md`. Split `docs/protocol/operator-actions.md` in the same change.

- **Terms:**
  - **Length target:** the `documentation` skill keeps each doc near 250 lines, and splits a longer doc into linked pages in the change that touches it.
- **Background:** The protocol docs grew with each milestone. Many branches touched these docs without a split.
- **Problem:** Five docs pass the target, so a reader must scan long pages to find one rule.
- **Impact if no action:** Each branch that touches one of these docs breaks the length rule again, and the docs grow harder to read and to keep in line.
- **Root question:** How do the protocol docs stay short enough to read one topic at a time?
- **Options:**
  - **A.** Split each of the five docs into linked pages by topic, in one change after the open branches merge. Update every relative link and the doc lists in `docs/architecture.md` and `README.md`. Effort: Medium.
- **Left out:** A split in each open branch, because the branches change the same docs and would conflict. A lint for doc length, because it adds a gate.
- **Wider fix:** None. The `documentation` skill already holds the rule.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because four open branches change the same docs.
