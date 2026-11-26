# Three archived Boat sandboxes stay on the large size

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/failed-message-action-kssx`, the options check of the plan for the workspace disk hold.
- **Location:** `worker/lifecycle/archive-maintenance.ts:65` and `worker/lifecycle/disk-retention.ts:125`.
- **Reason:** Boat must explain its disk measure before these sandboxes can move back to the `default` size.

- **Terms:**
  - **Resume limit:** the largest disk that a Boat resume accepts on one size. On 2026-11-26 it was 51.2 GiB of Boat's measure for `default`.
  - **Background restart:** the restart near day 14 and the Archive restart, which resume a stopped sandbox to keep its disk.
- **Background:** On 2026-11-26, four Boat sandboxes of archived Mokly workspaces failed every resume with HTTP 409 `resume_failed`. Each held 52 to 57 GB of Rust build output in `/home/user/code/mokly/target`. An operator resumed each on the `large` size with `noEnv: true`, deleted that folder, and stopped it. The used disk fell to about 30 GB. `bx_nqkvc3s5` then moved back to `default`. For `bx_k4th26f3`, `bx_2pccpak4`, and `bx_gah52t9c`, Boat still refused `default`: "needs 58.2 GiB", "56.4 GiB", and "56.7 GiB" of 51.2 GiB. A new full snapshot did not change the figure. These three stay stopped on `large`, so the background restarts work.
- **Problem:** Three archived sandboxes cost twice as much per hour while a background restart runs them.
- **Impact if no action:** A small extra cost for a few minutes about every 14 days per sandbox.
- **Root question:** When can these three sandboxes move back to `default`?
- **Options:**
  - **A.** Ask Boat why the figure does not drop after a delete. Move each sandbox back to `default` when Boat says that it fits: a resume with `type: "default"` and `noEnv: true`, then a stop. Effort: Small.
  - **B.** Leave them on `large`. Effort: Small.
- **Left out:** A Worker change, because the plan for the disk hold covers new cases.
- **Wider fix:** None. The disk hold is the wider fix for new cases.
- **Previous examples:** `bx_egwvnjzg` on 2026-11-26, which moved back to `default` after the same cleanup.
- **Recommendation:** A, because the extra cost is small, and Boat's answer also matters for the disk hold.
- **Action:** fix after merge, apply A, because it waits for Boat's answer.
