# Agent tools

This doc holds the requirements and the decisions in force for the tools
that the app gives the agents in each sandbox. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Workspace tools

- Every sandbox has two workspace tools: an MCP server and a CLI.
- Both tools let an agent make six calls:
  - create a workspace
  - list the workspaces of the org
  - list the repositories that a create call accepts
  - list the sections of the org
  - list the models of the app
  - ask to run a command on a Mac, as [Mac commands](#mac-commands) says
- Both tools call the Worker with the workspace token of their sandbox.
- With the workspace token, the tools can make only these six calls.
  [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  what the token allows.
- The tools call `api.conductive.build`, the hostname for machines. Its
  gate checks the workspace token in place of a sign-in.
- Create calls and workspace list calls use `/v1/tools/workspaces`.
  [Repository, section, and model lists](#repository-section-and-model-lists)
  gives the routes of the other three lists. Mac command requests use
  `/v1/tools/mac-command` and the addresses under it.
- The app sets no limit of its own on the workspaces that agents create
  (decision 8). The plan limits of the app's Boat account apply, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says.
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
- A create call can also give the new workspace a name. The Worker cleans
  the name with this rule:
  1. It keeps only the first line that has text.
  2. It makes each run of white space one space.
  3. It removes one final full stop, but it keeps an ellipsis.
  4. It cuts a name over 60 Unicode code points at its last space within
     the limit. When the first word is longer than the limit, it cuts the
     name at the limit.
- The answer of the create call holds the stored name.
- A name that is blank after this rule counts as no name. The app then
  shows "Untitled", as
  [Create a workspace](create-a-workspace.md#the-branch-and-the-name)
  says.
- The name does not change the branch. The branch keeps its rule: the
  GitHub login, a city name, and four random characters.
- Reason: a name that sandbox code sends reaches the workspace list of
  every member. A short name on one line keeps each list readable.
- A refusal of a blank or long name was rejected, because the agent then
  gets an error for a name that the rule can clean.
- A workspace list call returns every workspace of the org, with its name,
  its branch, and its state. Reason: every member of the org already sees
  these workspaces.

## Repository, section, and model lists

Three list calls give the repositories, the sections, and the models that
a create call takes, with their IDs.

| List | MCP tool | CLI command | Route |
| --- | --- | --- | --- |
| Repositories | `list_repositories` | `conductive repositories list` | `GET /v1/tools/repositories` |
| Sections | `list_sections` | `conductive sections list` | `GET /v1/tools/sections` |
| Models | `list_models` | `conductive models list` | `GET /v1/tools/models` |

- One call that returns all three lists was rejected, because most create
  calls need only the repository.
- Each list call needs only the workspace token, as the workspace list
  does. It needs no active turn.
- Reason: the calls read data that every member of the org already sees,
  and they start no work.

### Repositories

- The repository list returns exactly the repositories that a create call
  accepts at that time. These are the repositories of the newest good org
  image of the org of the calling workspace.
- A list of the repositories that the org chose was rejected, because a
  chosen repository that no image holds yet fails the create.
- Each entry gives the repository ID that a create call takes, the GitHub
  name, such as `acme/web`, and the default branch.
- Each entry also says whether it is the repository of the calling
  workspace.
- The list is in the order of the GitHub names.
- When the org has no good image, the call fails with HTTP 409
  `image_required`, the same error as a create.
- Reason: an empty list would hide why no create can work.

### Sections

- The section list returns every section of the org of the calling
  workspace, in the order of the sidebar.
- Each entry gives the section ID and the name.
- Each entry also says whether it is the default section, the section that
  a create uses when it names none.

### Models

- The model list returns the models that the app offers, in the order of
  the app's model setting. The model picker of the app offers the same
  models.
- Each entry gives the agent, the model ID, the label, and the efforts of
  the model.
- The answer also gives the default choice. A create uses it for the model
  or the effort that the call does not name.
- The default choice is the saved default of the owner of the calling
  workspace. Without a saved default, it is the default choice of the app.
- The default choice is `null` when the owner has no saved default and the
  app has no valid default choice.
- When the app has no valid model list, the call fails with HTTP 503
  `models_unavailable`, as the app's own model route does.

## Mac commands

An agent can ask to run a command on the Mac of the person who sent its
turn (decision 62). The Mac app on that Mac asks that person first, as
[Mac commands in the Mac app](desktop-commands.md#mac-commands) says.

### Who gets a request

- A request goes only to the Mac of the sender of the turn that asks.
- The agent login belongs to the starter of the session (decision 105). A
  request still goes to the Mac of the sender of the turn. A request to the
  Mac of the workspace owner was rejected, because one member could then ask
  for commands on the Mac of another member.
- A request names its turn. The Worker accepts it only while that turn
  runs in the calling workspace.
- [The workspace token](tokens-and-secrets.md#the-workspace-token) states
  how the Worker finds the sender.
- When the sender has no available Mac, the agent gets the answer that the
  Mac is not available.
- Risk: every process in the sandbox can ask in the name of a turn that
  runs now. So a member with a terminal in the same sandbox can ask for a
  command on the Mac of that sender. The Mac still asks first, unless a
  saved choice covers the command.

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
  saved there.

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
  requests waits.
- After its result, the command shows at its place in the chat: denied,
  done with its output, or Mac not available.
- When its turn ends, the result folds with the work of the turn, at its
  place, as [The work of a turn](chat-and-events.md#the-work-of-a-turn)
  says (decision 151). A result that stays in view between two folds was
  rejected, because the work then does not fold into one line.

## Computer tools

- The agents keep Boat's computer tools: the MCP server `computer` that
  every sandbox has (decision 36).
- The agent runner gives these tools to the agents.
- The agents use the computer tools for browser work on the desktop of the
  sandbox.
- The Desktop tab of the workspace shows the same desktop, so the user can
  watch the agent work.
