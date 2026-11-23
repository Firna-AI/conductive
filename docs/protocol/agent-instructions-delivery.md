# Agent instructions: how each agent gets them

This doc holds the requirements and the decisions in force for the way
that each agent gets the agent instructions. It belongs to
[Agent instructions](agent-instructions.md), which states what the
instructions hold and gives the terms. A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.

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
    only the current branches and the current repository folder, for the
    branch line and the repository line. Each turn also carries the
    capabilities of its session, for the instructions of a new session.
  - Text that a model gateway adds to each model request. No such gateway
    exists yet.
  - Text for Claude only. It leaves out Codex, which also takes system
    instructions.
- A subagent of a Claude agent gets neither the base prompt nor the agent
  instructions. Reason: the agent SDK sets the system instructions of the
  main agent only.
- Risk: such a subagent does not know the rule that keeps the branch name.
  It does not know the capabilities of its session either. The tool text
  still says when to use each secret call, as
  [The facts of a session](capabilities-agents.md#the-facts-of-a-session)
  says.
