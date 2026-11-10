# Agent instructions

This guide gives how the runner builds and keeps the agent instructions of
each session, and the lines that it adds to each message.
[Agent instructions](../docs/protocol/agent-instructions.md) states the
requirements. The [runner README](README.md) gives the rest of the runner.

## The instructions of a session

- `agentInstructions` builds the agent instructions of each agent from the
  configuration. Claude gets its seven base rules and that text as
  `systemPrompt`. Codex keeps its default base instructions and gets the
  text as `developerInstructions` on `thread/start` and `thread/resume`.
- A new session takes its workspace branch and target branch from the
  `branches` of the command that starts it. A command of an older Worker
  has no `branches`, so the session then takes the branches of the runner
  configuration.
- The runner saves the text of a session before its first agent start. Later
  starts reuse it exactly, also after a restart or a change of configuration
  or wording. A saved session without text takes the current text once.
- Beside the text, the runner saves the pair of branches that the text
  names, as `instructionBranches`. Later starts keep that pair with the
  text, also after a conversation update or a model change.
- An older saved session has no saved pair. The runner reads the pair from
  the `Workspace branch:` and `Target branch:` lines of its saved text, and
  leaves the text unchanged. When it cannot read both, the pair is unknown.

## The lines of each message

- Each message to an agent starts with a sender line, then an empty line:
  `Sender: <display name> (@<login>)`, or `Sender: @<login>` without a
  display name. No adapter maps a user message to an event, so the chat
  never shows the sender line.
- Each `turn` and `message` command of the current Worker carries the
  current branches in `branches`, also a message during a turn.
- When those branches differ from the saved pair of the session, or the
  saved pair is unknown, a branch line follows the sender line:
  `Current branches: workspace "<branch>"; target "<branch>".` Each name is
  a JSON string, so it stays on one line. Then the empty line follows.
- A session whose saved pair names the current branches gets no branch
  line. So a new session after Continue gets none, because its text names
  the new branch.
- The branch line exists only in the text that reaches the agent. The
  stored message, its events, and the titles from messages use only the
  text that the member wrote.
- A workspace keeps the runner of its first image. An older runner reads no
  `branches`, so its sessions get no branch line.

## Key code

- `src/instructions.ts`: `agentInstructions`, with Claude's base rules.
- `src/instruction-state.ts`: the built text with its branches, the parser
  of saved branches, and the reader of the branches of older saved text.
- `src/engine-input.ts`: the instructions and the saved pair of a session
  at its first input.
- `src/providers/message.ts`: `providerMessage`, the sender line and the
  branch line.
- `src/providers/instructions.test.ts` and `src/providers/branches.test.ts`:
  the saved text, the sender line, and the branch line of both agents.
