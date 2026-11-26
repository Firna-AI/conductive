# Choose who removes the timer after admission

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-21, from branch `calummoore/cut-waits-in-workspace-start-and-resume-fvs3`, item 5 of workspace 296.
- **Location:** `worker/lifecycle/workspace-alarm.ts`, `worker/lifecycle/start-coordinator.ts`.
- **Reason:** Cal has not answered item 5, and workspace 316's option 2B covers the same timer.

- **Terms:**
  - **Admission:** the first step of a create. It records the new workspace and the first message, then answers the create request.
- **Background:** The lifecycle alarm run chains forward start phases in one run, except the move out of `records` (admission), which still waits for a 1 s timer before the provider allocation. Workspace 316 measured this timer at 0.97–0.99 s in 3 creates, and its local prototype removed exactly 1 s with a change in `start-coordinator.ts`.
- **Problem:** Two changes can remove the same 1 s: the chaining loop, or workspace 316's option 2B.
- **Impact if no action:** Each create keeps about 1 s of wait before the provider call.
- **Root question:** Which change removes the timer after admission?
- **Options:**
  - **A.** The chaining loop also chains the move out of `records`. One rule covers every forward move. Workspace 316's option 2B keeps only its resume part. Effort: Small.
  - **B.** Workspace 316's option 2B covers it inside the coordinator. The loop keeps its exception. Effort: Small.
- **Left out:** both changes: two mechanisms for one step, and the saving would be counted twice.
- **Wider fix:** A. One rule then covers every forward step.
- **Previous examples:** None found.
- **Recommendation:** A. One loop is simpler to test than two ways to move to the next step.
- **Action:** ask the user, because the choice moves work between two workspaces that Cal manages.
