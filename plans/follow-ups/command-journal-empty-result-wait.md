# A start can wait for its deadline after an empty command result

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Low. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the handoff of pull request #222, branch `conductor/software-image-m7-update-old-workspaces`, Milestone 7 of the software image plan.
- **Location:** the shared command journal of the workspace start commands under `worker/lifecycle/`.
- **Reason:** the behaviour already holds on `main`, and Milestone 7 left the shared journal unchanged.

- **Terms:**
  - **Command journal:** the record in the sandbox of each detached command of a start, which the Worker reads to learn its result after a lost reply.
- **Background:**
  - Each workspace start runs detached commands, such as the startup script and, since Milestone 7, the update of an old workspace.
  - The Worker reads each command's result through the shared command journal.
  - The Milestone 7 workspace saw that, after a command writes an empty result, the journal reader can keep waiting until the 20-minute deadline of the start.
- **Problem:** A start can hang until its deadline after an empty result, instead of finishing or failing at once.
- **Impact if no action:** A rare start can take 20 minutes and then fail.
- **Root question:** How does a start learn the result of a command that wrote an empty result?
- **Options:**
  - **A.** Treat an empty result file as a finished command with its exit code, and read the code from the journal entry. Effort: Medium.
  - **B.** Write a fixed end marker after each result, and wait only for the marker. Effort: Medium.
- **Left out:** Change nothing, because a start can hang for 20 minutes. Only the reader and the writer can change, so there is no third approach.
- **Wider fix:** B. A marker covers every command of the journal.
- **Previous examples:** None found.
- **Recommendation:** B. It removes the ambiguity of an empty result for every command.
- **Action:** fix after merge, apply B, because the problem is outside the software image plan and needs a reproduction first.
