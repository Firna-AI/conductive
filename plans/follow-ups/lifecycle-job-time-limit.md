# A build or a start that makes no progress never ends

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, the wider fix of finding 2 of PR #47, branch `conductor/boat-native-remote-workspaces-milestone-5c`, round 1, option C of its check, with two problems outside the scope of that review.
- **Location:** `worker/lifecycle/build-execution.ts:57`, `worker/lifecycle/start-command-execution.ts:56`, `worker/lifecycle/start-allocation.ts:89`, and `startCommand` in `worker/sandbox/boat.ts:216`, which starts each script with no time limit.

- **Terms:**
  - **Image build:** the job that prepares the org's cloud computer image. A new workspace starts from it, so the org's first build must finish before anyone can create a workspace.
  - **Alarm:** a scheduled call that moves a saved job one step forward.
- **Background:** Builds and starts run as saved jobs, and alarms move them forward. Each alarm also extends the provider's 30-minute auto-stop. Milestone 5c ends a job after a lasting provider error. Nothing else ends a job, and no route cancels a build.
- **Problem:** A job that makes no progress runs forever. Examples: an install or startup script that never exits, such as one that runs a server in the foreground, a cloud computer that never becomes ready, and endless retries of the sandbox allocation.
- **Impact if no action:** The org's first image build can hang, so nobody in the org can create a workspace. Its cloud computer keeps running at the app's cost.
- **Root question:** How does every build and every start end when it makes no progress?
- **Options:**
  - **A.** Change nothing beyond the retry limit of Milestone 5c. Effort: Small.
  - **B.** Add a Cancel action for a running build and start. It needs a route, a mockup, and a protocol change, and a job that nobody watches still never ends. Effort: Medium.
  - **C.** Give each whole job a time limit from its start, for example 60 minutes for a build and 20 minutes for a start, and then use the existing failure handling. A long but valid install can fail, and the limit can become an org setting later. Effort: Medium.
  - **D.** Give each script a time limit, for example 30 minutes, and fail the job when a script passes it. A cloud computer that never becomes ready and the allocation retries stay unlimited. Effort: Medium.
- **Left out:** The provider's auto-stop as the limit, because each alarm extends it.
- **Wider fix:** C. It ends every job that makes no progress, whatever the cause.
- **Previous examples:** finding 2 of PR #47, and `plans/follow-ups/runner-file-and-save-errors.md`, where repeated recovery leaves work stuck.
- **Recommendation:** C. One limit for each job ends every hang, and the protocol states it.
- **Action:** fix after merge, apply C, as the user chose on 8 November 2026 (decision 128). The app also tells the user of each limit, as the user asked. Milestone 5d applies it.
