# A lookup of an agent message reads the whole session history when it misses

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Deferred finding.
- **Added:** 2026-11-23, from the review of branch `calummoore/investigate-message-failure-g7qu`.
- **Location:** `worker/chat/agent-message.ts`, used by `get_message` in `worker/tools/session-read-workspace.ts` and by Explain in `worker/chat/explain-session.ts`.
- **Reason:** the branch fixes the failed `get_message` call after Explain. A faster lookup needs a new stored index, which is a separate change.

- **Source:** Review. **Category:** Performance.
- **Background:** A finished agent message lives only as an `assistant.completed` event in the history of its session. The lookup reads the history pages from the newest to the oldest until it finds the ID.
- **Problem:** An ID that does not match, such as a typo or an ID of another session, makes the lookup read every page of the session. The read runs in the serial chat queue of the workspace.
- **Impact if no action:** On a long session, a missed `get_message` call can delay other work of that workspace, such as runner events, for the time of the read. Each new runner asks for agent messages, so any agent can start this read.
- **Root question:** How does the Worker find a finished agent message by its ID without a read of the whole history?
- **Options:**
  - **A.** Store a record from each agent message ID to its event number when the `assistant.completed` event arrives. Read older sessions with the scan until a backfill. Effort: Medium.
  - **B.** Stop the scan after a fixed number of pages. Effort: Small. Risk: an old answer in a long session then gives HTTP 404.
- **Left out:** A cache in memory, because the workspace object can restart at any time.
- **Wider fix:** None.
- **Previous examples:** Explain had the same scan before this branch.
- **Recommendation:** A, because it keeps every answer reachable and makes each lookup one read.
- **Action:** fix after merge, apply A.
