# A first message can read as not waiting

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/loading-when-pending-p2f2`, review round 2, item 6.
- **Location:** `worker/lifecycle/waiting-summary.ts`, `worker/workspace-lifecycle.ts` (`readChatWorkspaceSummary` and `acceptLifecycleFirstMessage`).
- **Reason:** The race is rare, its harm is one list read of a still mark, and two other follow-up items change the same answer.

- **Terms:**
  - **Waiting answer:** the optional field `messageWaiting` of a workspace record. The list mark runs its light during a start only when it is true.
  - **Queue turn:** one run of work on `ChatQueue`, the serial queue of the workspace Durable Object in `worker/chat/queue-turn.ts`.
  - **`pendingFirstMessage`:** the first message of a new workspace in the lifecycle state, until the chat accepts it.
- **Background:** `waitingSummary` reads the chat queue in one queue turn. When no message waits there, it reads `pendingFirstMessage` in a later queue turn. `acceptLifecycleFirstMessage` moves the first message from `pendingFirstMessage` into the chat queue in one queue turn.
- **Problem:** A list read can read the chat queue just before the accept, and `pendingFirstMessage` just after it. Both reads then miss the first message, and the read gives `messageWaiting: false`.
- **Impact if no action:** Another member, or another tab, can see a new workspace with a still mark for one list read, about 5 seconds.
- **Root question:** How does one waiting answer count a first message that moves from the lifecycle state to the chat queue while the answer forms?
- **Options:**
  - **A.** Read `pendingFirstMessage` before the chat queue. The message moves in one direction only, so a move between the two reads leaves it in the second read. Each starting row then costs one lifecycle read. Effort: Small.
  - **B.** Form the answer in one queue turn with one helper that reads `pendingFirstMessage` and the chat queue. `readChatWorkspaceResponse` can use the same helper, as `plans/follow-ups/starting-read-double-call.md` needs. Effort: Medium.
- **Left out:**
  - Read again when the answer is false: it adds a third queue turn and still leaves a window, so A is better on every point.
  - Change nothing: a first start can then look idle.
- **Wider fix:** B. One helper forms the answer in one queue turn, so no write can come between its reads.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/new-workspace-waiting-gap.md` and `plans/follow-ups/starting-read-double-call.md` change the same answer. One branch can carry all three.
- **Recommendation:** B. It removes each window between the reads, and the double-call fix can reuse the helper.
- **Action:** fix after merge, apply B.
