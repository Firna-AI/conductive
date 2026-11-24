# A software image host request outlives its poll

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-8-builds-over-ef32` (pull request #686), review round 1, finding 104.
- **Location:** `worker/software-image/poll.ts:41` (`runNetworkCall`), `worker/software-image/channel.ts`, `worker/machines/host-channel.ts:24`, `worker/machines/pending.ts:84-94`, and `worker/lifecycle/command-intents.ts:47-55` (`clearImageCommands`).
- **Reason:** The deploy reply and the build already stay correct, and the fix carries a deadline through the machine channel and the machine object, outside the branch that found it.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Deploy poll:** one request of the deploy run to `POST /v1/deploy/software-image`. It answers within 20 seconds, and its work stops 45 seconds after the request starts.
  - **Journal clear:** the command `rm -rf -- /tmp/conductive-lifecycle`, which the build runs before the snapshot, with a limit of 600 seconds.
- **Background:**
  - `worker/software-image/README.md` gives the reply budget. Cloudflare keeps work for at most 30 seconds after the answer.
  - The poll aborts each provider request at its 45-second stop through the signal of its fetch wrapper.
  - A host call goes to the machine object as an RPC. The poll's `runNetworkCall` ends only the wait for it at the stop, with a retryable error. The request in the machine object keeps its own limit: 610 seconds for a command run, 30 seconds for the others.
  - The branch that found this changed the text of the README, the test name, and the design call, so that they say the stop ends only the poll's wait.
- **Problem:** A pending journal clear over the host can hold its request in the machine object for up to 610 seconds after its poll stopped. A later poll can then start a second journal clear while the first request still waits.
- **Impact if no action:** The machine object holds an idle request and a pending slot past the poll. A second `rm -rf` can run. The build result stays correct.
- **Root question:** What may keep running after a deploy poll's 45-second stop: the poll's wait, the machine object's request, or the command on the build sandbox?
- **Options:**
  - **A.** Change no code. The texts already say that the stop ends only the poll's wait. Effort: Small.
  - **B.** Send the poll's absolute deadline with each software image host request (run, start, status) to the pending request of the machine object. `PendingRequests.create` already takes a deadline and refuses a request whose deadline has passed. The request then ends with the retryable `machine_timeout`. The command on the sandbox keeps its own limit, as a provider command does. The token registration and the revoke get no deadline. Effort: Medium.
  - **C.** Run the journal clear as a started command with saved status reads, as the software step does. Each poll then sends only requests that end within 30 seconds. Cost: a new saved step with a lost-process path. Effort: Medium.
- **Left out:** A fixed short timeout for each journal clear: a slow clear then fails the attempt, and it is a stricter limit that the user must approve. Cancellation in the host protocol: a cancel at the stop is a new host call after the answer.
- **Wider fix:** B. Each software image host request carries the deadline of its poll to the code that dispatches it.
- **Previous examples:** Commit `bb0be18a6` passed the poll's abort signal to the actual provider request.
- **Recommendation:** B. It bounds the request at the machine object and keeps the stop retryable.
- **Action:** fix after merge, apply B, because the deploy reply already stays within its budget and the case needs a slow host operation.
