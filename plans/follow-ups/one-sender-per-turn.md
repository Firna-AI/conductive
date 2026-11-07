# One turn can mix the messages of several members

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #12, branch `conductor/boat-native-remote-workspaces-milestone-7r`, the wider fix D of round 2 finding 36. The user sees it as item 105.
- **Location:** `docs/protocol/chat-and-events.md`, section "Messages", and the turn handling in `worker/chat/` and `runner/src/`.
- **Reason:** the fix changes when another member's message reaches a running turn, which the protocol states.

- **Background:** A message sent during a turn goes to the agent at once. When it comes from another member, the runner changes to that member's agent login at the next step, inside the same turn.
- **Problem:** One turn then holds parts from several senders, but it ends with one outcome. A failure of one sender's part ends the turn for everyone, and the other member's waiting input does not run.
- **Impact if no action:** In a shared workspace, one member's login failure can drop another member's message, which must be sent again.
- **Root question:** How does each member's message get its own outcome in a shared workspace?
- **Options:**
  - **A.** Keep mixed turns, as PR #12 does: a failed part ends the turn, and waiting input must be sent again. Effort: Small.
  - **D.** One sender per turn. A message from another member during a running turn waits as a queued turn, and runs on that member's login when the turn ends. Messages from the same sender still join the running turn. Effort: Medium.
  - **E.** Keep mixed turns, and the workspace runs the input that never reached an agent in a new queued turn after a failure. Effort: Medium.
- **Left out:** Reporting the failure only at the end of the turn, because it shows late and drops the turn's changed files.
- **Wider fix:** D.
- **Previous examples:** PR #12 round 2 finding 36, and the wrong retry target of a later sender's failure that its check found.
- **Recommendation:** D.
- **Action:** fix after merge, apply the session-login option F of decision 105, which the user chose on 7 November 2026 in place of D. Milestone 7w builds it.
