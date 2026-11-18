# A failing start finish retries every 30 seconds forever

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from the finding check of review finding 2 on the branch `calummoore/perth-5m3h`, which adds sub-workspaces. The loop is also on `origin/main`.
- **Location:** `worker/lifecycle/workspace-alarm.ts:126` (the `catch` that sets the next alarm), `worker/lifecycle/start-failure.ts` (`finishFailedStart`).
- **Reason:** The loop is older than the branch that found it, and that branch removed the one cause that it knew, so no current error is known to loop.

- **Terms:**
  - **Start alarm:** the Durable Object alarm of a workspace that runs the steps of a create or a resume.
  - **Failure finish:** `finishFailedStart`, which ends a failed start: it revokes the token, detaches the sandbox, records the failure, and deletes a create that the app never accepted.
- **Background:**
  - The start alarm catches each error of a start step, also of the failure finish, and sets the next alarm in 30 seconds, or in 1 second for a superseded start.
  - The catch has no count and no limit. So an error that never goes away runs the alarm every 30 seconds for as long as the object lives.
  - During the work on sub-workspaces, the review found one such error: the delete of a never-accepted parent failed on the parent link of a child. That branch fixed the cause, so the delete no longer fails that way.
- **Problem:** A failure finish that throws the same error each time retries every 30 seconds with no end, and the workspace stays in its start state.
- **Impact if no action:** A future permanent error in the failure finish keeps a workspace in Starting and wakes its object every 30 seconds. The member sees no error, and the create call gets no answer.
- **Root question:** How does a failed start end when its own failure finish keeps failing?
- **Options:**
  - **A.** Count the retries of the failure finish, and after a fixed number record the start as failed with a generic error, so that the workspace shows its error state and the create call gets its answer. Effort: Medium.
  - **B.** Make each step of the failure finish safe to skip: catch the error of one step, log it, and go on with the others, so that one broken step cannot hold the rest. Effort: Medium.
  - **C.** Add a time limit to the failure finish, as the start has its 20-minute limit, and end it as failed at that limit. Effort: Small.
- **Left out:** A longer retry interval only, because it keeps the loop and only slows it.
- **Wider fix:** C. One limit ends every kind of permanent error in the finish, also an error that a later change adds.
- **Previous examples:** The review of `calummoore/perth-5m3h` reproduced a permanent `FOREIGN KEY constraint failed` in the delete of a never-accepted parent.
- **Recommendation:** C. A time limit follows the rule of the start itself and needs no list of steps.
- **Action:** fix after merge, apply C, because no current error is known to loop and the fix touches the start lifecycle outside this branch.
