# Service calls

This page belongs to [Services](services.md). It states the five service
calls of the workspace tools: Start, with its wait for a port, Stop,
Restart, List, and Logs. The terms are those of
[Services](services.md#terms) and of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A services decision number names a decision of the change that adds
services, as [Services](services.md) says.

## The calls

- The [workspace tools](agent-tools.md#workspace-tools) give five service
  calls: Start, List, Stop, Restart, and Logs (services decision 19 A).
  The CLI and the MCP server both give each call.
- The CLI commands have the form `conductive services <verb>`. For
  example, `conductive services start --name web -- npm run dev` starts
  the service `web`.
- A service call acts only on the services of its own cloud computer. It
  calls no Worker route. It needs no workspace token and no active turn.
- Each process of the sandbox user can make the service calls, also a
  command in a terminal.
- Reason: an agent and a member with a terminal can already control each
  process of the cloud computer, because they run as the same user.
- Calls for the services of another workspace were not chosen for the
  first release (services decision 19 A). Reason: they need routes of the
  Worker and checks of their reach.
- A local result can give the full command and the folder of a service. It
  gives no environment value.
- Reason: a result reaches the chat and the model provider as the output
  of a tool. The filters of the app hide only exact copies of secret
  values.

## Start

- Start takes a name, a command, and optional explicit values. The service
  runs the command in the current folder of the call.
- The service runs as the sandbox user, the user of the agents and the
  terminals. The app runs no part of the command as root.
- When no service has the name, or its service does not run, Start starts
  a new run with the definition of the call (services decision 19 A). That
  definition replaces the saved one.
- When the service of the exact name runs, Start changes nothing. Its
  result says that the service already runs, and it gives the command of
  that run. So the caller sees a changed command.
- Reason: a repeated Start then ends no server of another member, and it
  starts no second copy on another port.
- A Start that replaces the running service was rejected, because it can
  end the server of another member with no warning. A refusal of a running
  name was rejected, because it adds a refusal.

## The wait for a port

- By default, Start returns when the run starts (services decision 19 A).
- Start can also wait for a port of the service: the port that the call
  names, or else the first port that the service owns. A port belongs to a
  service only when a process of that service listens on it, as
  [Ports of services](listening-ports.md#ports-of-services) says.
- The wait lasts at most 30 seconds. The call has no input for another
  time.
- The wait ends when the port listens, when the run ends, or after 30
  seconds. The result gives the ports of the service, or the result of the
  end of the run.
- After 30 seconds, the service keeps running. The result says that the
  port is not confirmed.
- Reason: the limit keeps a turn from a long wait for a server that never
  listens. A port of another process does not prove that the service is
  ready.
- A wait with no limit, a time that the caller sets, and a check command
  of the caller were not chosen for the first release.

## Stop, Restart, List, and Logs

- Stop ends the run of a service: its process and each process that it
  started (services decision 19 A). The service then shows Stopped. A Stop
  of a service that does not run changes nothing.
- Restart ends the run of a running service in the same way. It then
  starts a new run with the saved definition (services decision 19 A).
- Restart also starts a service that is stopped, ended, or failed, with
  its saved definition. Restart takes no new command.
- So a Restart after a [repository change](repository-change.md) runs the
  service in its saved folder. To move the service, a member or an agent
  stops it, then starts it from the new folder.
- List gives each service of the cloud computer, with its state, the
  result of its last run, and its ports.
- Logs gives the output of a service from its log, as
  [The log](services.md#the-log) says.
