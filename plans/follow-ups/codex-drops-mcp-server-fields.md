# Codex drops fields of a stdio MCP server

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-19, the wider fix of finding 9 of review round 8 on branch `calummoore/e2b-backup-sandbox-provider`, split off in the fix round.
- **Location:** the Codex server settings in `runner/sdk-helper/src/providers/codex.ts`, the entry reader `readComputerServer` in `runner/sdk-helper/src/providers/computer-mcp.ts`.
- **Reason:** A mapping of `timeout` can change the Codex tool timeout on Boat, and nobody has read Boat's real `computer` entry yet.

- **Terms:**
  - **Computer entry:** the MCP server `computer` in `/home/user/.claude.json`, which Boat writes at each start, and which the E2B template writes at each boot.
  - **Codex settings:** the `-c` keys that the runner gives the Codex App Server for each MCP server, such as `mcp_servers.computer.command`.
- **Background:** `readComputerServer` accepts these fields of a stdio entry: `type`, `command`, `args`, `env`, `timeout`, and `alwaysLoad`. Claude gets the whole entry. For Codex, the runner builds its own settings. On 19 November 2026, the fix of finding 9 made one shared function forward `command`, `args`, and each `env` name for both Codex servers.
- **Problem:** Codex still gets no `timeout` and no `alwaysLoad` from the entry. A later entry that sets them works for Claude and silently differs for Codex.
- **Impact if no action:** A future entry with a `timeout` gets Codex's default tool timeout instead. No current E2B entry sets these fields.
- **Root question:** How does Codex get every field of a stdio MCP server that the runner accepts?
- **Options:**
  - **A.** Map `timeout` to the Codex setting `tool_timeout_sec`, and leave `alwaysLoad` out with a comment that Codex has no matching setting. Effort: Small.
  - **B.** Build the Codex settings from one table typed over the keys of the SDK type `McpStdioServerConfig`, so that a new field fails the typecheck until it gets a row or an explicit "Claude only" mark. Effort: Small.
- **Left out:** No change, because the gap stays silent for each new field.
- **Wider fix:** B. The type makes each new field a compile error until someone maps it.
- **Previous examples:** Commit `26fb0ed6` replaced a fixed server URL with the sandbox's stdio settings. Finding 9 of review round 8 found that the same transfer dropped `env`.
- **Recommendation:** B. It keeps the Claude and Codex settings of one entry from drifting again.
- **Action:** fix after merge, apply B, because it can change Codex on Boat, and Boat's real entry must be read first.
