# A reconnect loses background colour of cleared cells

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the check of finding 17 in review round 2 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `worker/terminal/bridge/commands.ts` (`syncCommands`), `worker/terminal/bridge/screen.ts` (`flow`).
- **Reason:** the capture flag that keeps these cells splits wrapped lines, so the fix needs a new way to read the pane.

- **Terms:**
  - **Terminal bridge:** the program in the cloud computer that rebuilds the screen of a tmux pane in the browser terminal at each connect, from `tmux capture-pane -p -e -J`.
  - **Cleared cell:** a cell that a program erased while a background colour was on, such as a bar drawn with `ESC [K`, or a row that a scroll filled.
- **Background:** `capture-pane -J` trims the empty cells at the end of each line, also when they have a background colour. In a check, a live viewer showed a blue bar to the right edge, and a reconnected viewer showed blue only under the text `bar`. `capture-pane -N` keeps the cells, but it splits wrapped lines, and `-J -N` acts as `-J`.
- **Problem:** After a reconnect, a bar or a background that a program filled with an erase shows the default background after its text.
- **Impact if no action:** Status bars and coloured rows of programs that fill with an erase look shorter after a reconnect, until the program redraws.
- **Root question:** How does a rebuilt screen get the background of cells that a program cleared with a colour?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Capture the screen a second time with `-N`, and for each row whose `-N` line has trailing background cells, write an erase to the end of the row with that background after the flow line. Effort: Medium.
- **Left out:** A capture with `-N` alone, because it splits wrapped lines, which finding 5 of review round 1 fixed.
- **Wider fix:** The replay test of `plans/follow-ups/terminal-bridge-replay-test.md` would catch this class.
- **Previous examples:** Finding 17 of review round 2 of the branch `calummoore/porto-6ebg`, the style across line breaks.
- **Recommendation:** B. It keeps wrapped lines whole and restores the bars.
- **Action:** fix after merge, apply B, because the case is rare and the fix needs a second capture and a row map.
