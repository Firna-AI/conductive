# Agent input

The runner prepares the workspace context folder and builds the input of
both agents: the instructions of each session, the lines that it adds
to each message, and the skill inputs of Codex. Its [key code](#key-code)
names its entry points. The [runner README](README.md) gives the rest of
the runner.

## The context folder

Before its first file report, the repository setup asks Git for its
local exclude path with `git rev-parse --git-path info/exclude`. It adds
`/.context/` once, then makes `.context/` and `.context/attachments/` in
the workspace repository. It keeps existing exclude rules and tracked
files. It leaves a file or link named `.context` alone. A failed step
warns and lets the runner continue.

Each scan then adds the untracked files of `.context/` to the tree, also
the files that Git ignores. The repository scanner lists them with
`git ls-files --others` and no ignore rules. The tree report keeps them
within its limit, as
[Which entries stay](../docs/protocol/file-reports.md#which-entries-stay)
says. The changes report does not take them, so Changes leaves them out.

[The context folder](../docs/protocol/repository-folders.md#the-context-folder)
states its use and limits. The runner and its instruction text follow the
[sandbox software update rules](../docs/protocol/sandbox-software.md#updates).

## Agent instructions

The Rust instruction builder builds the agent instructions of each agent from the
configuration. Claude gets its seven base rules and that text as
`systemPrompt`. Codex keeps its default base instructions and gets the
text as `developerInstructions` on `thread/start` and `thread/resume`.
The text names the context folder for notes, screenshots, and files for
other sessions of the workspace.

After the branch paragraphs, new instructions give the workspace ID and
canonical link. They say whether the workspace is top-level or nested.
For a sub-workspace, they give its depth and its direct parent's ID and
link. The deepest depth comes from the Worker's environment, without a
second runner constant.

The text tells the agent to pass its workspace ID as `parentId` to
`create_workspace`, below that limit. At the limit, it gives the parent's
ID for a sibling and asks for a one-word group prefix, such as "Limits: ".
It names `get_workspace` for parent and sub-workspace details, and
`list_workspaces` with `parentId` for direct sub-workspaces.

The runner validates the complete set of tree variables. Missing or
malformed values produce one warning and omit all these paragraphs.
The [configuration page](configuration.md) lists those variables.

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

Each message to an agent ends with a sender line:
`Sender: <display name> (@<login>) [member ID: "<id>"]`, or
`Sender: @<login> [member ID: "<id>"]` without a display name. The member
ID is a JSON string. Each run of white space in the name and the login
becomes one space, and their ends lose their white space. Each message
gives its own sender, also a message during a turn.
[Sender IDs](agent-tools.md#sender-ids) says how agents use the ID with
the workspace tools. No adapter maps a user message to an event, so the
chat never shows the sender line.

- Claude gets one text: the member's text, the lines of the attached
  files, an empty line, the sender line, and any repository line and branch
  line.
- When the member's text starts with a skill text whose name is not a
  skill of the Claude list, Claude gets the sender line and any repository
  line and branch line first, then an empty line, the member's text, and the lines of the
  attached files. The provider reads the Claude skill folder at the send
  of such a message, as the skills report reads it, because the helper of
  a session gets only the Codex paths. It also takes the names of the org
  skills in the view of the session as skills of the Claude list. When it cannot read the folder,
  the message takes this form too.
- Codex gets the member's text as the first text item, and the sender
  line, with the repository and branch lines when due, as the last text item.
- Each `turn` and `message` command of the current Worker carries the
  current branches in `branches`, also a message during a turn.
- When those branches differ from the saved pair of the session, or the
  saved pair is unknown, a branch line follows the sender line and any
  repository line:
  `Current branches: workspace "<branch>"; target "<branch>".` Each name is
  a JSON string, so it stays on one line.
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
member's text, then one JSON line per file, before the sender line. Each
line gives its original name, media type, copied absolute path, and
`sizeBytes` from message metadata. Codex keeps each image input right
after its file line. When at least one image goes as image input, its
read instruction adds: "Only an image that comes right after its file
line is also in this message."
A message without files gets no extra line.

[Agent input](../worker/chat/attachments.md#agent-input) in the attachment
guide gives the exact instruction and the metadata source.

## Skills of a message

A message can name skills with skill texts, such as `/plans`.
`skillNames` in `src/shared/skill-text.ts` finds them in the text that the
member wrote, not in the sender line. A skill text is `/` and a name at the
start of the text or after white space, up to the next white space. A skill
text in code is code. Code reads as in a sent message of the chat: a
backtick starts code, which runs to the next backtick, or to the end of the
text.

- Codex gets the text item unchanged. Right after it, the input gets one
  item `{ "type": "skill", "name": "<name>", "path": "<path>" }` for each
  distinct skill of the text that the current Codex list holds, in the
  order of the text. `path` is the absolute path of the `SKILL.md` from
  that list, from `skills/list` or from the scan of the Codex folders. An
  org skill of the list takes the path of the skill in the org skills view
  of the session, by name. When that view does not hold the skill, the
  input gets no item for it. The
  read instruction and the lines of the attached files follow, and the
  sender line comes last.
- `turn/start` and `turn/steer` get the same items, so a message during a
  turn gets them too. The provider reads the list at each send.
- The Rust report owner keeps the current private Codex paths. The
  helper driver sends them with each member input. The helper supplies
  that list to `createCodexFactory`. A factory without the list, such as
  the first-start measurement, adds no skill item.
- A name that the Codex list does not hold adds nothing. The text keeps
  it.
- Claude gets the text unchanged. Claude runs a skill that the text names
  as `/name`. A listed skill at the start of the text starts the message,
  so the Claude CLI runs it, also a manual-only skill
  (`disable-model-invocation: true`).

[Skills of a message](../docs/protocol/agent-instructions.md#skills-of-a-message)
states these requirements. [Skills](reports.md#skills) in the report guide
says how the runner makes each list.

## Key code

- [setup.rs](../crates/cnd-runner/src/repository/setup.rs) prepares the context folder and local Git exclusion.
- [instructions.rs](../crates/cnd-runner/src/engine/instructions.rs) builds session instructions and reads legacy branches.
- [input.rs](../crates/cnd-runner/src/engine/input.rs) keeps session instructions and the turn's original context.
- [reporter.rs](../crates/cnd-runner/src/skills/reporter.rs) keeps current private Codex paths.
- [codex-input.ts](sdk-helper/src/providers/codex-input.ts) builds Codex text, skill, file, and sender input items.
- [claude-input.ts](sdk-helper/src/providers/claude-input.ts) builds the Claude text, with the sender line at its end or, before an unlisted `/` word, at its start.
- [skill-input.ts](sdk-helper/src/providers/skill-input.ts) finds each distinct named skill in member text.
- [message.ts](sdk-helper/src/providers/message.ts) formats sender lines, repository lines, branch lines, and attachments.
- [claude-transcript.ts](sdk-helper/src/providers/claude-transcript.ts) moves a saved Claude session to the project folder of the current folder.
- [instructions.test.ts](sdk-helper/src/providers/instructions.test.ts) and
  [branches.test.ts](sdk-helper/src/providers/branches.test.ts) check the helper input text.
- [context_tests.rs](../crates/cnd-runner/tests/repository/context_tests.rs) checks ordinary and linked Git worktrees.
