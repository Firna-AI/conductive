# Check terminal copy in Chrome and Safari

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the plan `plans/terminal-copy.md`, branch `calummoore/disconnected-terminal-text-selection`.
- **Location:** `src/terminal/plainPresses.ts`, `src/terminal/xtermScreen.ts`, `src/terminal/terminalSession.ts`
- **Reason:** the check needs the deployed change, a new workspace with the terminal bridge, and a Mac with Safari.

- **Terms:**
  - **Terminal bridge:** the program in the cloud computer that attaches to the tmux session of the shell in tmux control mode and passes the raw output to the browser. A workspace from an image built after 13 November 2026 has it.
  - **Forced selection:** the xterm.js path that selects text while a program has the mouse. It takes an Option press on a Mac and a Shift press elsewhere.
- **Background:**
  - The Terminal tool selects text with a plain drag, also while a program in the shell, such as vim with `:set mouse=a`, has the mouse. The screen sends each plain left press to xterm.js again as a forced selection.
  - With the terminal bridge, the browser keeps the output history, so a drag past the top edge scrolls and selects it, and the wheel scrolls it.
  - While a program has the mouse, the wheel, the right and middle buttons, and a press with Cmd or Ctrl reach the program.
  - When the connection ends, the screen turns off the mouse reports of the program, so a drag selects the text that stays on the screen.
  - Before the merge, Chrome checks ran on the terminal development page, with its fake terminal, on a Mac platform and on Linux. They passed. No check ran with a real cloud computer or in Safari.
- **Task:** In a new workspace from an org image with the terminal bridge, on a Mac, in Chrome and in Safari:
  1. Run `seq 1 3000`. Scroll the history with the wheel or the trackpad.
  2. Select text with a plain drag past the top edge, and copy it with Cmd+C. Paste it somewhere to check that it holds more than one screen.
  3. Select a word with a double click.
  4. Reload the page. Check that the history shows the last 2,000 lines.
  5. Open two windows of different sizes. Type in each, and check that the other shows the shared size.
  6. Start vim with `:set mouse=a`. Drag to select. Hold Cmd and click: vim gets the click. Reload, then paste several lines into vim in insert mode: vim inserts them as text.
  7. End the connection, for example with the network off, then drag and copy.
- **Impact if no action:** A difference of a real cloud computer or of Safari could break select or copy for users without notice.
- **Needs:** the deployed change, a new workspace from an org image built after the deploy, and a Mac with Chrome and Safari.
- **Done when:** each step works in both browsers, or a new follow-up item records each failure with its browser and its steps.

The plan of the change, before its deletion: https://github.com/Firna-AI/remote-code/blob/df8a3160206f427a810aeae476f121ca3264f9f8/plans/terminal-copy.md
