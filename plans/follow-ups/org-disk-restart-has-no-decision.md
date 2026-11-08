# The org disk-restart rule has no user decision

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from the options check of the operator section plan on branch `calummoore/admin-section-brainstorm`.
- **Location:** "Suspend an org" in `docs/protocol/operator-actions.md:200-202`, and the stop of one workspace in `worker/lifecycle/workspace-suspension.ts`.
- **Reason:** Only the user can confirm or change a rule that can delete the unpushed work of every member of an org.

- **Terms:**
  - **Disk restart:** a short start of a stopped cloud computer near day 14 of its stop, so that the provider keeps its disk.
  - **Org suspension:** the operator's block of a whole org after an abuse report. It stops every cloud computer of the org.
- **Background:**
  - On 8 November 2026 the user chose to skip the disk restart for the workspaces of a suspended owner, and to tell the members that an admin can move such a workspace to another member. That choice covers a suspended user only.
  - The org suspension came later the same day. Its rule in `docs/protocol/operator-actions.md` says that a stopped workspace of the org gets no disk restart, also after an owner change, and cites that same choice.
  - In a suspended org, no owner change helps, so the reason of the user's choice does not carry over.
  - A lift of a suspension, which the operator page adds, finds no disk of a workspace that stopped more than 14 days earlier.
- **Problem:** A rule that lets the provider delete every disk of a suspended org rests on a decision about suspended users only.
- **Impact if no action:** A wrongly suspended org can lose the unpushed work of all its members, and the protocol names a decision that did not cover it.
- **Root question:** Does an org suspension keep the disks of the org, and which user decision says so?
- **Options:**
  - **A.** Keep the rule, record the user's decision for orgs, and cite it in `docs/protocol/operator-actions.md`. Effort: Small.
  - **B.** Keep the disk restart during an org suspension. A later lift then finds every disk. Each stopped computer of the org starts briefly every 13 days, so code that an abuse report named can run again. It changes the "Suspend an org" rule and its tests. Effort: Medium.
  - **C.** Keep the rule, and bring back the overdue disk restarts when a suspension ends, from the existing 15-minute Cron Trigger. Disks that the provider already deleted stay lost. Effort: Medium.
- **Left out:** A saved snapshot of each suspended disk, because the user chose against snapshots for suspended owners on 8 November 2026.
- **Wider fix:** C. It brings the restart back however a suspension ends.
- **Previous examples:** None found.
- **Related:** On 8 November 2026 the user chose a Lift action on the operator page. A lift sets the disk restart again for each stopped workspace, but a disk that the provider already deleted stays lost. Option C of this item would also cover a suspension that ends in another way.
- **Recommendation:** A. The org rule then rests on a real decision, at the lowest cost. C protects the codebase best.
- **Action:** ask the user, because the rule can delete the work of every member, and no user decision covers it.
