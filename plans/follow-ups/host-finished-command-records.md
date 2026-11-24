# Finished command output stays until a stop

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-6-commands-over-7v7g` (pull request #679), review finding 2.
- **Location:** `crates/cnd-host/src/commands/records.rs`
- **Reason:** The cleanup belongs in the host program, and no current path runs enough commands to fill memory before a stop.

- **Terms:**
  - **Host program:** the mode `conductive host` that runs the commands of the Worker on a computer.
- **Background:** The host program keeps the record and the output of each started command, so that the Worker can read its status by byte offsets. It frees a record only when the computer stops. The E2B command supervisor (`worker/sandbox/e2b/command-supervisor.py:80`) has the same gap.
- **Problem:** A computer that runs for a long time keeps the output of every finished command in memory.
- **Impact if no action:** Memory of the host program grows with each command until the next stop.
- **Root question:** When can the host program free the record of a finished command?
- **Options:**
  - **A.** Free each finished record some hours after the Worker last read it, with a test. Effort: Small.
  - **B.** Let the Worker send a release after it reads the end of a command. Effort: Medium.
- **Left out:** A fixed count of records: a burst of commands could free a record that a job still reads.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A. It needs no protocol change.
- **Action:** fix after merge, apply A.
