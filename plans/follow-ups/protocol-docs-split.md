# Six architecture and protocol docs pass the length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a new problem of the check of finding 10 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1.
- **Location:** `docs/protocol/access-and-security.md`, `docs/protocol/desktop-app.md`, `docs/protocol/chat-and-events.md`, `docs/protocol/workspaces-and-sandboxes.md`, `docs/architecture.md`, and `docs/protocol/operator-actions.md`.
- **Reason:** these pages also change in open branches, so one split after their merge avoids conflicts.

- **Terms:**
  - **Length target:** the `documentation` skill keeps each doc near 250 lines, and splits a longer doc into linked pages in the change that touches it.
- **Background:** The protocol docs grew with each milestone. Many branches touched these docs without a split. On 9 November 2026, the Desktop pause split the workspace tools into their own page. The waitlist adds requirements to the workspace and architecture pages and the operator actions page. These six pages still pass the target after both changes merge. The command palette page now meets the target.
- **Problem:** Six docs still pass the target, so a reader must scan long pages to find one rule.
- **Impact if no action:** Each branch that touches one of these docs breaks the length rule again, and the docs grow harder to read and to keep in line.
- **Root question:** How do the protocol docs stay short enough to read one topic at a time?
- **Options:**
  - **A.** Split each of the six remaining docs into linked pages by topic. Update every relative link and the doc lists in `docs/architecture.md` and `README.md`. Effort: Medium.
- **Left out:** A split in each open branch, because the branches change the same docs and would conflict. A lint for doc length, because it adds a gate.
- **Wider fix:** None. The `documentation` skill already holds the rule.
- **Previous examples:** `docs/protocol/workspace-tools.md` holds the moved tools requirements. The original workspace page keeps its section anchors as links.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because these pages also change in open branches.
