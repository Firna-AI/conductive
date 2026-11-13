# A late run push starts another run

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from branch `calummoore/riga-b7hb`, the options check of decision 520 in its plan.
- **Location:** `worker/routines/pull-request-data.ts:56-59`, `worker/routines/pull-request-access.test.ts:136`, and `docs/protocol/pull-request-runs.md` (the section Loops).
- **Reason:** The behaviour matches the protocol today, so a fix changes a requirement, and the checks-failed plan does not cover PR pushed.

- **Terms:**
  - **Owner guard:** the part of `pullRequestLoopGuard` that ignores the events of the routine's owner while a run of that routine for the pull request works.
- **Background:**
  - A run pushes with the owner's GitHub access, so its push to the pull request that started it has the owner as its sender.
  - The owner guard holds only while the run is queued, or while its workspace is starting, working, or waiting for input.
  - The test at `pull-request-access.test.ts:136` shows that an owner event starts a run again when the run workspace is `ready`.
- **Problem:** GitHub can deliver the push webhook after the turn of the run ended. Then the owner guard no longer holds, and the push starts another PR pushed run.
- **Impact if no action:** A routine whose prompt pushes to its own pull request can start a second run now and then. That run can push again, so the chain can repeat.
- **Root question:** How does the app know that a push came from a run, also when its webhook arrives after the turn ended?
- **Options:**
  - **A.** Keep the owner guard for a short grace time, such as two minutes, after the run's turn ends. Effort: Small.
  - **B.** Record the head commit of each push that the run makes, from the agent runner, and ignore an event whose head commit is a run commit. Effort: Medium.
  - **C.** Change nothing, and state the race in the section Loops. Effort: Small.
- **Left out:** A guard on every event of the owner, because it stops runs for the owner's own pushes.
- **Wider fix:** B. It ties the push to the run, so the time of the webhook does not matter.
- **Previous examples:** Option d of decision 520 in the plan of the checks-failed trigger uses the same grace time.
- **Recommendation:** A. It closes the common race at a small cost, and B can follow if the race still shows.
- **Action:** ask the user, because it changes the Loops rule of `docs/protocol/pull-request-runs.md`.
