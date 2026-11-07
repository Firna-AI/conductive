# A refused end of turn leaves the chat running

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #18, branch `conductor/boat-native-remote-workspaces-milestone-4d`, round 2 finding 4.
- **Location:** `foldRefused` in `src/chat/state/refused-events.ts:13`, and the session log in `src/chat/state/session-log.ts:22`.
- **Reason:** no runner event is refused before Milestone 7s builds the workspace checks.

- **Terms:**
  - **Refusal marker:** a stored chat event that names a runner event that the workspace refused, as decision 76 says.
- **Background:** Milestone 7s ends a turn in the workspace when it refuses the turn's end event. The chat in the browser follows the turn from the agent events.
- **Problem:** Since commit `841bc3d`, a refused end ends the turn in the chat when the chat knows that turn is running. When the chat never saw the turn, or saw a wrong end, nothing corrects it: the chat drops the session records, so a later record that names no active turn does not clear a wrong running state. Updated on 7 November 2026 from the round 3 check of PR #29.
- **Impact if no action:** After a refused end, the chat shows Working and Stop until a reload, also when the workspace already ended the turn.
- **Root question:** How does the chat end a turn that the workspace ended, whatever end event the browser got?
- **Options:**
  - **B.** End the turn in the browser when a refusal marker names an end event. Effort: Small.
  - **D.** End the running turn from the session records of its session. A newer record that does not name the running turn ends it, with its tools and its Stop. The development backend must send the true active turn. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D. The workspace sends a session record at each end, so every cause of a lost end event gets the same fix.
- **Previous examples:** Commit `47c17e7` made `TurnLifecycle.finish` the one place where the workspace ends a turn.
- **Related:** `plans/follow-ups/chat-late-event-mark.md`, a turn that the chat never saw, reopened by a late event. Its option D is the narrower fix.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because no refusal exists before Milestone 7s.
