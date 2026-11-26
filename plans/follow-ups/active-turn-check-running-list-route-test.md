# No route test covers a turn outside the running list

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/sidebar-indicator-not-showing-4fri`, review finding 8.
- **Location:** `worker/chat/active-turn-check.test.ts`, `worker/chat/chat-transaction.ts:124-127`.
- **Reason:** The review found it after the two fix rounds of its branch.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Active turn:** the turn that a chat session names in its stored record as the one that runs or waits. The chat shows "Working" while the session names a started turn.
  - **Running list:** the IDs of the turns that the workspace summary counts as running. The summary is the Worker's saved record `chat:v1:workspace-summary` in the workspace object. The sidebar shows a workspace as working when this list is not empty, and the idle stop does not stop a workspace while a turn on it runs.
  - **Active turn check:** the check in `worker/chat/active-turn-check.ts` that the session list route `GET .../sessions` runs. It writes the log warning `session_active_turn_not_running` for each session whose active turn does not count as running, and `active_turn_check_failed` when the check throws.
- **Background:**
  - The check gives the reason `not_in_running_list` when a session's active turn is stored as running or stopping, but the running list leaves it out. The protocol names this case.
  - The table test passes its own set of running IDs. The route test ends the turn through `saveTurn`. `saveTurn` always updates the summary, so no product path makes the two disagree.
  - A review probe replaced `runningTurnIds()` with a scan of the turn records in the running or stopping state. All 10 tests still passed.
- **Problem:** No route test proves that the check compares each active turn with the running list of the saved summary.
- **Impact if no action:** The check can stop finding the case that the sidebar shows as idle while a turn runs, and no test fails.
- **Root question:** How do the tests prove that the warning uses the running list that the saved summary holds?
- **Options:**
  - **A.** Add a route test. Start a turn, then save a full current summary with an empty running list: `fixture.storage.put('chat:v1:workspace-summary', { lastOutputEventNumber: 0, activeTurns: [], lastTurnEndedAt: null, title: null })`, as `worker/chat/workspace-summary.test.ts` does. Read the session list. Assert one warning with `reason: 'not_in_running_list'` and `turnState: 'running'`, and that the workspace summary says not working. Effort: Small.
  - **B.** A with two omitted turns in two sessions and one listed turn. Effort: Small.
  - **C.** A unit test with a fake view. It proves nothing about the real summary. Effort: Small.
- **Left out:** A product path cannot make the disagreement, because the summary and the turn save in one transaction.
- **Wider fix:** None.
- **Previous examples:** `plans/follow-ups/socket-replay-turn-end-test.md` records a similar gap between a lower-level test and the production path.
- **Related:** `plans/follow-ups/active-turn-check-doc-says-no-write.md` changes how the check reads the running list. A full current summary keeps this test valid under both.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the review found it after the two fix rounds of its branch.
