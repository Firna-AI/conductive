# An ambient flag change starts a grace time

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small.
- **Kind:** Review finding 5.
- **Added:** 2026-11-27, from the review of branch `calummoore/background-task-missing-work-zqja`.
- **Location:** `runner/sdk-helper/src/providers/claude-background.ts`, where it calls `orphans.list()` with the live tasks only.
- **Reason:** the pinned agent program 2.1.318 never changes the `ambient` flag of a running task, so only a later SDK can cause it.

- **Source:** Review. **Category:** Product bug.
- **Background:** An ambient task is not live work. The adapter passes only the live tasks to the orphan tracker.
- **Problem:** If a task of a parked subagent stays listed and becomes ambient, the tracker sees it leave and starts a grace time. A replay then sent a note that said the still-listed task had ended.
- **Impact if no action:** After an SDK update, the turn can wait 2 minutes for work that is not live, and the main agent can get a false note.
- **Root question:** How does the runner start the grace time only when a task of a parked subagent has really ended?
- **Options:**
  - **A.** Pass the full set of listed IDs to the tracker. Start a wait only when an earlier live ID leaves that set. Effort: Small.
  - **D.** Take the end of each run from its terminal `task_notification`, keyed by task and run, not from the list. Effort: Small.
  - **C.** The shared task run registry. Effort: Medium.
- **Left out:** Treat ambient tasks as live work, because the protocol excludes them.
- **Wider fix:** C, `plans/follow-ups/claude-task-run-registry.md`.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because the pinned program does not cause it and the registry covers it.
