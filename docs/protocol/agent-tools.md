# Agent tools

This doc holds the requirements and the decisions in force for the tools
that the app gives the agents in each sandbox. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Workspace tools

- Every sandbox has two workspace tools: an MCP server and a CLI.
- Both tools let an agent create workspaces and list workspaces.
- Both tools call the Worker with the workspace token of their sandbox.
- With the workspace token, the tools can create and list workspaces, and
  nothing else.
- The tools call the hostname for machines. Its gate checks the workspace
  token in place of a sign-in.
- The app sets no limit of its own on the workspaces that agents create
  (decision 8). The plan limits of the org's Boat account apply.
- A workspace that an agent creates starts with no approval step in the
  app.

## Create and list calls

- A create call takes a repository of the same org and a first message
  (decision 52).
- A create call can also choose the model, and with it the agent. It can
  also choose the effort and the section.
- The new workspace gets the org and the workspace owner of the calling
  workspace.
- Without a choice in the call, the new workspace gets the default section
  and the default model of its workspace owner.
- The agent of the new workspace starts on the first message at once.
- A list call returns every workspace of the org, with its name, its
  branch, and its state. Reason: every member of the org already sees
  these workspaces.

## Computer tools

- The agents keep Boat's computer tools: the MCP server `computer` that
  every sandbox has (decision 36).
- The agent runner gives these tools to the agents.
- The agents use the computer tools for browser work on the desktop of the
  sandbox.
- The Desktop tab of the workspace shows the same desktop, so the user can
  watch the agent work.
