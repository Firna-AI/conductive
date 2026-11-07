# A Mac command tool cannot read its result after Stop

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #23, branch `conductor/boat-native-remote-workspaces-milestone-15f`, round 2 finding 10.
- **Location:** `tools/device-client.ts:69` and `worker/devices/tools.test.ts`.
- **Reason:** only a tool that outlives its turn meets it, because Stop ends the agent process.

- **Background:** The "run a command on the Mac" tool reads the command's result through a machine route, and each machine call needs a running turn.
- **Problem:** After Stop, a read gets HTTP 403 `calling_turn_required`, and the tool shows a generic failure.
- **Impact if no action:** A tool that outlives its turn reports a vague failure, although the chat shows that the turn ended.
- **Root question:** What does the tool say when its turn ended before it read the result?
- **Options:**
  - **D.** End the read loop on `calling_turn_required`, and return a failure that says that the agent turn ended and that the tool cannot read the result. Test the CLI and the MCP tool after Stop, and update `tools/README.md`. Effort: Small.
  - **B.** Let a read of a finished command pass without a running turn. Effort: Small.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because only a tool that outlives its turn meets it.
