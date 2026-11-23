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

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An e2b decision number names a
decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says. A Mac access decision names a decision of the change that makes
[Mac access](mac-access.md) allow all commands, as that doc says.

## Workspace tools

- Every sandbox has two workspace tools: an MCP server and a CLI.
- Both tools give each call. Reason: the two tools stay equal.
- The tools have 27 calls of the Worker:
  - 9 workspace calls: create, list, get, rename, move, and archive a
    workspace, and list the repositories, the sections, and the models
    that a create call takes
  - 10 session calls: list, read, get, start, rename, close, stop, and
    watch a session, send a message, and get a message
  - 5 section and preview calls: create and delete a section, and list,
    open, and close the previews of a workspace
  - 2 secret calls: list the secrets of the org, and run a command with
    secrets, as [Secret requests](secret-requests.md) says
  - 1 call that asks to run a command on a Mac, as
    [Mac commands](#mac-commands) says
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

An agent can ask to run a command on the Mac of the person who sent its
turn (decision 62). The Mac app on that Mac asks that person first, unless
a choice of that person covers the command, as
[Mac commands in the Mac app](desktop-commands.md#mac-commands) says.

### Who gets a request

- A request goes only to the Mac of the sender of the turn that asks.
- The turn runs on the login of its session, which can belong to the
  starter or to the org (decision 105). A request still goes to the Mac of
  the sender of the turn. A request to the Mac of the workspace owner was
  rejected, because one member could then ask for commands on the Mac of
  another member.
- The first turn of a workspace that a create call made has the sender of
  the calling turn. So does each new turn that a message of the
  [session calls](session-calls.md#the-sender) starts. The requests of
  such a turn go to the Mac of that member.
- A message of the session calls that joins a running turn keeps the
  stored sender of that turn.
- A request names its turn. The Worker accepts it only while that turn
  runs in the calling workspace.
- [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  how the Worker finds the sender.
- When the sender has no available Mac, the agent gets the answer that the
  Mac is not available.
- The agents of each workspace can ask, also in a new workspace and in an
  automation run (Mac access decision 7). The Worker refuses no request
  because of Mac access, as
  [Agents can always ask](mac-access.md#agents-can-always-ask) says.
- Risk: every process in the sandbox can ask in the name of a turn that
  runs now. So a member with a terminal in the same sandbox can ask for a
  command on the Mac of that sender. The Mac still asks first, unless
  Always allow or a grant covers the command. In the Mac app, the Mac
  access switch starts such a grant (Mac access decision 1 C).
  [Risks](mac-access.md#risks) states what such a grant allows.

### The request

- A request gives the exact command, the folder where it runs, the
  reason, and the time limit (decision 62).
- The workspace and the sender that a request shows come from the records
  of the Worker, never from the request.
- A request can have a stable ID for retries. The Worker keeps that ID
  exact. Each record also gives a key for its read and approval addresses.
- Reason: an ID such as `.` or `..` can change the meaning of a URL path.
- A request without a time limit gets 60 seconds.
- A time limit can be at most 120 seconds. A longer limit, up to 30
  minutes, needs a reason for the longer limit.
- Reason: the user sees why a command needs more time before they allow
  it. Conductor's tool does the same.
- Each request body of Mac commands, from the agent tools or from the Mac
  app, can contain at most 1,000,000 bytes, which is 1 MB (decision 65).
  The Worker stops reading a larger body and returns HTTP 413.
- Each message on the device connection has the same limit.

### Results

- Each request ends with one result for the agent: the command ran, the
  user denied it, or the Mac is not available.
- A request that the Worker refused while the Mac access of its workspace
  was off keeps that result, with its reason. No new request gets it.
- After a run, the agent gets the output of the command and how it ended:
  its exit code, the end of its time limit, or a failure to start.
- The command stops at its time limit.
- The output that returns to the agent has a size limit. When the output
  passes that limit, the result says that the output was cut.
- When the Mac stops being available while a request waits or runs, the
  request ends as not available.
- When its turn ends, a request that waits or runs ends too, and its
  command stops. Its result says that the turn ended. It does not say that
  the Mac is not available.

### Who answers

- Only the Mac app on the Mac that got the request can answer it.
- Reason: the person at that Mac decides what runs on it. A browser or
  another Mac cannot allow a command there.
- The web app in a browser and the Mac app on any other Mac show the
  request without choices.
- The Worker never allows a command by itself. The Mac app on that Mac
  decides, from the answer of its user or from a choice that its user
  made there, as [The choices](desktop-commands.md#the-choices) says.

### What the chat shows

- While a request waits, it shows as a compact message just above the
  composer of its session (decision 62). The message shows the exact
  command, the Mac, and the time limit as a small label.
- Details opens the folder, the reason, the workspace, and the sender.
- A longer time limit shows its reason without a click.
- The user can scroll through long commands and all waiting requests with
  the keyboard. The composer stays reachable, and the Allow menu stays
  visible outside the region that scrolls.
- While a request waits, its workspace shows needs input, as
  [Workspace states](workspace-life.md#workspace-states) says
  (decision 68). The workspace keeps needs input while any of its
  requests waits. Starting shows over needs input. When Starting ends and
  the agent runner is ready, needs input shows again while a request
  waits, as [Secret requests](secret-requests.md#the-request) says.
- After its result, the command shows at its place in the chat: denied,
  done with its output, or Mac not available. A request that kept the
  result Mac access off shows it with its reason.
- The [requests of secrets](secret-requests.md#the-request) wait in the
  same place above the composer.
- When its turn ends, the result folds with the work of the turn, at its
  place, as [The work of a turn](chat-and-events.md#the-work-of-a-turn)
  says (decision 151). A result that stays in view between two folds was
  rejected, because the work then does not fold into one line.

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
