# Restart drops the warnings of its command

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the check of review finding 402 of the branch `calummoore/terminal-tabs-implementation-l5ml`.
- **Location:** `worker/lifecycle/software-restart.ts:114`, `RESTART_COMMAND` in the same file.
- **Reason:** The same gap exists on `origin/main` for the preview relay warning, so one fix after the merge covers both warnings.

- **Source:** Review.
- **Category:** Process.
- **Terms:**
  - **Restart:** the action in the workspace header that restarts the runner, the preview relay, and the terminal service of a running cloud computer.
- **Background:** The Restart command prints a warning to its error output when the preview relay or the terminal service does not restart, and the Restart still succeeds. The Worker reads only the exit code and the time limit of the command.
- **Problem:** The warnings reach no log, so nobody can see that a relay or a terminal service did not restart.
- **Impact if no action:** A failed restart of the relay or the terminal service is invisible to the operators.
- **Root question:** How does a failed step of a Restart that still succeeds reach the operators?
- **Options:**
  - **A.** Log a warning in the Worker when the command output holds a `conductive:` warning line, with no secret data. Effort: Small.
  - **B.** Make the command report each step result in a fixed format, and record each failed step as a warning of the Worker's warning types. Effort: Small.
- **Left out:** Failing the Restart for a failed relay or terminal step. The protocol says that the Restart then still succeeds.
- **Wider fix:** B. Each later step of the command gets the same report.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/repository-folder-record-refresh.md` adds an update of the folder record copy before a software Restart, under its options B and F. A failed update is one more step whose warning must reach the operators.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the gap is on main too and costs no user any function.
