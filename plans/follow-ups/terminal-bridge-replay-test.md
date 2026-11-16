# Test the rebuilt terminal against a live viewer

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, option D of finding 1 in review round 1 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `worker/terminal/bridge/bridge.test-support.ts`, `worker/terminal/bridge/bridge.test.ts`.
- **Reason:** it adds a test for a class of defect, which the always-on rules leave to the user.

- **Terms:**
  - **Terminal bridge:** the program in the cloud computer that passes the raw output of a tmux pane to the browser terminal and rebuilds the screen at each connect.
  - **Replay:** feeding the bytes that a viewer got into `@xterm/headless`, the xterm.js build without a browser, as the browser does.
- **Background:**
  - Review round 1 found five defects of one class: the screen that a viewer shows differs from the pane after a resize or a rebuild. They were the order of a size and a redraw, the mouse mode, the saved cursor, wrapped lines, and the character sets. Each now has its own test.
  - The checks found that a comparison with `tmux capture-pane` misses some of them, because `capture-pane` shows line-drawing cells as letters. A viewer that stayed connected is the better reference.
- **Problem:** A new difference between a rebuilt screen and the pane has no general test.
- **Impact if no action:** Such a difference shows only in use, as these five did.
- **Root question:** How do the tests prove that every viewer shows what the pane shows?
- **Options:**
  - **A.** Change nothing. Each defect keeps its own test. Effort: Small.
  - **B.** Add a test helper that runs a scenario with two viewers, replays both with the size messages at their places, reconnects one of them, and compares the cells, the cursor, and the modes of the two. Run it for a set of scenarios: a resize, `less`, a box of line-drawing characters, a long line, and a mouse mode. Effort: Medium.
- **Left out:** A comparison with `capture-pane`, because it cannot see the character sets.
- **Wider fix:** B.
- **Previous examples:** Findings 1, 3, 4, 5, and 8 of review round 1 of the branch `calummoore/porto-6ebg`.
- **Recommendation:** B. It catches the class, and the helper reuses the real-tmux test support.
- **Action:** ask the user, because it adds a test for the class, which the always-on rules leave to the user.
