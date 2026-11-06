# Stop hides after a failed history load

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #13, branch `conductor/boat-native-remote-workspaces-milestone-8`, finding 3 and a new problem of its check.
- **Location:** the composer's running check in `src/chat/`, and `src/chat/state/turn-events.ts:100`.
- **Reason:** it needs a failed history request, and the next live event of the turn brings Stop back.

- **Terms:**
  - **Composer:** the message box of the chat, with Send and, while a turn runs, Stop.
- **Background:** The composer shows Stop while the open session runs a turn. It reads that from the session's transcript. The session record also names the running turn.
- **Problem:** When the history request of a session fails, its transcript has no turn, so the composer hides Stop although the turn runs. The first live event of that older turn also sets its start time, so the working row shows a time that is too short.
- **Impact if no action:** After a failed history load, the user cannot stop a running turn until its next event arrives.
- **Root question:** How does the composer know that a turn runs when the history did not load?
- **Options:**
  - **A.** Use the session record's running turn for the composer. A turn that ends live can then keep Stop on screen until a new record arrives. Effort: Small.
  - **B.** Use the session record until a live event of the turn arrives, and let the turn's end win. Effort: Small.
  - **C.** B, and take the turn's start time from the session record, so the working row shows the right time. Effort: Small.
- **Left out:** None.
- **Wider fix:** C. One running rule, with the record as the fallback, also for `interruptTurn`, which keeps its own copy of the rule.
- **Previous examples:** None found.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because it needs a failed history load.
