# Runner agent tools

The [agent runner](README.md) registers two stdio MCP servers for each
agent process. The [agent-tool requirements](../docs/protocol/agent-tools.md)
define their behavior.

For a Codex ChatGPT turn, the rules of its ChatGPT workspace can limit
these servers or add managed MCP commands. Codex applies those rules in
the org's sandbox, as [Codex logins](codex-logins.md#chatgpt-sign-in) says.

## Computer tools

Both agents get the `computer` MCP server of the sandbox. Boat writes its
`mcpServers.computer` entry to `/home/user/.claude.json` at each sandbox
start. The entry names a local stdio server that talks over a Unix
socket, with no URL and no credential.

The runner reads that entry again at each agent start. Claude gets it as
it is, and Codex gets its command and arguments as a stdio server.
Without a valid entry, the runner writes a warning, and the agent starts
without computer tools.

## Workspace tools

Both agents also get the `conductive` workspace MCP server. It runs
`/usr/local/bin/conductive mcp`, which the image builder installs.
Its settings hold no URL, token, or login. Codex forwards the three
[tool environment names](../tools/README.md#use) to its stdio child.

The runner derives the tool machine origin from its connection URL and
uses that connection's workspace token. It gives each agent process the
original active turn ID. These values replace inherited tool context.
The CLI inherits the same context from the agent process.

A message from another member or a deferred model change keeps the
active turn's context. Each new turn starts fresh tool processes.
Closing the SDK or App Server also stops its workspace MCP child.

## Key code

- [workspace-tools.ts](src/providers/workspace-tools.ts) binds runtime tool
  credentials to the runner connection. Each provider start adds the
  current turn ID in its environment.
- [computer-mcp.ts](src/providers/computer-mcp.ts) gives `readComputerServer`,
  which reads the sandbox's `computer` entry at each agent start.
  It sends warnings through `ProviderOptions.warn`.
