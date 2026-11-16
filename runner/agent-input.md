# Agent input

The runner prepares the workspace context folder and builds the input of
both agents: the instructions of each session, and the lines that it adds
to each message. Its [key code](#key-code) names its entry points. The
[runner README](README.md) gives the rest of the runner.

## The context folder

Before its first file report, `prepareContextFolder` asks Git for its
local exclude path with `git rev-parse --git-path info/exclude`. It adds
`/.context/` once, then makes `.context/` and `.context/attachments/` in
the workspace repository. It keeps existing exclude rules and tracked
files. It leaves a file or link named `.context` alone. A failed step
warns and lets the runner continue.

Each file report then adds the untracked files of `.context/` to the
tree, also the files that Git ignores. `contextFolderFiles` lists them
with `git ls-files --others` and no ignore rules. The changes report
does not take them, so Changes leaves them out.

[The context folder](../docs/protocol/repository-folders.md#the-context-folder)
states its use and limits. The runner and its instruction text follow the
[sandbox software update rules](../docs/protocol/sandbox-software.md#updates).

## Agent instructions

`agentInstructions` builds the agent instructions of each agent from the
configuration. Claude gets its seven base rules and that text as
`systemPrompt`. Codex keeps its default base instructions and gets the
text as `developerInstructions` on `thread/start` and `thread/resume`.
The text names the context folder for notes, screenshots, and files for
other sessions of the workspace.

The runner saves the text of a session before its first agent start. Later
starts reuse it exactly, also after a restart or a change of configuration
or wording. A saved session without text takes the current text once.
[Agent instructions](../docs/protocol/agent-instructions.md) states these
requirements.

- A new session takes its workspace branch and target branch from the
  `branches` of the command that starts it. A command of an older Worker
  has no `branches`, so the session then takes the branches of the runner
  configuration.
- Beside the text, the runner saves the pair of branches that the text
  names, as `instructionBranches`. Later starts keep that pair with the
  text, also after a conversation update or a model change.
- An older saved session has no saved pair. The runner reads the pair from
  the `Workspace branch:` and `Target branch:` lines of its saved text, and
  leaves the text unchanged. When it cannot read both, the pair is unknown.
- The runner also saves the repository folder that the text names, as
  `instructionFolder`. An older saved session takes it from the
  `Workspace repository folder:` line of its text. When the line is
  missing, the folder is unknown.

## Messages and files

Each message to an agent starts with a sender line, then an empty line:
`Sender: <display name> (@<login>) [member ID: "<id>"]`, or
`Sender: @<login> [member ID: "<id>"]` without a display name. The member
ID is a JSON string. Each run of white space in the name and the login
becomes one space, and their ends lose their white space. Each message
gives its own sender, also a message during a turn.
[Sender IDs](agent-tools.md#sender-ids) says how agents use the ID with
the workspace tools. No adapter maps a user message to an event, so the
chat never shows the sender line.

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
- Until an update applies, an older runner reads no `branches`, so its
  sessions get no branch line. Existing sessions keep their saved instructions
  after an update.

### The repository line

- The Worker sends the current repository in `repository`, with its full
  name and its folder, only to a runner whose `hello` names its folder.
- When that folder differs from the saved `instructionFolder` of the
  session, a repository line follows the sender line:
  `Current repository: "<owner/name>" in the folder "<folder>". The workspace now works in this folder. Its context folder is "<folder>/.context".`
  Each value is a JSON string. A branch line can follow it.
- A session whose saved folder is the current folder, or is unknown, gets
  no repository line. A move back to that folder ends the line.
- The repository line exists only in the text that reaches the agent, as
  the branch line does.
- [The repository line](../docs/protocol/message-lines.md#the-repository-line)
  states these requirements.

### Saved Claude sessions after a move

Claude keeps each saved session in a project folder for its working folder,
`projects/<folder>/<id>.jsonl`, with each character of the folder outside
A-Z, a-z, and 0-9 as `-`. Before a resume, the helper looks for the session
in the project folder of the current folder. When exactly one other project
folder holds it, the helper moves the file and its `<id>/` folder there. A
move keeps one copy, so a move back finds the newest turns. A missing or
ambiguous session stays, and the resume reports its own failure. Codex
needs no step: it keeps sessions by date and thread ID, and
`thread/resume` takes the new `cwd`.

A message with attached files adds one read instruction after the
member's text, then one JSON line per file. Each line gives its original
name, media type, copied absolute path, and `sizeBytes` from message
metadata. Codex keeps each image input right after its file line. When at
least one image goes as image input, its read instruction adds: "Only an
image that comes right after its file line is also in this message."
A message without files gets no extra line.

[Agent input](../worker/chat/attachments.md#agent-input) in the attachment
guide gives the exact instruction and the metadata source.

## Key code

- [setup.rs](../crates/cnd-runner/src/repository/setup.rs) prepares the context folder and local Git exclusion.
- [instructions.rs](../crates/cnd-runner/src/engine/instructions.rs) builds session instructions and reads legacy branches.
- [input.rs](../crates/cnd-runner/src/engine/input.rs) keeps session instructions and the turn's original context.
- [message.ts](sdk-helper/src/providers/message.ts) formats sender lines, repository lines, branch lines, and attachments.
- [claude-transcript.ts](sdk-helper/src/providers/claude-transcript.ts) moves a saved Claude session to the project folder of the current folder.
- [instructions.test.ts](sdk-helper/src/providers/instructions.test.ts) and
  [branches.test.ts](sdk-helper/src/providers/branches.test.ts) check the helper input text.
- [context_tests.rs](../crates/cnd-runner/tests/repository/context_tests.rs) checks ordinary and linked Git worktrees.
