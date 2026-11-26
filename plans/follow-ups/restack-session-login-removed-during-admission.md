# Login removed during restack admission ends the restack

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from `calummoore/merge-queue-new-session-m5b8`, review item 1.
- **Location:** `worker/chat/queue-fix.ts:63`, `worker/chat/sessions.ts:25`, `worker/merge-queue/fix-turns.ts:242`.
- **Reason:** The gap is one GitHub label read long, the code before the new-session change had the same gap, and a test needs a hook that pauses admission between the login check and the session write.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Queuer:** the member who added the pull request to the merge queue.
  - **Restack turn:** the one agent turn that the queue sends, as a message of the queuer in a new session, to rebase a queued branch after a conflict (`docs/protocol/merge-queue-stack.md`, "Restack turns").
  - **Agent login:** a personal or org credential that lets the agent use a model.
- **Background:** Before it sends a restack turn, the workspace checks that the queuer has a usable default agent login. Without one, the entry waits with the `agent-login` wait, and the queue tries again. After the check, the workspace reads the masked label of the base branch from GitHub. Then it creates the new session and saves the message in one chat transaction.
- **Problem:** When the queuer removes their only usable login during the label read, the new session gets `loginAvailable: false`, but the transaction still saves the session and the message. The turn then fails for the missing login.
- **Impact if no action:** The queue counts the failed turn as its one restack attempt. When the queuer connects a login again, the entry still waits for a member to resolve the rebase.
- **Root question:** How can the queue keep waiting when the queuer loses their login before the restack message is saved?
- **Options:**
  - **A.** In the admission transaction, after the session is created, throw a private marker when `loginAvailable` is false. Catch it outside the transaction, which rolls the session and the message back, and return the `agent-login` wait. Effort: Small.
  - **B.** Give every first-message caller one shared session-creation path that refuses to save a session whose login is unavailable. Each caller maps the refusal to its own wait or error. Effort: Medium.
- **Left out:** A second login check earlier in admission, because a gap stays after any check that runs outside the transaction.
- **Wider fix:** B. It also covers Explain, `create_session` with a first message, and the linked session of a sent message.
- **Previous examples:** `plans/follow-ups/login-replacement-sharing-choice.md` records the period with no usable login between Remove and Connect.
- **Recommendation:** A. It closes the gap for the queue, where a lost attempt costs the most, with one contained change and a test that pauses admission.
- **Action:** fix after merge, apply A, because the race needs a login removal inside one GitHub read and the code had the same gap before.
