# Starting reads call the workspace object twice

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/loading-when-pending-p2f2`, review round 1, item 4.
- **Location:** `worker/app-api/workspace-state.ts` (`workspaceForViewer`), with its callers in `worker/app-api/lifecycle.ts`, and `readChatWorkspaceResponse` in `worker/chat/workspace-response.ts`.
- **Reason:** The fix changes two workspace object files outside the branch, and the cost is one round trip on an open or a resume of a starting workspace.

- **Terms:**
  - **Workspace object:** the Durable Object of one workspace, class `WorkspaceLifecycle` in `worker/workspace-lifecycle.ts`. It holds the chat queue and the lifecycle state.
  - **`messageWaiting`:** the optional field of the `Workspace` record that says whether a message waits for the start. The list mark runs its light during a start only when it is true.
  - **`suppliedSummary`:** the argument of `workspaceForViewer` that carries a chat summary that the route already read, so that no second call is needed.
- **Background:** The detail read and the resume first call `readChatWorkspaceResponse` on the workspace object. That call reads the lifecycle and the chat in one queue turn. The route passes its summary to `workspaceForViewer` as `suppliedSummary`. For a starting workspace, `workspaceForViewer` calls `readChatWorkspaceSummary({ messageWaiting: true })` to get the waiting answer.
- **Problem:** The branch for a starting record ignores `suppliedSummary` and always calls the object. So the detail read and the resume of a starting workspace call the object twice.
- **Impact if no action:** Each open of a starting workspace and each resume waits for one more round trip to the object, which runs in Western Europe.
- **Root question:** How does a read of a starting workspace get the waiting answer from the object call that it already makes?
- **Options:**
  - **A.** Add the waiting answer to the summary of `readChatWorkspaceResponse`, with the same test as `waitingSummary` in `worker/lifecycle/waiting-summary.ts`, in its one turn. `workspaceForViewer` then calls the object only when the supplied summary has no answer, such as from an older object. Effort: Small.
- **Left out:**
  - Change nothing: the reads stay one round trip slower.
  - Give the create reply `true` without a call: it is wrong for a replayed create whose first message the runner already took.
  - Ask the object only in the list read: the create and resume replies then lose their fresh answer.
- **Wider fix:** A. The supplied summary then carries each answer that `workspaceForViewer` needs.
- **Previous examples:** Commit `cf2e41a3b` added `suppliedSummary`, so that a read with a summary makes no second call.
- **Related:** `plans/follow-ups/new-workspace-waiting-gap.md` changes the same answer.
- **Recommendation:** A. It removes the second call where a snapshot already exists, and it keeps one waiting test in the object.
- **Action:** fix after merge, apply A.
