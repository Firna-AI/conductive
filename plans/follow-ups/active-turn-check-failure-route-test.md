# No test covers a failed active turn check

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/sidebar-indicator-not-showing-4fri`, review finding 7.
- **Location:** `worker/chat/active-turn-check.ts:61-63`, `worker/chat/active-turn-check.test.ts`.
- **Reason:** The review found it after the two fix rounds of its branch.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Active turn:** the turn that a chat session names in its stored record as the one that runs or waits. The chat shows "Working" while the session names a started turn.
  - **Running list:** the IDs of the turns that the workspace summary counts as running. The summary is the Worker's saved record `chat:v1:workspace-summary` in the workspace object. The sidebar shows a workspace as working when this list is not empty, and the idle stop does not stop a workspace while a turn on it runs.
  - **Active turn check:** the check in `worker/chat/active-turn-check.ts` that the session list route `GET .../sessions` runs. It writes the log warning `session_active_turn_not_running` for each session whose active turn does not count as running, and `active_turn_check_failed` when the check throws.
- **Background:**
  - The protocol section "Active turns that do not run" says that a session list read whose check cannot finish still sends the list, and writes one warning that the check did not finish.
  - `worker/chat/active-turn-check.test.ts` covers a running turn and an ended turn. No test makes the check throw.
  - A review probe removed the `catch`. The 10 tests still passed. A route test with a fault then failed with "expected 500 to be 200".
- **Problem:** No test protects the rule that a failed check still sends the session list.
- **Impact if no action:** A change can turn a failed diagnostic into a failed chat load, and no test fails.
- **Root question:** How do the tests prove that a check that cannot finish still sends the session list and writes one failure warning?
- **Options:**
  - **A.** Add a route test. Start a turn, then make the summary read throw with `fixture.setStorageHooks({ afterRead: async (key) => { if (key === 'chat:v1:workspace-summary') throw new Error('Injected summary read failure') } })`, and clear it with `fixture.clearFaults()`. Assert HTTP 200, the session list, and exactly one `active_turn_check_failed` warning. `failNextCommit` does not fit, because a read view never commits. Effort: Small.
  - **B.** Test `chatRoute` directly with real storage and the same fault. A already runs the real route. Effort: Medium.
  - **C.** A shared fault suite for optional chat diagnostics. It is a test for a whole class, so it needs the user's approval. Effort: Large.
- **Left out:** A unit test with a fake view cannot prove that the route still sends the list.
- **Wider fix:** C, which needs approval.
- **Previous examples:** Commit `661dc48be` added tests that keep an optional reporting failure out of the chat operation.
- **Related:** `plans/follow-ups/active-turn-check-failure-lacks-workspace.md` changes the fields of the same warning. `plans/follow-ups/active-turn-check-doc-says-no-write.md` option A can skip the read when no session has an active turn, so the test must start a turn.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the review found it after the two fix rounds of its branch.
