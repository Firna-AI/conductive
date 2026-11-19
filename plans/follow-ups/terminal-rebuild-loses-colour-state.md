# Terminal rebuilds lose earlier colour changes

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, from the independent check of the hidden-terminal line-spacing review.
- **Location:** `worker/terminal/bridge/screen.ts:191`, `worker/terminal/bridge/commands.ts`, and `src/terminal/screenConnection.ts`.
- **Reason:** The rebuild already omits colour state on main and is outside the hidden-host lifecycle change.

- **Terms:**
  - **Terminal bridge:** The cloud-computer program that passes tmux pane output to the browser and rebuilds it at each connection.
  - **OSC:** A terminal control sequence that changes or queries the terminal's colours.
- **Background:** The bridge rebuild captures pane text, cell styles, and terminal modes. Its `rebuildPane` output contains no state for earlier OSC palette, foreground, background, or cursor-colour changes. A live screen can apply those changes from raw output. A new screen does not receive those earlier controls. The finding follows source reads only. No runtime reproduction ran.
- **Task:** Reproduce a colour change in a live pane, then reload the page and compare the rebuilt screen. Find which colour state tmux retains and which state the bridge can safely reproduce. Propose the required behaviour if the current requirements do not settle it. Implement the chosen replay and its regression after that decision.
- **Impact if no action:** A rebuilt screen can use different colours from the live screen until the program sends its colour controls again.
- **Needs:** Nothing for the reproduction. A behaviour decision may be needed after the evidence is complete.
- **Done when:** The reproduction establishes the affected colour controls, and the approved behaviour has a tested implementation or an explicit decision to keep the current behaviour.
- **Related:** `terminal-colours-before-first-show.md` covers colour controls that arrive live before the browser screen opens. Its fix cannot recover controls missing from the bridge rebuild. `terminal-bridge-cleared-background.md` covers erased cells trimmed from capture output, which is another cause of background-colour loss.
