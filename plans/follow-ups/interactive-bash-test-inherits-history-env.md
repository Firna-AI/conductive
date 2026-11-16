# The interactive Bash test helper passes on the developer's history variables

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from the round 1 review of branch `calummoore/riga-5hmk` (terminal history), outside the scope.
- **Location:** `worker/terminal/scripts.test-support.ts`, `runInteractiveBash`.
- **Reason:** It is not a reproduced flake.

- **Background:** `runInteractiveBash` starts Bash with all of `process.env`. The history tests of `worker/terminal/scripts.test.ts` check the exact text of the history file.
- **Problem:** An exported `HISTTIMEFORMAT`, `HISTIGNORE`, or `HISTCONTROL` in the developer's environment can change that text.
- **Impact if no action:** The history tests can fail on one developer's machine and pass in CI.
- **Root question:** How do the Bash tests get the same history settings on every machine?
- **Options:**
  - **A.** Remove each `HIST*` variable from the environment in `runInteractiveBash`. Effort: Small.
- **Left out:** A full empty environment: Bash then needs `PATH` and other variables that the tests use.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because no run has failed.
