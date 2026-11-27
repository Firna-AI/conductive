# A failed wake of a parked subagent gets no note

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Kind:** Review finding 2.
- **Added:** 2026-11-27, from the review of branch `calummoore/background-task-missing-work-zqja`.
- **Location:** `runner/sdk-helper/src/providers/claude-orphans.ts`, `list()` and `notice()`.
- **Reason:** the agent program then sends the main agent its own `failed` notice, so the turn does not end silently.

- **Source:** Review. **Category:** Product bug.
- **Background:** When a task of a parked subagent ends, the runner holds the turn for 2 minutes so that the agent program can wake the subagent. If the subagent does not run again, the main agent gets a note with the task result.
- **Problem:** The hold ends as soon as the subagent joins the task list again, or as soon as an `assistant` frame of the subagent arrives, also an error frame. If the wake then fails before the subagent acts, no note goes out.
- **Impact if no action:** The main agent gets only the program's `failed` notice, with no task, status, or output file. It can end its reply with the work half done.
- **Root question:** Which event shows that the woken subagent has taken the task result, so that the fallback can stop?
- **Options:**
  - **A.** Keep the wait until a genuine model reply of the subagent. Ignore frames with `error` or `isSynthetic`. Defer the note while the woken run is listed. Effort: Small.
  - **E.** A, and also end the wait at a `completed` end of the woken run. Send the note at once when the woken run ends `failed`. Update the protocol lines on when the grace time ends, and the note text "did not run again". Effort: Small.
- **Left out:** A rule in the agent instructions, because the user rejected such rules for background work decision 4.
- **Wider fix:** `plans/follow-ups/claude-task-run-registry.md`.
- **Recommendation:** E.
- **Action:** fix after merge, apply E, because the likelihood is Rare and the program's own failure notice reaches the main agent.
