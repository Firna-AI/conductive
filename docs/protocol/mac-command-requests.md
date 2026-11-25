# Mac command requests

This doc holds the requirements and the decisions in force for the
requests of agents to run a command on a Mac. It covers who gets a
request, the request, its results, who answers it, and what the chat
shows. It belongs to [Agent tools](agent-tools.md), which lists the calls
of the workspace tools.
[Mac commands in the Mac app](desktop-commands.md#mac-commands) states the
side of the Mac app. [Mac access](mac-access.md) states the Mac access
switch and its grants. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A Mac access decision names a decision of the change that makes
[Mac access](mac-access.md) allow all commands, as that doc says.

## Mac commands

An agent can ask to run a command on the Mac of the person who sent its
turn (decision 62). The Mac app on that Mac asks that person first, unless
a choice of that person covers the command, as
[Mac commands in the Mac app](desktop-commands.md#mac-commands) says.

## Who gets a request

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

## The request

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

## Results

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

## Who answers

- Only the Mac app on the Mac that got the request can answer it.
- Reason: the person at that Mac decides what runs on it. A browser or
  another Mac cannot allow a command there.
- The web app in a browser and the Mac app on any other Mac show the
  request without choices.
- The Worker never allows a command by itself. The Mac app on that Mac
  decides, from the answer of its user or from a choice that its user
  made there, as [The choices](desktop-commands.md#the-choices) says.

## What the chat shows

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
