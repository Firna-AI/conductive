# A failed read mark never tries again

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #16, branch `conductor/boat-native-remote-workspaces-milestone-6`, round 2 finding 53.
- **Location:** `src/app/workspace-model.ts:196` and `src/app/events.ts:122`.
- **Reason:** only a short failure of the one read request causes it.

- **Terms:**
  - **Read mark:** the request that tells the Worker the last event number that the user saw in a workspace, so that the list stops showing it as unread.
- **Background:** When the user looks at the output of a workspace, the workspace model sends a read mark with the newest event number.
- **Problem:** A failed read request schedules no other attempt. A reconnect at the same event number sends no read mark. One HTTP 503 followed by a good reconnect reproduced it.
- **Impact if no action:** The workspace list keeps showing unread output that the user already read.
- **Root question:** How does the newest seen event number reach the Worker, also after a failed request?
- **Options:**
  - **A.** Schedule another read request after a failure, and cancel it when the workspace closes. Effort: Small.
  - **B.** Give read marks one owner that keeps the pending event number until the Worker confirms it, with its retries and its cancel. Move it out of `workspace-model.ts`, which has 212 lines. Apply the confirmed read through `apply`, so that the list row updates too. Effort: Small.
  - **C.** Send the seen event numbers as socket acknowledgements, and let the server save them. This changes the browser and backend contracts. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** `plans/follow-ups/chat-stop-after-failed-history.md`, a failed history read with the same shape.
- **Related:** Finding 74 of the same review changes `WorkspaceModel.open()` and `close()` too. Apply both in one pass, or rebase the second change on the first.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because only a short failure of one request causes it.
