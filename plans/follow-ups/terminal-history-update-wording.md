# Old terminal history rule names the wrong update

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the branch `calummoore/terminal-tabs-implementation-l5ml`, check of review finding 201.
- **Location:** `docs/protocol/terminal.md`, the sentence "A workspace with older terminal software shows only its visible screen in the history until an automatic software update applies".
- **Reason:** The sentence moved unchanged from `docs/protocol/workspace-tools.md` on `origin/main`, so the terminal tabs change did not write it.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Terminal bridge:** the program between ttyd and tmux that passes every byte of the shell to the screen. An older terminal service runs a plain tmux client instead, which sends only the visible screen.
  - **Install at idle:** the runner installs a downloaded release while the workspace has been idle for 2 minutes, without a stop.
- **Background:** The terminal service captures its attach program when it starts. An install at idle restarts neither the terminal service nor the preview relay, as "Installs at idle" in `docs/protocol/sandbox-software.md` says. Each new connection runs the bridge of the active release only when the running launcher looks the bridge up at connection time.
- **Problem:** The sentence says that the full history comes when an automatic software update applies. For a terminal service that started before the bridge existed, it comes only at a later start.
- **Impact if no action:** A reader expects the full history right after an update and still sees only the visible screen.
- **Root question:** When does a workspace with older terminal software get the full history?
- **Options:**
  - **A.** Say "at a later start of the cloud computer, after an automatic software update", and link to "Installs at idle", as the Older software rule of terminal tabs does. Effort: Small.
- **Left out:** A product change that restarts the terminal service at an install. `plans/follow-ups/terminal-tabs-wait-for-start.md` holds that question.
- **Wider fix:** None. The `documentation` skill already says that each fact lives in one place.
- **Previous examples:** Review finding 201 of the terminal tabs change fixed the same wording for terminal tabs.
- **Recommendation:** A. It states the timing that the update rule already gives.
- **Action:** fix after merge, apply A, because the sentence came from `origin/main` and is outside the diff.
