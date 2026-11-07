# A suspended member can receive a workspace

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, finding 12 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1. The working agent of the branch found it.
- **Location:** `worker/members/member-data.ts:57-90` (the leave and its automatic transfer), `worker/members/ownership-data.ts:14` (a manual reassignment), and "When a member leaves" in `docs/protocol/orgs-and-members.md:109-113`.

- **Terms:**
  - **Owner:** the org member who is responsible for a workspace. A workspace runs only while its owner is not suspended.
  - **Suspension:** the operator's action that blocks a user's sign-in and new work, and stops the cloud computers of the workspaces that the user owns. The user keeps their org membership and role.
  - **Active admin:** an admin of the org who is not suspended.
- **Background:** When a member leaves an org, their workspaces move to the earliest admin (decision 39). An admin can also give a workspace to another member. The last admin can leave only after they make another member an admin (decision 55). Milestone 15m blocks every workspace whose owner is suspended, for all members, and it stops the disk restart near day 14 for such a workspace.
- **Problem:**
  - The automatic transfer can pick a suspended admin, also when an active admin exists.
  - A manual reassignment can pick a suspended member.
  - The last-admin check counts a suspended admin, so the last active admin can leave, and their workspaces go to the suspended admin.
- **Impact if no action:** A moved workspace cannot start, and its disk can be deleted after 14 days with its unpushed work, unless an admin notices and reassigns it. In an org where every admin is suspended, nobody can manage the org.
- **Root question:** Who receives a workspace when its owner changes, so that it stays with a person who can act, also in an org where some or all admins are suspended?
- **Options:**
  - **A.** Keep today's rules, and state the result in the protocol: a suspended member can receive a workspace, and it stays blocked until an admin reassigns it. Effort: Small.
  - **B.** Never give a workspace to a suspended member. The automatic transfer picks the earliest active admin. When the org has none, the member cannot leave. A manual reassignment to a suspended member fails, and the member picker marks suspended members. Effort: Medium.
  - **C.** Skip suspended admins in the automatic transfer, and allow a manual transfer to a suspended member after a confirmation. Effort: Medium.
  - **D.** Skip suspended admins in the automatic transfer when an active admin exists, else keep today's pick. A manual reassignment to a suspended member fails with a clear error. Every leave stays possible. Effort: Small.
  - **E.** One shared rule of an active admin. The automatic transfer picks the earliest active admin. The last-admin check counts only active admins. In an org with no active admin, a leaving member's workspaces go to the earliest member who is not suspended. A manual reassignment to a suspended member fails. Effort: Medium.
- **Left out:** Removing a suspended admin from the org at the suspension. It would move the suspended user's own workspaces to an admin and unblock them with no human choice, and the user loses their memberships if the suspension is lifted later.
- **Wider fix:** E. One rule of who can receive work serves the transfer, the last-admin check, the image refresh, and the ownership write.
- **Previous examples:** Finding 3 of the same branch, where the automatic image refresh picked a suspended admin. The branch fixed it with `firstActiveOrgAdmin`.
- **Recommendation:** E. It keeps each workspace with a person who can act while one exists, and it keeps decision 55 for active admins.
- **Action:** ask the user, because B, D, and E add new rejections of a leave or a reassignment, and A leaves workspaces that can lose their disks.
