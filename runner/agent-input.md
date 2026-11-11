# Agent input

The runner prepares the workspace context folder and builds the input of
both agents. The [runner README](README.md#key-code) names its entry points.

## The context folder

Before its first file report, `prepareContextFolder` asks Git for its
local exclude path with `git rev-parse --git-path info/exclude`. It adds
`/.context/` once, then makes `.context/` and `.context/attachments/` in
the workspace repository. It keeps existing exclude rules and tracked
files. It leaves a file or link named `.context` alone. A failed step
warns and lets the runner continue.

During an import activation, the runner skips this step at its start. After
the disk check, the restore makes `.context/attachments/` with its destination
checks, and `prepareContextExclude` adds the same `/.context/` rule, as
[The import activation guide](import.md#the-restore) says.

[The context folder](../docs/protocol/repository-folders.md#the-context-folder)
states its use and limits. A new org image build installs the runner with this
startup step and the instruction text below.

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

## Messages and files

Each message to an agent starts with a sender line, then an empty line:
`Sender: <display name> (@<login>)`, or `Sender: @<login>` without a
display name. No adapter maps a user message to an event, so the chat
never shows the sender line.

A message with attached files adds one read instruction after the
member's text, then one JSON line per file. Each line gives its original
name, media type, copied absolute path, and `sizeBytes` from message
metadata. Codex keeps each image input after its file line. Its read
instruction mentions image input only when the message has an image.
A message without files gets no extra line.

[Agent input](../worker/chat/attachments.md#agent-input) in the attachment
guide gives the exact instruction and the metadata source.
