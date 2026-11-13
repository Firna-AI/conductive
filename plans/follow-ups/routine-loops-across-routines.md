# Two routines can start each other's runs

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from branch `calummoore/riga-b7hb`, the options check of decision 520 in its plan.
- **Location:** `worker/routines/pull-request-data.ts:45-61` and `docs/protocol/pull-request-runs.md` (the section Loops).
- **Reason:** The plan of the checks-failed trigger changes only its own trigger, and this loop exists today through PR opened and PR pushed.

- **Terms:**
  - **Routine:** a saved prompt that starts an agent run in a new workspace on a schedule, on a GitHub pull request event, or with Run now.
  - **Loop guard:** the SQL condition `pullRequestLoopGuard` that stops a pull request event from starting a run.
- **Background:**
  - The loop guard stops a run when the head branch of the pull request is the branch of a run workspace of the same routine.
  - It also ignores the events of the routine's owner while a run of the same routine for that pull request is queued, starting, working, or waiting for input.
  - Both conditions check `run.routine_id = r.id`, so they look only at the runs of one routine.
- **Problem:** Two routines of the same owner, each with a PR pushed trigger on one repository, can each push to the same pull request. A push of the run of routine 1 starts a run of routine 2, and the reverse. Neither guard sees the run of the other routine.
- **Impact if no action:** Two routines whose prompts push to the pull request start runs without end. They spend the daily starts that all orgs share.
- **Root question:** How does the app stop runs of one routine from starting runs of another routine without end?
- **Options:**
  - **A.** Check the runs of every routine of the org in both guards, not only the runs of the same routine. A push of any run then starts no run. It also stops a wanted chain, such as a review routine that runs after a fix routine. Effort: Medium.
  - **B.** A hop count for each pull request run. A run that another run caused gets the hop count of that run plus one. An event past a set hop count gives a skipped row. It allows short chains and stops long ones. Effort: Large.
  - **C.** Change nothing, and state the risk in `docs/protocol/routines.md` under Risks that stay open. Effort: Small.
- **Left out:** A cap on runs per day, because caps were rejected for routines in `docs/protocol/routines.md`.
- **Wider fix:** B. It bounds a loop through any trigger and any number of routines.
- **Previous examples:** Option e of decision 520 in the plan of the checks-failed trigger.
- **Recommendation:** B. It stops the loop and keeps short wanted chains.
- **Action:** ask the user, because each option changes the Loops rules of `docs/protocol/pull-request-runs.md`.
