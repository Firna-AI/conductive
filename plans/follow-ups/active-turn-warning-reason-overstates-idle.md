# The active turn warning reason overstates idle

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/sidebar-indicator-not-showing-4fri`, review finding 9.
- **Location:** `docs/protocol/runner-warnings.md` section "Active turns that do not run", `worker/chat/active-turn-check.ts:9-14`.
- **Reason:** The review found it after the two fix rounds of its branch.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Active turn:** the turn that a chat session names in its stored record as the one that runs or waits. The chat shows "Working" while the session names a started turn.
  - **Running list:** the IDs of the turns that the workspace summary counts as running. The summary is the Worker's saved record `chat:v1:workspace-summary` in the workspace object. The sidebar shows a workspace as working when this list is not empty, and the idle stop does not stop a workspace while a turn on it runs.
  - **Active turn check:** the check in `worker/chat/active-turn-check.ts` that the session list route `GET .../sessions` runs. It writes the log warning `session_active_turn_not_running` for each session whose active turn does not count as running, and `active_turn_check_failed` when the check throws.
- **Background:**
  - The protocol reason says: "the chat then shows the turn as working, while the sidebar and the idle stop treat the workspace as idle." The code comment says the same.
  - The sidebar shows a workspace as working when any turn is in the running list (`working: projection.activeTurns.length !== 0` in `worker/chat/workspace-summary.ts`). The idle stop also counts every running turn.
  - A review probe got the warning while a second turn kept the workspace working.
- **Problem:** The reason says the whole workspace looks idle, but another running turn can keep it working.
- **Impact if no action:** An operator can read one warning as proof that the whole workspace looked idle.
- **Root question:** How can the reason describe the effect of the mismatch so that it stays true when other turns of the workspace run?
- **Options:**
  - **A.** Qualify the protocol reason and the comment: "the chat shows the turn as working, but the workspace does not count it among its running turns. When no other turn runs, the sidebar and the idle stop then treat the workspace as idle." Read both legal pages and every public guide in full with the protocol edit. Effort: Small.
  - **B.** Remove the sidebar and idle stop sentence. It loses why the mismatch matters. Effort: Small.
  - **C.** Add a field to the warning with the length of the running list, so each warning shows whether the sidebar showed idle. It is a new logged field and needs a Privacy check. Effort: Small.
- **Left out:** Suppressing the warning while another turn runs hides a real mismatch.
- **Wider fix:** None. The documentation skill already covers doc drift.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/active-turn-check-doc-says-no-write.md` edits the same comment and protocol section. Make both edits together.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the review found it after the two fix rounds of its branch.
