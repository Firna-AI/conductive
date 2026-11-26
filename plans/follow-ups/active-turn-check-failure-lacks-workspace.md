# The failed active turn check omits the workspace

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/sidebar-indicator-not-showing-4fri`, review finding 6.
- **Location:** `worker/chat/active-turn-check.ts:61-63`, `worker/simple-warnings.ts`, `worker/chat/runner-warnings.md`, `src/marketing/privacy-uses.ts:194-216`.
- **Reason:** The review found it after the two fix rounds of its branch.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Active turn:** the turn that a chat session names in its stored record as the one that runs or waits. The chat shows "Working" while the session names a started turn.
  - **Running list:** the IDs of the turns that the workspace summary counts as running. The summary is the Worker's saved record `chat:v1:workspace-summary` in the workspace object. The sidebar shows a workspace as working when this list is not empty, and the idle stop does not stop a workspace while a turn on it runs.
  - **Active turn check:** the check in `worker/chat/active-turn-check.ts` that the session list route `GET .../sessions` runs. It writes the log warning `session_active_turn_not_running` for each session whose active turn does not count as running, and `active_turn_check_failed` when the check throws.
- **Background:**
  - `docs/protocol/runner-warnings.md` says "Each warning holds its kind and the workspace ID."
  - When the check throws, it writes `warnWorker({ kind: 'active_turn_check_failed' })`. That is a simple warning in `SIMPLE_WARNINGS`, with only the kind and a fixed text. The table in `worker/chat/runner-warnings.md` lists its fields as "None".
  - `warnActiveTurnMismatches` already gets the workspace ID as a parameter.
- **Problem:** The failure warning holds no workspace ID, against the protocol.
- **Impact if no action:** A log search for one workspace misses its failed checks.
- **Root question:** How can an operator find the failed checks of one workspace?
- **Options:**
  - **A.** Move `active_turn_check_failed` out of `SIMPLE_WARNINGS` into a typed warning with a required `workspaceId: WarningId`, next to `ActiveTurnWarning` in `worker/warning-active-turn.ts`. Pass the checked ID. Update the table, and name the record of a failed check in the Privacy paragraph "Operational logs" in `src/marketing/privacy-uses.ts`. Effort: Small.
  - **B.** Keep the warning, and write its exception in the protocol and the Privacy notice. Effort: Small.
  - **C.** Add a warning context for each workspace object that puts the workspace ID on every warning it writes. It reaches about 48 call sites and adds logged data that no requirement covers. Effort: Large.
- **Left out:** Logging the error text breaks the rule that a warning holds no error text.
- **Wider fix:** None. The typed kind of A follows the pattern of the other runner warnings.
- **Previous examples:** `plans/follow-ups/provider-groundwork-deployed-smoke.md` notes the same gap for `workspace_alarm_failed`.
- **Related:** `plans/follow-ups/active-turn-check-failure-route-test.md` tests the same branch. Its test should assert the workspace ID field of A.
- **Recommendation:** A. It meets the protocol with the typed pattern the code already uses.
- **Action:** fix after merge, apply A, because the review found it after the two fix rounds of its branch.
