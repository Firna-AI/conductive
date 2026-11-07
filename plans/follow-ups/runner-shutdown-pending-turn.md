# A runner shutdown misses a turn that waits for its first save

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #30, branch `conductor/boat-native-remote-workspaces-milestone-7u`, round 1 finding 3, and a problem outside the scope that its check found.
- **Location:** `runner/src/engine-runtime.ts:135` and `:64`, `runner/src/engine-input.ts:64`.
- **Reason:** a Rare Medium product bug. Its fix also waits for no answer, but the turn handling of PR #30 must merge first.

- **Terms:**
  - **Runner:** the agent runner, the Node program in each cloud computer that runs the agents and reports to the workspace.
  - **Session save:** the write of a new session record to the runner state file. The first turn of a session waits for it.
- **Background:** Milestone 7u ends each turn that a runner process leaves behind, at a shutdown and at the next start. The workspace marks a sent turn as running before the runner starts it. The runner makes a turn active only after the session save.
- **Problem:**
  - A shutdown during the session save cancels the start, but it sends no end, and the runner saves no turn record. After a restart, the runner accepts the resent command and starts the agent.
  - The runner keeps the turns that Stop ended before their start only in memory. After a restart, a resent Stop for such a turn gets a second end.
- **Impact if no action:** The chat can show a running turn after a shutdown, and the next runner can run work that the shutdown cancelled. A resent Stop can add a second end for one turn.
- **Root question:** How does each turn that the runner receives get exactly one end when the runner stops or crashes before the turn starts?
- **Options:**
  - **B.** Keep each pending turn in memory with its start, and end it at a shutdown. A crash during the session save still runs the turn again. Effort: Medium.
  - **D.** Save each turn in the runner state file when the runner accepts its command, before any other step. A shutdown, Stop, and the next start then end each saved turn once, and a resent command or Stop that finds the record starts nothing and sends no second end. Each turn adds one disk write. Effort: Medium.
  - **F.** One owner for each accepted turn, built on the process handle of PR #30, that saves `turn.started` before the session save. A failed save then sends `turn.failed`, which item 109 must decide first. Effort: Medium.
- **Left out:**
  - Run the turn again after the restart, because Milestone 7u ends each turn that the workspace treats as running.
  - A change of the reconnect contract, because D ends the same turns with no contract change.
- **Wider fix:** D. A saved record covers a shutdown, a crash, and a resent Stop.
- **Previous examples:** commit `b2b7a16`, which ends a Stop during a pending session save.
- **Related:** item 109, `plans/follow-ups/runner-file-and-save-errors.md`, the same code. Item 109 decides what a failed save reports. D leaves that report as it is.
- **Recommendation:** D. It covers the shutdown and the crash, and it needs no answer to item 109.
- **Action:** fix after merge, apply D, because it is a Rare Medium product bug.
