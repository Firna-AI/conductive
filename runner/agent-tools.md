# Runner agent tools

The [agent runner](README.md) registers two stdio MCP servers for each
agent process. The [agent-tool requirements](../docs/protocol/agent-tools.md)
define their behavior.

For a Codex ChatGPT turn, the rules of its ChatGPT workspace can limit
these servers or add managed MCP commands. Codex applies those rules in
the org's sandbox, as [Codex logins](codex-logins.md#chatgpt-sign-in) says.

## Computer tools

Both agents get the `computer` MCP server of the sandbox when it has one.
On Boat, Boat writes its `mcpServers.computer` entry to
`/home/user/.claude.json` at each sandbox start. The entry names a local
stdio server that talks over a Unix socket, with no URL and no credential.
On E2B, the template writes an entry at each boot that starts the installed
Cua Driver through `/usr/bin/env`. Its arguments set `DISPLAY`,
`DBUS_SESSION_BUS_ADDRESS`, and `XDG_RUNTIME_DIR` before `cua-driver mcp`.
The entry has no `env` field. Older runners pass these arguments to both
agents, so their computer tools also get the desktop settings.

The runner reads that entry again at each agent start. Claude gets it as
it is, and Codex gets its command, arguments, and declared environment as
a stdio server. Both Codex servers use the same settings builder.
The builder writes the environment as a TOML inline table for Codex's
`-c` settings.
Without a valid entry, the runner writes a warning, and the agent starts
without computer tools.

## Workspace tools

Both agents also get the `conductive` workspace MCP server. It runs
`/usr/local/bin/conductive mcp`. The sandbox release supplies the Rust
program. Its system installer links the public command to the active release.
Its settings hold no URL, token, or login. Codex forwards the three
[tool environment names](../tools/README.md#use) to its stdio child.

The runner derives the tool machine origin from its connection URL and
uses that connection's workspace token. It gives each agent process the
original active turn ID. These values replace inherited tool context.
The CLI inherits the same context from the agent process.

A message from another member or a deferred model change keeps the
active turn's context. Each new turn starts fresh tool processes.
Closing the SDK or App Server also stops its workspace MCP child.

The tools give 27 Worker calls across the org. They manage workspaces,
sessions, and messages, create and delete sections, and open, list, and
close private port previews. They also list repositories, sections, and
models, and ask to run Mac commands.
They also list secrets and run commands with approved values.
[Workspace tool calls](../tools/calls.md) gives each call with its
options, defaults, transcript continuation, and retry IDs.

- An omitted workspace ID names the calling workspace.
- Reads need only the workspace token.
- Writes need the active turn. They act for the member whose message
  started that turn, with that member's rights in the app.
- Only the workspace owner or an org admin can archive a workspace.
  Archiving the calling workspace ends the turn. Stopping or closing the
  calling session can also end it.
- Preview links need sign-in.
- A session link contains the workspace and session IDs. Workspace and
  session links in an answer show as chips.
- A `Sent by:` line names the sending session. An agent must not reply
  only to confirm it.

The runner puts this guidance in each new session's instructions.
An existing session keeps its saved instructions after a restart. A new
session gets the current guidance.

## Local service tools

The same server gives five [local service calls](../tools/services.md).
They start, list, stop, and restart services, and read their retained output.
They need no workspace token or active turn and reach only this computer.
The runner owns the socket. Each separate service unit owns its process and log writer.
Service processes and calls add no activity and hold no agent turn open.
New session instructions have a separate Services section.
[Agent guidance](../docs/protocol/services.md#agent-guidance) states the rules
for temporary check servers and services.

## Sender IDs

Each message to an agent ends with a sender line, as
[Messages and files](agent-input.md#messages-and-files) says. The line
gives the member who sent that message, with the member ID:

```text
Sender: Alice Example (@alice) [member ID: "member-alice-id"]
```

A member without a display name gets
`Sender: @alice [member ID: "member-alice-id"]`.

- Each message carries the ID of its own sender. So a message of another
  member during a turn gives a different ID from the member who started
  that turn.
- For the workspaces of the member who sent a message, the agent passes
  the member ID of that message as `ownerId` to `list_workspaces`.
- For another member, the agent takes the ID from the owner fields of a
  listed workspace: the ID, the GitHub login, and the display name.
- The agent never infers an owner from the workspace token or the active
  turn. No mine filter and no login lookup exist.
- The line informs the agent only. A later message changes no turn
  sender, tool access, commit author, or Mac target.

## Key code

- [message.ts](sdk-helper/src/providers/message.ts) gives `senderLines`, the
  sender line with the member ID of each message, which the input of each
  agent puts at the end of the message. The stored message and the chat
  never hold that line.
- [instructions.rs](../crates/cnd-runner/src/engine/instructions.rs) builds the session instructions, which
  hold the workspace tool and service guidance of each new session: the call names,
  the access rules, server lifetime, and the choice of an owner ID.
- [claude-background-note.ts](sdk-helper/src/providers/claude-background-note.ts)
  gives Claude the server guidance in each note for new background work.
- [provider.rs](../crates/cnd-runner/src/engine/provider.rs) derives the workspace tool
  context from the runner connection and the active turn.
  [environment.ts](sdk-helper/src/providers/environment.ts) puts that context in each agent environment.
- [computer-mcp.ts](sdk-helper/src/providers/computer-mcp.ts) gives `readComputerServer`,
  which reads the sandbox's `computer` entry at each agent start.
  It sends warnings through `ProviderOptions.warn`.
- [codex-mcp.ts](sdk-helper/src/providers/codex-mcp.ts) gives `codexStdioServer`,
  which writes the command, arguments, and environment settings for both
  Codex stdio servers.
