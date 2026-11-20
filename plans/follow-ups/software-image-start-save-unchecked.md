# The software image start ignores a lost save

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the re-review of branch `calummoore/porto-8lhc`.
- **Location:** `worker/software-image/steps.ts`, the `saveSoftwareImage` call after `startCommand` in the `software` phase.
- **Reason:** The code was there before the branch, and the branch changes only the saved fields.

- **Terms:**
  - **Software image:** a shared saved image, built from the base image, that a first org build starts from. `worker/software-image/` builds it.
  - **Command journal:** `worker/lifecycle/command-journal.sh`. It runs only the first start of each owner and phase in a sandbox. A later start reads the output of the first one.
- **Background:**
  - `saveSoftwareImage` fences each write by phase and revision, and returns `false` when another writer changed the row.
  - After `startCommand`, the software phase saves the process ID with that call, but it does not read the result.
- **Problem:** When the save loses the race, the step returns as if it saved the process ID. The next advance starts the command again.
- **Impact if no action:** The command journal keeps the repeated start attached to the first run, so no work repeats. The step only spends one more provider call.
- **Root question:** Should the software image start react to a save that lost the race?
- **Options:**
  - **A.** Throw `AttemptChanged` when the save returns `false`, as the poll path below it does. Effort: Small.
  - **B.** Change nothing, because the command journal already makes the repeated start safe. Effort: Small.
- **Left out:** None.
- **Wider fix:** None, because the fenced save already reports the race.
- **Previous examples:** None found.
- **Recommendation:** A. It treats the start like the poll path of the same step.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch.
