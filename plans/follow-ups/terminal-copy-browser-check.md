# Check terminal copy in Chrome and Safari

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the plan `plans/terminal-copy.md`, branch `calummoore/disconnected-terminal-text-selection`.
- **Location:** `src/terminal/plainPresses.ts`, `src/terminal/xtermScreen.ts`, `src/terminal/terminalSession.ts`
- **Reason:** the check needs the deployed change, a real workspace with tmux mouse support, and a Mac with Safari.

- **Terms:**
  - **tmux mouse support:** the tmux setting `mouse on`, which the workspace shell server turns on so that the wheel scrolls the output history.
  - **Forced selection:** the xterm.js path that selects text while a program has the mouse. It takes an Option press on a Mac and a Shift press elsewhere.
- **Background:**
  - The Terminal tool selects text with a plain drag, also while a program, such as tmux, has the mouse. The screen sends each plain left press to xterm.js again as a forced selection.
  - The wheel, the right and middle buttons, and a press with Cmd or Ctrl still reach the program.
  - When the connection ends, the screen turns off the mouse reports of the program, so a drag selects the text that stays on the screen.
  - Before the merge, Chrome checks ran on the terminal development page, with its fake terminal, on a Mac platform and on Linux. They passed. No check ran with a real tmux or in Safari.
- **Task:** In a deployed workspace whose shell runs tmux with mouse support on, on a Mac, in Chrome and in Safari:
  1. Scroll the history with the wheel or the trackpad.
  2. Select text with a plain drag, and copy it with Cmd+C. Paste it somewhere to check it.
  3. Select a word with a double click.
  4. Hold Cmd and click: tmux gets the click.
  5. End the connection, for example with the network off, then drag and copy.
- **Impact if no action:** A difference of a real tmux or of Safari could break select or copy for users without notice.
- **Needs:** the deployed change, a workspace from an org image with tmux mouse support, and a Mac with Chrome and Safari.
- **Done when:** each step works in both browsers, or a new follow-up item records each failure with its browser and its steps.

The plan of the change, before its deletion: https://github.com/Firna-AI/remote-code/blob/df8a3160206f427a810aeae476f121ca3264f9f8/plans/terminal-copy.md
