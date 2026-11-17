# A failed terminal retry can lose the old output

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the review of the automatic terminal reconnect on branch `calummoore/investigate-error-m9o4`, finding 1.
- **Location:** `src/terminal/TerminalScreen.tsx` (the effect on `[terminal, connect]`), `src/terminal/terminalReadiness.ts` (`answer` and `ended`).
- **Reason:** the fix makes one xterm.js screen outlive its connection, a refactor of `TerminalScreen.tsx` that the terminal tabs branch `calummoore/terminal-tabs-implementation-l5ml` also rewrites.

- **Terms:**
  - **Automatic try:** after a terminal connection drops with no close of the server, the Terminal tool reads the terminal state again and connects once by itself. Cal chose this on 17 November 2026.
  - **Ended screen:** the xterm.js screen of a connection that ended. Its input is off. Its text stays so that the user can copy it.
- **Background:**
  - `docs/protocol/workspace-tools.md`, section Terminal, says: "When the connection ends, the user can still select and copy the text that stays on the screen (decision 245)."
  - The same section says that the ended screen stays with its output while the automatic try reads the terminal, and that it keeps its output after a failed read.
  - `TerminalScreen.tsx` makes a new `Terminal` of xterm.js in the effect that opens the transport. The effect runs again when the `terminal` object changes. Its cleanup calls `xterm.dispose()`.
  - When the read of the automatic try answers `ready`, `answered()` in `terminalReadiness.ts` makes a new `terminal` object. So the old screen and its output go before the new connection shows anything.
  - A working new connection shows the old output again, because tmux sends up to 2,000 lines of history to each new connection.
- **Problem:** When the read succeeds but the new socket fails before its first output, the screen is empty with Disconnected. Examples: the socket upgrade gets an HTTP error, or the network drops between the read and the upgrade. When `connect` throws, the old screen is also gone and no new one shows.
- **Impact if no action:** In that rare case, the user loses the output of the old screen, such as an error message, against decision 245.
- **Root question:** How does the ended screen keep its output until a new connection shows its own?
- **Options:**
  - **A.** Keep one xterm.js screen for each terminal ID. Only the transport changes on a try. At the first output of the new transport, call `reset()` on the screen, then write that output. Effort: Medium.
  - **B.** Render the new connection in a hidden second screen, and swap the screens at its first output. Two screens measure sizes and take focus, which adds risk. Effort: Large.
  - **C.** Change the requirement: a failed try after a successful read can show an empty screen. Effort: Small.
- **Left out:** A copy of the old text into a plain text block, because it loses the colours and the layout of the screen.
- **Wider fix:** A. It also lets a manual Reconnect keep the old screen.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps decision 245 in every case with one screen.
- **Action:** fix after merge, apply A, after the terminal tabs branch merges.
