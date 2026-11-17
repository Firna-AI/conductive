# A hung terminal read hides Reconnect

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the review of the automatic terminal reconnect on branch `calummoore/investigate-error-m9o4`, finding 2.
- **Location:** `src/terminal/terminalStore.ts` (the `read` of `terminalTool`), `src/terminal/terminalApi.ts` (`loadTerminal`), `src/terminal/terminalReadiness.ts` (`disconnected`).
- **Reason:** the same gap exists on `main` for the read of a manual Reconnect, so one fix for both reads belongs in its own change.

- **Terms:**
  - **Automatic try:** after a terminal connection drops with no close of the server, the Terminal tool reads the terminal state again and connects once by itself. Cal chose this on 17 November 2026.
- **Background:**
  - The Terminal tool reads `GET …/terminal` with `loadTerminal`. The read has no time limit. It ends only with an answer, an error, or the abort signal of the tool store.
  - While the automatic try reads, `disconnected()` in `terminalReadiness.ts` is false, so the screen shows no Disconnected bar and no Reconnect button.
  - A manual Reconnect shows "Opening the terminal" while it reads, also with no button.
  - The fix of the review measures each connection from its first output, so a slow socket no longer counts as a working connection.
- **Problem:** A read that never answers keeps the ended screen with no Reconnect button for as long as the page stays open.
- **Impact if no action:** In that rare case, the user must reload the page to use the terminal.
- **Root question:** How does the user get a working control when a terminal read never answers?
- **Options:**
  - **A.** Give each terminal read a time limit, such as 15 seconds. A read that passes it gives the error view with Try again, or, for the automatic try, the ended screen with Disconnected. Effort: Small.
  - **B.** Show the Disconnected bar with Reconnect also while the automatic try reads. Effort: Small. It shows the bar for a moment on each successful try.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A retry loop with a wait, because the user chose one try.
- **Wider fix:** A, because it also covers the read of a manual Reconnect and of the first open.
- **Previous examples:** None found.
- **Recommendation:** A. It ends every hung read with a control.
- **Action:** fix after merge, apply A.
