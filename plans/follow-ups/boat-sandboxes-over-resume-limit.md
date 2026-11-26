# Four archived Boat sandboxes fail every resume

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/failed-message-action-kssx`, the options check of the plan for the workspace disk hold.
- **Location:** `worker/lifecycle/archive-maintenance.ts:65` and `worker/lifecycle/disk-retention.ts:125`.
- **Reason:** the disk hold prevents new cases, but it does not recover sandboxes that are already over the limit.

- **Terms:**
  - **Resume limit:** the largest used disk that a Boat resume accepts. On the `default` size it was 76 GB on 2026-11-26.
  - **Background restart:** the restart near day 14 and the Archive restart, which resume a stopped sandbox to keep its disk.
- **Background:** Four Boat sandboxes of archived workspaces return HTTP 409 `resume_failed` on each resume: `bx_2pccpak4`, `bx_k4th26f3`, `bx_nqkvc3s5`, and `bx_gah52t9c`. The background restarts try each one about once an hour. A fifth sandbox, `bx_egwvnjzg`, failed for a disk of 79.7 GB over the limit. An operator fixed it on 2026-11-26: a resume on the `large` size, a delete of the Rust `target/` folder, and a move back to `default`. All four also show `wipePendingUntilRestart: true`, a Boat flag that a share of the sandbox sets.
- **Problem:** The cause of the four failures is not confirmed. It can be the disk size or the pending wipe.
- **Impact if no action:** The background restarts keep failing, and the disks of these archived workspaces can expire on Boat.
- **Root question:** How do these four archived workspaces keep their disks?
- **Options:**
  - **A.** Ask Boat support for the cause of each failure. Effort: Small.
  - **B.** An operator resumes each sandbox on `large` with `noEnv: true`, deletes rebuildable build output, stops it, then resumes it on `default` and stops it again. Each step costs a short run of a larger machine. Effort: Small.
  - **C.** Leave them. The workspaces are archived, and their owners can restore them while Boat keeps the disk. Effort: Small.
- **Left out:** A code change in the Worker, because the disk hold covers new cases and these are four single cases.
- **Wider fix:** None. The disk hold is the wider fix for new cases.
- **Previous examples:** `bx_egwvnjzg` on 2026-11-26, and an 80.4 GB disk on 2026-11-20 in commit `a8c31a53c`.
- **Recommendation:** A, then B for each sandbox that is over the limit, because B worked for `bx_egwvnjzg`.
- **Action:** ask the user, because B writes to the shared provider account.
