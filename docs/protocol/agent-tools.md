# Agent tools

This doc holds the requirements and the decisions in force for the tools
that the app gives the agents in each sandbox. It covers the workspace
tools as a whole, Mac commands, and the computer tools. Linked pages state
the calls of the workspace tools:

- [Agent tool access](agent-tool-access.md): what each call reaches, which
  calls need an active turn, and the rights of the sender.
- [Workspace calls](workspace-calls.md): the create call, the workspace
  list, and the calls of one workspace.
- [Repository, section, and model lists](create-call-lists.md): the lists
  that a create call takes.
- [Session calls](session-calls.md),
  [Session management](session-management.md), and
  [Session watches](session-watches.md): the calls of sessions and messages.
- [Section and preview calls](section-and-preview-calls.md): the calls of
  the sections and of the port previews.
- [Secret requests](secret-requests.md): the calls that list the secrets
  of the org and run a command with secrets.
- [Names from the workspace tools](tool-names.md): the rule for each name
  and title that a call gives.
- [Mac command requests](mac-command-requests.md): the requests of agents
  to run a command on a Mac, their results, and what the chat shows.

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An e2b decision number names a
decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says.

## Workspace tools

- Every sandbox has two workspace tools: an MCP server and a CLI.
- Both tools give each call. Reason: the two tools stay equal.
- The tools have 28 calls of the Worker:
  - 10 workspace calls: create, list, get, rename, move, and archive a
    workspace, change its target branch, and list the repositories, the
    sections, and the models that a create call takes
  - 10 session calls: list, read, get, start, rename, close, stop, and
    watch a session, send a message, and get a message
  - 5 section and preview calls: create and delete a section, and list,
    open, and close the previews of a workspace
  - 2 secret calls: list the secrets of the org, and run a command with
    secrets, as [Secret requests](secret-requests.md) says
  - 1 call that asks to run a command on a Mac, as
    [Mac command requests](mac-command-requests.md) says
- A change of the target branch can also change the base of an open pull
  request on GitHub. It uses the GitHub token of the sender, as
  [Change the target branch](workspace-management.md#change-the-target-branch)
  says.
- The tools also have 5 service calls: start, list, stop, and restart a
  service, and read its log. They act only on the cloud computer of the
  tools, and they call no Worker route, as
  [Service calls](service-calls.md) says.
- The calls cover each command of Conductor's CLI whose feature Conductive
  has (decision 277). Reason: an agent can then manage the work that it
  hands out.
- Calls for automations and for the env vars of one workspace were left out
  (decision 277). Reason: Conductor's CLI refuses the workspace token for
  its automation commands, so its agents cannot use them either. Conductive
  has no env vars for one workspace.
- Fast mode has no call of its own. Each call that takes a model also takes
  fast mode, as Conductor's CLI takes it beside the model and the effort.
  [Fast mode](fast-mode.md#agent-tools) gives the rules.
- Both tools call the Worker with the workspace token of their sandbox.
- With the workspace token, the tools can make only these calls.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  what the token allows.
- For each refusal of the Worker, both tools give the agent its error code
  and its message. Reason: an agent can act on a refusal, such as a closed
  session.
- An input of the wrong form, such as a word where a call takes a number,
  gets HTTP 400 with the error code `invalid_input`.
- The tools call `api.conductive.build`, the hostname for machines. Its
  gate checks the workspace token in place of a sign-in.
- Each call has a fixed route of its own under `/v1/tools/`. The table of
  each linked page gives the routes. Mac command requests use
  `/v1/tools/mac-command` and the addresses under it. The secret calls use
  routes under `/v1/tools/secrets`. Reason: the token gate of the machine
  host keeps one list of routes.
- The CLI takes the text of a message from a file, or from stdin with `-`,
  for each call that takes a message. Reason: Conductor's CLI takes a
  message file. The MCP server takes the text only.
- The workspace tools are a part of the sandbox software. A build of the
  org image installs the newest tools. A cloud computer gets newer tools
  with each update, as [Updates](sandbox-software.md#updates) says.
- Older tools keep working with the Worker until their update applies.
  They offer only their own calls.
- The app sets no limit of its own on the workspaces that agents create
  (decision 8). The plan limits of the provider account of the org apply,
  as [The provider](workspaces-and-sandboxes.md#the-provider) says.
  [No limit](session-calls.md#no-limit) states the same for sessions.
- A workspace that an agent creates starts with no approval step in the
  app.

## Names of the calls

- Each MCP tool has a verb and a noun, such as `archive_workspace`. Each
  CLI command has the form `conductive <nouns> <verb>`, such as
  `conductive workspaces archive` (decision 278).
- Conductor's command names were rejected for the CLI, for the MCP tools,
  and as aliases. A second program with Conductor's commands was rejected
  too. Reason: agents learn the tools from their descriptions and help, so
  names matter little.

## Tool descriptions

- The help of the CLI and the descriptions of the MCP tools say these
  things:
  - which calls need an active turn
  - that the calls reach each workspace of the org
  - that a write acts with the rights of the sender in the app, so only the
    workspace owner or an admin can archive a workspace
  - which links each reply gives
  - when to use the secret calls and the Mac command call, whose Mac gets
    a Mac command, and when the Mac app asks first, as
    [The facts of a session](capabilities-agents.md#the-facts-of-a-session)
    says
- [Tool descriptions](session-calls.md#tool-descriptions) states the
  other text of the session calls.
  [Run a command with secrets](secret-requests.md#run-a-command-with-secrets)
  states the text of the secret calls.
  [Agent guidance](services.md#agent-guidance) states the text of the
  service calls.

## Create and list calls

[Create a workspace](workspace-calls.md#create-a-workspace) and
[List the workspaces](workspace-calls.md#list-the-workspaces) state the
create call and the workspace list.

## Repository, section, and model lists

[Repository, section, and model lists](create-call-lists.md) states the
three lists that a create call takes.

## Mac commands

[Mac command requests](mac-command-requests.md) states the requests of
agents to run a command on the Mac of the sender of their turn. It covers
who gets a request, the request, its results, and who answers it.

### What the chat shows

[What the chat shows](mac-command-requests.md#what-the-chat-shows) states
where a waiting request and its result show in the chat.

## Computer tools

- On Boat, the agents keep Boat's computer tools: the MCP server
  `computer` that every Boat sandbox has (decision 36).
- On E2B, the agents get the same computer tools (e2b decision 216, changed
  to B on 19 November 2026). The E2B template installs the Cua Driver and
  registers it as the MCP server `computer`. The tools act on display `:0`,
  with Chrome, as on Boat.
- An E2B org image has the tools only when it comes from a template build
  that has them. Until then, its agents keep the workspace tools only.
- The agent runner gives the computer tools to the agents when the
  sandbox has them.
- The agents use the computer tools for browser work on the desktop of the
  sandbox.
- The Desktop tool can show the same desktop, so the user can watch the
  agent work. The app hides it for now, as
  [Desktop](workspace-tools.md#desktop) says.
