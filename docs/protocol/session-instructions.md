# Session instructions

This page belongs to [Agent instructions](agent-instructions.md). It
states how a session keeps its agent instructions for its whole life, and
how each agent gets them. The terms are those of
[Agent instructions](agent-instructions.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The same text for the life of a session

- A session keeps the same agent instructions for its whole life. A Claude
  session also keeps the same base prompt.
- This holds across each turn, each stop and resume of the sandbox, and
  each restart of the agent runner.
- This holds also when a fact, the wording of the instructions, or the
  base prompt changes later. An example is a new default branch of the
  repository at a later resume.
- A new session gets the instructions with the current facts and wording.
- A session that started without agent instructions can get them once, at
  a later turn. It then keeps that text.
- Apart from the branches, the instructions hold no fact that changes
  during the work, such as the date, the Git state, or the pull request
  state. The agent reads such facts with its tools.
- Reason: a change of the text rewrites the prompt cache of the
  conversation. An agent can also keep the first instructions of a session
  until it summarizes the conversation.
- The workspace branch and the target branch can change, by Continue or
  by a new default branch. The instructions keep the branches of the start
  of the session, and
  [the branch line](agent-instructions.md#the-branch-line) names the
  current branches.
- A tool that returns facts that change, such as the pull request state,
  was rejected. It widens what the workspace token allows, and agents still
  need instructions to call it.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  what the token allows.

## How each agent gets them

- Claude and Codex get the same agent instructions, each as its own system
  instructions. Reason: the app offers both agents (decision 19), and each
  agent takes system instructions.
- An agent without system instructions gets the agent instructions at the
  start of its first message.
- Reason: system instructions keep their weight for the whole session,
  also after the agent summarizes a long conversation.
- The agent runner in the sandbox builds the agent instructions.
- These ways were rejected:
  - A block in the first message of each session. A summary of a long
    conversation can shorten or drop it, and it has less weight than
    system instructions.
  - Instruction files in the home folder of the agents. They have less
    weight than system instructions, and Claude must then load the user
    settings.
  - An instruction file in the repository folder. Codex reads one such
    file in each folder, so the file would hide the repository's own agent
    rules.
  - Hooks that add the text at the start of a session and after a summary.
    The agent gives such text the weight of a user message, and each hook
    must skip the resume at each turn.
  - Instructions that the Worker builds and sends with each turn. The text
    of a session would then change with each fact. Each message carries
    only the current branches, for the branch line.
  - Text that a model gateway adds to each model request. No such gateway
    exists yet.
  - Text for Claude only. It leaves out Codex, which also takes system
    instructions.
- A subagent of a Claude agent gets neither the base prompt nor the agent
  instructions. Reason: the agent SDK sets the system instructions of the
  main agent only.
- Risk: such a subagent does not know the rule that keeps the branch name.
