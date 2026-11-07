# Agent tools

This doc holds the requirements and the decisions in force for the tools
that the app gives the agents in each sandbox. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Workspace tools

- Every sandbox has two workspace tools: an MCP server and a CLI.
- Both tools let an agent create workspaces, list workspaces, and ask to
  run a command on a Mac, as [Mac commands](#mac-commands) says.
- Both tools call the Worker with the workspace token of their sandbox.
- With the workspace token, the tools can make only these three calls.
  [The workspace token](access-and-security.md#the-workspace-token) states
  what the token allows.
- The tools call `api.conductive.build`, the hostname for machines. Its
  gate checks the workspace token in place of a sign-in.
- Create and list calls use `/v1/tools/workspaces`. Mac command requests
  use `/v1/tools/mac-command` and the addresses under it.
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
- A list call returns every workspace of the org, with its name, its
  branch, and its state. Reason: every member of the org already sees
  these workspaces.

## Mac commands

An agent can ask to run a command on the Mac of the person who sent its
turn (decision 62). The Mac app on that Mac asks that person first, as
[Mac commands in the Mac app](desktop-app.md#mac-commands) says.

### Who gets a request

- A request goes only to the Mac of the sender of the turn that asks.
- The agent login belongs to the starter of the session (decision 105). A
  request still goes to the Mac of the sender of the turn. A request to the
  Mac of the workspace owner was rejected, because one member could then ask
  for commands on the Mac of another member.
- A request names its turn. The Worker accepts it only while that turn
  runs in the calling workspace.
- [The workspace token](access-and-security.md#the-workspace-token) states
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
  [Workspace states](workspaces-and-sandboxes.md#workspace-states) says
  (decision 68). The workspace keeps needs input while any of its
  requests waits.
- After its result, the command shows at its place in the chat: denied,
  done with its output, or Mac not available.

## Computer tools

- The agents keep Boat's computer tools: the MCP server `computer` that
  every sandbox has (decision 36).
- The agent runner gives these tools to the agents.
- The agents use the computer tools for browser work on the desktop of the
  sandbox.
- The Desktop tab of the workspace shows the same desktop, so the user can
  watch the agent work.
