# Check terminal copy in the Mac app

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the plan `plans/terminal-copy.md`, branch `calummoore/disconnected-terminal-text-selection`.
- **Location:** `src/terminal/plainPresses.ts`, `desktop/README.md`
- **Reason:** the Mac app bundles the web app, so it gets the change only at its next release.

- **Terms:**
  - **Mac app:** the Electron app under `desktop/`. It bundles the web app, as `desktop/README.md` says.
  - **tmux mouse support:** the tmux setting `mouse on`, which the workspace shell server turns on so that the wheel scrolls the output history.
- **Background:**
  - The Terminal tool selects text with a plain drag, also while a program, such as tmux, has the mouse. The wheel, the right and middle buttons, and a press with Cmd still reach the program.
  - When the connection ends, the screen turns off the mouse reports of the program, so a drag selects the text that stays on the screen.
  - The Mac app has an Edit menu, in `desktop/src/menu.ts`, so Cmd+C should send a copy event to the terminal. No check ran in the Mac app before the merge.
- **Task:** In the first Mac app release that holds the change, open a workspace whose shell runs tmux with mouse support on. Then:
  1. Scroll the history with the wheel or the trackpad.
  2. Select text with a plain drag, copy it with Cmd+C, and paste it somewhere to check it.
  3. Hold Cmd and click: tmux gets the click.
  4. End the connection, then drag and copy.
- **Impact if no action:** A difference of the Mac app could break select or copy for its users without notice.
- **Needs:** a Mac app release that holds the change, and a workspace from an org image with tmux mouse support.
- **Done when:** each step works, or a new follow-up item records each failure with its steps.

The plan of the change, before its deletion: https://github.com/Firna-AI/remote-code/blob/df8a3160206f427a810aeae476f121ca3264f9f8/plans/terminal-copy.md
