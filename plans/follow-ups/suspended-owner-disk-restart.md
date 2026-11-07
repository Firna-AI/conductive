# A suspended owner's workspaces get no disk restart

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the check of finding 10 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1.
- **Location:** `worker/lifecycle/disk-retention.ts:51`, `worker/members/maintenance-data.ts:22`, and the day-14 rule in `docs/protocol/workspaces-and-sandboxes.md:190`.

- **Terms:**
  - **Disk restart:** the start near day 14 that decision 43 D chose. The provider can delete the disk of a cloud computer that stays stopped for more than 14 days, so the app starts it for up to 30 minutes and stops it again.
- **Background:** Milestone 15m stops the cloud computers of a suspended user's workspaces and blocks their starts. It also skips the disk restart of these workspaces. Other members of the org share these workspaces. An admin can give such a workspace to an active member, and then it runs again.
- **Problem:** No decision weighs the disk restart against the suspension. Skipping it can lose the members' unpushed work. Doing it runs the suspended user's cloud computer for up to 30 minutes, with any program that the user set to start at boot.
- **Impact if no action:** The branch skips the restart. After 14 days, the provider can delete the disk with its unpushed work, unless an admin reassigns the workspace first.
- **Root question:** How does a suspended owner's workspace keep its members' work without running the suspended user's programs?
- **Options:**
  - **A.** Keep the disk restart for these workspaces. Members lose no work, but the suspended user's programs can run for up to 30 minutes every 14 days. Effort: Small.
  - **B.** Skip the restart, as the branch does, and state it in the protocol. The workspace's error tells members that an admin can give it to another member, which starts the retention again. Effort: Small.
  - **C.** Skip the restart, and keep the disk in another way, such as a saved snapshot of the provider, which decision 43 E proposed. A saved snapshot past the included count costs about $1.70 a month. Effort: Medium.
- **Left out:** Moving the workspaces to an admin at the suspension, because a human must choose who becomes responsible for a suspended user's work.
- **Wider fix:** None. This is a rule for one case.
- **Previous examples:** None found.
- **Related:** `suspended-member-ownership.md`, because a reassignment is the way out of B.
- **Recommendation:** B. It keeps the suspended user's programs off, and an admin can save the work within 14 days.
- **Action:** ask the user, because the options trade lost work against a running cloud computer of a suspended user, and no rule settles which one wins.
