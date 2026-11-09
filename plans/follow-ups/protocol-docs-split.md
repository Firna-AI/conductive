# Three protocol docs pass the length target

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, a new problem of the check of finding 10 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1.
- **Location:** `docs/protocol/access-and-security.md`, `docs/protocol/desktop-app.md`, and `docs/protocol/chat-and-events.md`.
- **Reason:** these remaining pages cover protocols outside the Desktop interface pause, so their split stays in a separate change.

- **Terms:**
  - **Length target:** the `documentation` skill keeps each doc near 250 lines, and splits a longer doc into linked pages in the change that touches it.
- **Background:** The protocol docs grew with each milestone. Many branches touched these docs without a split. On 9 November 2026, the Desktop pause split the workspace tools into their own page. The workspace page is now 226 lines, and the architecture page is 250 lines. Both meet the target.
- **Problem:** Three docs still pass the target, so a reader must scan long pages to find one rule.
- **Impact if no action:** Each branch that touches one of these docs breaks the length rule again, and the docs grow harder to read and to keep in line.
- **Root question:** How do the protocol docs stay short enough to read one topic at a time?
- **Options:**
  - **A.** Split each of the three remaining docs into linked pages by topic. Update every relative link and the doc lists in `docs/architecture.md` and `README.md`. Effort: Medium.
- **Left out:** A split in each open branch, because the branches change the same docs and would conflict. A lint for doc length, because it adds a gate.
- **Wider fix:** None. The `documentation` skill already holds the rule.
- **Previous examples:** `docs/protocol/workspace-tools.md` holds the moved tools requirements. The original workspace page keeps its section anchors as links.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the remaining pages are outside the Desktop interface pause.
