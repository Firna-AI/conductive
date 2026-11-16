# Whether a stop keeps writes made during the shutdown is not confirmed

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from review finding 2 of branch `calummoore/riga-5hmk` (terminal history), option B.
- **Location:** `docs/protocol/workspaces-and-sandboxes.md` (Disk flushes), `worker/terminal/README.md` (prompt hook).
- **Reason:** The check needs a signed-in Boat CLI. The CLI in the workspace returned `401 unauthorized`.

- **Terms:**
  - **Shutdown write:** a file write that a program makes while the sandbox shuts down at a stop, such as Bash's history write at exit.
- **Background:** The disk flush rules say that a normal stop loses nothing. On 16 November 2026, a workspace had no Bash history file after a stop and resume, although its Terminal shell ran until the stop. Boat's file watcher logs a disk save about once a minute. The terminal fix now writes each command while the sandbox runs, so it does not depend on the answer.
- **Problem:** The two facts conflict for shutdown writes. Nobody has checked which writes a stop keeps.
- **Impact if no action:** A later feature that writes at shutdown can lose data. A command that ends less than a minute before an Archive can also be lost, if Boat keeps only its last save.
- **Root question:** Which writes before and during a stop does a Boat sandbox keep?
- **Options:**
  - **A.** In a Boat test sandbox, write one file 10 seconds before a stop and one file from a unit's stop step. Stop, resume, and read both. Fix the doc that is wrong, and save the evidence under `.context/`. Effort: Small.
- **Left out:** A test in the gate: the behaviour of the provider needs a one-time proof, not a test.
- **Wider fix:** None. The `documentation` skill already says how to fix doc drift.
- **Previous examples:** `4f9071df6 perf(image): stop disk flushes in sandboxes (#294)` wrote the rule that a normal stop loses nothing.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because it needs a signed-in Boat CLI.
