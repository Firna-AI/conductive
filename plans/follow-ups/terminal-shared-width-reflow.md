# A narrower shared size wraps the screen differently

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, from the check of finding 1 in review round 1 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `worker/terminal/bridge/size.ts` (`SharedSize.changed`), `src/terminal/terminalSession.ts` (`sharedSize`).
- **Reason:** each fix trades a correct screen against the selection and the scroll position of the other viewers, so the user chooses.

- **Terms:**
  - **Terminal bridge:** the program in the cloud computer that passes the raw output of the tmux pane to the browser terminal, xterm.js.
  - **Shared size:** all viewers of one shell share one size. The viewer where the user last typed, pasted, or resized sets it.
- **Background:**
  - When the shared size changes, the bridge sends the new size, and the browser resizes xterm.js. The bridge does not rebuild the screen.
  - tmux and xterm.js both rewrap the normal screen when the width changes, but they do it differently.
  - A check made the width go from 80 to 40 columns: 10 of 20 rows differed, and the cursor was on row 9 in xterm.js and on row 7 in tmux, in 5 of 5 runs. A change of the height alone matched. After the next full screen of output, the screens matched again.
- **Problem:** After another viewer makes the shared width narrower, a viewer can show some rows and the cursor in the wrong place until the screen scrolls or clears.
- **Impact if no action:** The prompt and recent lines can look broken in one viewer for a short time after another viewer with a narrower panel types.
- **Root question:** What does a viewer show right after the shared width gets narrower?
- **Options:**
  - **A.** Change nothing. The screen corrects itself at the next clear or full scroll. Effort: Small.
  - **B.** The bridge rebuilds the screen after each width decrease. Each viewer then matches tmux, but loses its selection and its scroll position in the history at that moment. Effort: Small.
- **Left out:** A rebuild at every size change, because a height change already matches and B covers the width.
- **Wider fix:** None. The cause is the different rewrap rules of two terminals.
- **Previous examples:** None found.
- **Recommendation:** B. A correct screen matters more than a selection at the moment another viewer resizes.
- **Action:** ask the user, because B resets the selection and the scroll position of the other viewers, which changes what they see.
