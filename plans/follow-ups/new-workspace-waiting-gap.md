# A new workspace can briefly read as not waiting

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/loading-when-pending-p2f2`, review round 1, item 1.
- **Location:** `worker/lifecycle/waiting-summary.ts`, `worker/lifecycle/start-records.ts` (the record step of a create, which inserts the D1 row and later calls `initializeLifecycle`).
- **Reason:** The window lasts about one D1 round trip, and its harm is one list read of a still mark, so it does not hold the pull request.

- **Terms:**
  - **List mark:** the 3 × 3 grid beside a workspace name in the list, the command palette, and the chips (`src/ui/components/workspaces/WorkspaceMark.tsx`). A light runs around its ring while a message waits for the cloud computer to start.
  - **`messageWaiting`:** the optional field of the `Workspace` record that says whether a message waits for the start. `workspaceForViewer` in `worker/app-api/workspace-state.ts` sets it for each starting workspace.
  - **`pendingFirstMessage`:** the first message of a new workspace in the lifecycle state of the workspace Durable Object.
  - **Start job:** the stored plan of a start in the workspace Durable Object, at the key `lifecycle:start-job`. The job of a create holds the first message.
- **Background:** For a create, the record step of the workspace object inserts the D1 row in the `starting` state. It does that work outside the chat queue. Only the later step `initializeLifecycle` puts the first message into the chat queue and sets `pendingFirstMessage`. `waitingSummary` in `worker/lifecycle/waiting-summary.ts` reads only the chat queue and `pendingFirstMessage`.
- **Problem:** A list read between the insert and `initializeLifecycle` lists the new row as starting, but the object has no chat message and no lifecycle state yet. So the read answers `messageWaiting: false`, though the first message waits in the start job.
- **Impact if no action:** Another member or another tab can see the new workspace with a still mark for one list read, about 5 seconds. The creator's tab shows the light at once, because the create reply carries `true`.
- **Root question:** How does the waiting answer count the first message of a new workspace from the moment that the list shows its row?
- **Options:**
  - **A.** When the object has no lifecycle state, let `waitingSummary` also read the start job. Answer `true` for the job of a create that is not cancelled. `worker/members/workspace-receiver.ts` and `worker/lifecycle/archive-start.ts` already take the first message from that job. Add the case to `worker/lifecycle/waiting-summary.test.ts`. Effort: Small.
- **Left out:**
  - Insert the D1 row after `initializeLifecycle`: `initializeWorkspaceLifecycle` checks that row first, so this order needs a larger change of the create.
  - Answer `true` for each starting workspace whose object has no lifecycle state: it cannot tell a create from an object that lost its state.
  - Change nothing: the new row then shows the mark of a start without a message, which fails the goal.
- **Wider fix:** None, because the gap belongs to one step of one flow, and A closes it where the answer forms.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/starting-read-double-call.md` changes the same answer, so one branch can carry both.
- **Recommendation:** A. It reads the one store that holds the first message in that window, as two other paths of the object already do.
- **Action:** fix after merge, apply A, because the window is short and rare.
