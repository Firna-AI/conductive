# Gaps of the start that waits for a pending stop

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Deferred review finding.
- **Added:** 2026-11-24, from the review of branch `calummoore/archive-restore-failure-pjmu`.
- **Location:** `worker/lifecycle/start-after-stop.ts`, `worker/lifecycle/start-admission.ts`, and `worker/lifecycle/start-after-stop.test.ts`.
- **Reason:** the branch fixes the lost resume after Archive and a quick Restore. These smaller gaps stay.

- **Source:** Review. **Category:** Correctness and test coverage.
- **Background:** When a stop of the cloud computer still runs, admission refuses each start. The branch holds a refused resume or Try again, and queues it when the stop ends. `queueStartAfterStop` checks the stop epoch of the request. Then `enqueueWorkspaceStart` reads the epoch again and begins the start with that new value. Since 25 November 2026, the app shows Starting and the wait from each Resume or Try again until its reply or a newer state of the sandbox, as "The resume" in `docs/protocol/stop-and-resume.md` says. Cal chose this for the skill tabs change. It does not cover the stopped state after the reply of a held resume, which the problem below gives.
- **Problem:**
  1. The held epoch is not the value that guards `begin`. The state checks of admission make this safe today, but a later change can break it.
  2. No test covers a held Try again, a newer request that replaces an older one, a short failure during admission, or a stop that ends in `error`.
  3. The reply of the held resume still shows the stopped state with Resume for a few seconds, until the start event comes.
- **Impact if no action:** A later change to admission can let a held start pass a newer Archive. The untested paths can break with no failed test. Members see the stopped bar for a short time after Restore.
- **Root question:** How does the held start use one epoch and get full test coverage?
- **Options:**
  - **A.** Pass the held epoch into `enqueueWorkspaceStart`, and add the four tests. Effort: Small.
  - **B.** Option A, and also make the resume reply show Starting when it holds the start. Effort: Medium, because the reply reads the stopped lifecycle state.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/newer-start-failure-shows-starting.md`. Both items change what shows around the reply of a Resume. There, a start that fails while the reply waits still shows Starting until the reply. Its option B lets the workspace model own the wait of each Resume, so that owner can also keep the wait across the reply of a held resume. No options conflict.
- **Recommendation:** A, because B changes the reply that older Mac apps read.
- **Action:** fix after merge, apply A.
