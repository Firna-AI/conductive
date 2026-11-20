# The reset of a new connection skips the write queue

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the re-review of the terminal reconnect on terminal tabs, branch `calummoore/investigate-error-m9o4`.
- **Location:** `src/terminal/screenConnection.ts`, the first-output listener in `connectScreen`.
- **Reason:** the re-review found it after the last fix round of the branch, and the redraw of tmux almost always covers it.

- **Terms:**
  - **Kept screen:** the xterm.js screen of one terminal outlives each connection. `connectScreen` clears it at the first output of a new connection, so a failed try keeps the old output to copy (decision 245).
- **Background:**
  - `xterm.write` only queues data, and xterm.js parses the queue later.
  - `xterm.reset()` runs at once, without the queue.
  - The listener calls `xterm.reset()` at the first output of a new connection, before the session writes that output.
- **Problem:** When old output still waits in the queue, `reset()` clears the screen first, and the rest of the old output then draws on the empty screen, before the new output.
- **Impact if no action:** In rare cases, a tail of old output shows above the redraw of the new connection. The flow limit of the terminal bridge, about 1 MB without an acknowledgement, makes this unlikely.
- **Root question:** How does the clear of a new connection run after all old output and before all new output?
- **Options:**
  - **A.** Call `xterm.write('', () => xterm.reset())` in the listener. The session queues the new output after that write, so the reset runs between the two. Effort: Small.
  - **B.** Write RIS, `\x1bc`, through `xterm.write`. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** A wait for the old connection to finish parsing before the new socket opens, because it delays each reconnect.
- **Wider fix:** None, because this is one call.
- **Previous examples:** None found.
- **Recommendation:** A. It keeps the reset of xterm.js and fixes the order.
- **Action:** fix after merge, apply A.
