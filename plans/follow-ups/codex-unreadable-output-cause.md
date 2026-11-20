# A stop for unreadable Codex output names no cause

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from branch `calummoore/agent-stopped-mn5l`, item 4 of the investigation of "The agent process ended."
- **Location:** `runner/sdk-helper/src/providers/rpc.ts:39`, `runner/sdk-helper/src/providers/rpc.ts:112`, and `runner/sdk-helper/src/providers/codex.ts:171`.
- **Reason:** Option B changes the failure text that users see, and no requirement states that text.

- **Source:** Implementation. **Category:** Product bug.
- **Terms:**
  - **App Server:** the `codex app-server` program that the SDK helper starts for each Codex agent. It speaks JSON-RPC, with one JSON message on each line of its output.
  - **Codex reader:** the `JsonRpc` class in `runner/sdk-helper/src/providers/rpc.ts`. It reads each output line of the App Server and gives each notification to `codexNotification` in `runner/sdk-helper/src/providers/codex-events.ts`.
- **Background:** The Codex reader parses each line as JSON. Strict parsers then read each notification. When a line does not parse, or a parser throws, the reader stops the App Server. The turn then fails with "The agent process ended.", the same text as for a crash. On 17 and 18 November 2026, this happened in two Mokly workspaces. There the helper had split one valid line at U+2028, because it read the App Server output with `node:readline`. Branch `calummoore/agent-stopped-mn5l` fixed that split. The stop and its text stay.
- **Problem:** A stop by the helper itself shows the same text as a crash of the agent program. A notification with an unexpected shape, such as after an update of the pinned Codex program, also stops the agent.
- **Impact if no action:** The next stop of this kind needs a long investigation again, because the text blames the agent program.
- **Root question:** How should the helper act on App Server output that it cannot read?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Keep the stop. End the turn with its own text, such as "Conductive could not read a reply of the agent. Try again." Write a helper warning with the JSON-RPC method name, and no content. Effort: Small.
  - **C.** Skip a notification that a parser cannot read, with the same warning, and keep the agent running. A line that is not JSON still stops the agent, as in B. A skipped `turn/completed` leaves the turn open, so that method still stops the agent. Effort: Medium.
- **Left out:** Accept any shape in every field. That hides real protocol changes, which the warnings of B and C report.
- **Wider fix:** C. It keeps turns running across changes of the App Server notifications.
- **Previous examples:** The line split at U+2028 and U+2029, fixed on branch `calummoore/agent-stopped-mn5l`.
- **Related:** `plans/follow-ups/agent-end-cause-not-recorded.md` records the exit code and the signal of an agent end. Both items help an operator name the cause of an agent end.
- **Recommendation:** B. A skipped notification can lose a chat event or leave a turn open, so a clear stop is safer than a skip. C best protects turns against a Codex update.
- **Action:** ask the user, because option B changes text that users see, and no requirement states that text.
