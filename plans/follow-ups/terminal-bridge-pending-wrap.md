# A rebuild loses a cursor that waits to wrap

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the check of finding 4 in review round 1 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `worker/terminal/bridge/screen.ts` (`modes`).
- **Reason:** it needs output that ends exactly at the last column while a connection starts, and the fix needs the cell text of that row.

- **Terms:**
  - **Terminal bridge:** the program in the cloud computer that rebuilds the screen of a tmux pane in the browser terminal at each connect.
  - **Pending wrap:** after a character fills the last column, a terminal keeps the cursor there and wraps only at the next character.
- **Background:** tmux reports such a cursor with `cursor_x` equal to the pane width. The rebuild puts the cursor on the last cell, so the next character overwrites that cell. A check showed `CCC…CX` and `YZ` on the rebuilt screen, where tmux and a live screen showed `CCC…C` and `XYZ`.
- **Problem:** After a reconnect while the cursor waits to wrap, the next character of the output overwrites the last character of the row.
- **Impact if no action:** One character of a progress line or a prompt can look wrong after a reconnect.
- **Root question:** How does a rebuilt screen get a cursor that waits to wrap?
- **Options:**
  - **A.** When `cursor_x` equals the width, move to the last cell and print the character that tmux has there again, from a capture of that row with `-e`. Effort: Small.
  - **B.** Change nothing. Effort: Small.
- **Left out:** A move to the next row, because a program that then writes a line break would leave an empty row.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. It gives the terminal the same state as tmux.
- **Action:** fix after merge, apply A, because the case is rare and its fix needs a new capture.
