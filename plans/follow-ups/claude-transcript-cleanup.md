# Claude may delete idle session memory

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/conductor-import-option`, the options check of the import's decision on old Conductor sessions.
- **Location:** `runner/src/providers/claude.ts`, `runner/src/providers/environment.ts`.
- **Reason:** the Conductor import found the problem, but it is a general runner setting that every workspace shares.

- **Terms:**
  - **Transcript:** the file in which the Claude program keeps one session, under `<CLAUDE_CONFIG_DIR>/projects/`. A later turn resumes the session from it.
  - **Agent data folder:** the runner sets `CLAUDE_CONFIG_DIR` to `~/.conductive/claude` in the cloud computer, in `runner/src/providers/environment.ts`.
- **Background:** The runner runs Claude through the Claude Agent SDK, with `persistSession: true` and the SDK option `resume` for each later turn, in `runner/src/providers/claude.ts`. The pinned SDK documents the setting `cleanupPeriodDays`: "Number of days to retain chat transcripts before automatic cleanup (default: 30)". The runner, the Worker, and the app set no value for it. A cloud computer stops after 30 minutes without activity, and its disk stays, so a session can sit unused for weeks.
- **Problem:** When the Claude program starts in a cloud computer, it can delete each transcript that nobody used for 30 days. A later message in that session then has no transcript to resume.
- **Impact if no action:** A session that the user returns to after 30 days continues without its memory. The chat history still shows, but the agent no longer knows it. A Conductor import that resumes old sessions meets the same limit.
- **Root question:** How long does the agent keep the memory of a session that nobody used for a while?
- **Options:**
  - **A.** Set `cleanupPeriodDays` to a large value, such as 36500, for every Claude run of the runner, through the SDK settings or a settings file in the agent data folder. First confirm that the pinned program runs its cleanup at start, and that the value applies. Effort: Small.
  - **B.** Keep the default, and state in the protocol docs that a session forgets its work after 30 days without use. Effort: Small.
  - **C.** Copy each transcript to a folder that the cleanup does not reach, and restore it before a resume. Effort: Medium.
- **Left out:** A cleanup of our own, because the app already deletes the whole cloud computer when its workspace is archived.
- **Wider fix:** A. One setting covers every session of every workspace.
- **Previous examples:** None found.
- **Related:** None.
- **Recommendation:** A. The memory of a session then lives as long as its cloud computer, and archive already ends it.
- **Action:** fix after merge, apply A, because it is a runner setting outside the import plan, and it needs one check of the pinned program first.
