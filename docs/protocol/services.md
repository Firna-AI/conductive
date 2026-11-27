# Services

This doc holds the requirements and the decisions in force for services.
A service is a named program that the cloud computer of a workspace runs
outside every agent turn. This doc covers the lifetime of a service, its
name and its runs, the states and the results, the environment, a memory
kill, the log, activity, the guidance for agents, and the risks that stay.
[Service calls](service-calls.md) covers the calls of the workspace tools
that start, list, stop, and restart services, and read their logs.
[Services in the app](services-in-the-app.md) covers the services of the
Preview tool, their access, Stop and Restart, and the log view.
[Service reports](service-reports.md) covers the messages between the
runner, the Worker, and the app, and older software. This doc belongs to
[Agent runner](agent-runner.md). The terms are those of the
[architecture doc](../architecture.md#terms) and the terms below. A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A services
decision number, such as services decision 19, names a decision of the
change that adds services. The
[mockup catalogue](../mockups/catalogue-workspace-tools.md) draws the
services at `app/tools/services` and its child pages.

## Terms

- **Service:** a named program that the cloud computer runs in a system
  unit of its own, outside every agent turn and outside the unit of the
  agent runner.
- **Definition:** the command, the folder, and the explicit values of a
  service.
- **Explicit value:** an environment variable, with its value, that the
  Start of a service names.
- **Run:** one start of a service, until the end of its process.
- **Generation:** the identity of one run. Each new run gets a new
  generation.
- **Ordinary agent command:** a process that an agent starts under the
  agent runner, not as a service.
- **Temporary check server:** a server that an agent starts only to check
  its own work, and ends before its reply.

## Lifetime

- A service runs outside every agent turn (services decision 1 B). The end
  of a turn, Stop in the chat, and the end of the wait of a Claude turn end
  no service.
- Reason: a member needs some servers after the agent replies. A tracked
  background server holds a Claude turn open, and a detached process has
  no controls in the app.
- Guidance alone, with detached processes, was rejected (services decision
  1). Such a process has no Stop in the app, and it ends at a Restart of
  the software.
- A service runs in a system unit of its own, outside the unit of the agent
  runner. So a crash, a restart, an update, and a move of the runner end no
  service. [Restart](restart-the-software.md#restart) in the workspace
  header ends no service either.
- A service runs until a Stop, the end of its own process, or the stop of
  the cloud computer.
- A stop of the cloud computer ends each service, with its definition, its
  log, and its record (services decision 19 A). Each kind of stop does
  this, such as the idle stop, Archive, and a suspension.
- A resume starts no service. A new run of the cloud computer starts with
  no services. A member or an agent starts each service that they need
  again.
- A restore of services after a resume was not chosen for the first
  release (services decision 19 A). Reason: it needs protected saved
  definitions, and a start after the normal startup.
- A service never starts again by itself (services decision 19 A). After
  its run ends, it keeps its state and its result until a Start or a
  Restart.
- Reason: an automatic retry hides a failure, and it can run a broken
  command again and again.
- No call and no control removes a service (services decision 19 A). Its
  record stays until the stop of the cloud computer. A Start reuses its
  name.
- Reason: the record keeps the result and the log of the last run for a
  diagnosis. The first release leaves out a Remove control.

## Names and runs

- One exact name names at most one service of a workspace. The match of a
  name is exact, with case and white space.
- The app adds no pattern and no length limit to a name, and no limit to
  the count of services (services decision 19 A).
- Reason: a project can need several servers, and each service has a Stop.
  A limit of 10 running services, a setting for that limit, and a warning
  above 10 services were not chosen.
- Each run of a service has a new generation. Each control of the app
  names the generation that the app saw, as
  [Stop and Restart](services-in-the-app.md#stop-and-restart) says.

## The service calls

[Service calls](service-calls.md) gives the five calls of the workspace
tools that start, list, stop, and restart services, and read their logs.

## States and results

- A service has one of four states (services decision 19 A):
  - **Running:** its run started and has not ended.
  - **Stopped:** a Stop ended its run.
  - **Ended:** its process ended with exit code 0, with no Stop.
  - **Failed:** its run ended in another way, with no Stop: another exit
    code, a signal, a memory kill, or a command that could not start.
- A service that is not running gives the result of its last run: its exit
  code, the signal that ended it, Out of memory, or that its command could
  not start.
- A service also gives the time when its run started, or when it ended.
- Reason: a member and an agent can see why a server is gone, also after
  its output has left the log.

## The environment

- A run gets a clean environment (services decision 19 A). It holds these
  values:
  - the [env vars of the org](workspaces-and-sandboxes.md#startup-script-and-env-vars),
    as the cloud computer got them at its current start
  - the [repository folder variables](repository-folders.md#folder-variables)
    from the workspace's current record
  - the explicit values of its definition
  - the base variables of a program of the sandbox user, such as `HOME`
    and `PATH`
- The run takes nothing from the environment of the caller. So it gets no
  credential of the app, such as the workspace token or a turn token. It
  gets no value of a turn, such as the turn ID or the commit author of a
  turn. It gets no value of a
  [run with secrets](secrets.md#how-an-agent-uses-a-secret).
- Reason: a server gets the normal settings of the org, and the values of
  a run with secrets stay in the command of that run.
- A Start inside a run with secrets is not refused. Its service still gets
  no value of that run, because its environment never comes from the
  caller.
- A Restart uses the same explicit values. The env vars of the org change
  only at the next start of the cloud computer.
- These ways were not chosen (services decision 19 A):
  - A fixed environment with no explicit values. A server then gets no
    env var of the org and no value of its own.
  - Only explicit values, with a refusal of each Start inside a run with
    secrets. It adds refusals, and servers need the env vars of the org.
  - An approval of a member for each secret that a service keeps. It needs
    its own rules of approval and of lifetime.
- An inherited environment without the known token names was rejected.
  Such a filter cannot find an approved secret with a name of the project.
- Risk: a caller can copy a value of a run with secrets into an explicit
  value. The service then keeps that value until the stop of the cloud
  computer.

## Out of memory

- An out-of-memory kill of a process of a service stops the whole service
  (services decision 19 A). The service then shows Failed, with the result
  Out of memory.
- Reason: a server with a missing process can seem to run while it is
  broken. The stop also lets the other processes of the service end in
  order.
- This is the one exception to [Out of memory](agent-runner.md#out-of-memory).
  An ordinary agent command and a command in a terminal keep their rule:
  such a kill ends only that process.
- A memory limit for each service, and a change of the process that the
  kernel ends first, were not chosen for the first release (services
  decision 19 A). Reason: no safe limit is chosen yet. A changed choice of
  the kernel can end the server of a member during a large build of an
  agent.

## The log

- The cloud computer keeps one log for each service. The log holds the
  standard output and the standard error of the service.
- The log of a service holds at most 10 MiB, or 10,485,760 bytes, in total
  (services decision 19 A). When the log is full, its oldest output goes
  first.
- The log uses the memory of the cloud computer, not its disk. So no saved
  disk and no snapshot holds it.
- Reason: output can hold a secret, and a saved disk keeps each file.
- A restart of the agent runner loses no output of a service. Reason: the
  unit of the service writes its log, so a restart of the runner breaks no
  output pipe.
- Logs reads the log on the cloud computer. The app reads at most 200
  lines and 64 KiB of it, after the secret filters, as
  [The log view](services-in-the-app.md#the-log-view) says.
- Risk: each log can use up to 10 MiB of memory, and the count of services
  has no limit.

## Activity

- A service is never activity under the rule of
  [Stop and resume](stop-and-resume.md#the-stop) (services decision 1 B).
  Its processes, their output, their ports and their sockets add no
  activity. The service calls, a wait for a port, the reports, and each
  read of a log add none either.
- The input of a member in the app keeps its own rule, as for each other
  input.
- So a service never keeps the cloud computer running, and it never delays
  the idle stop. The stop time stays the time that the operator sets.
- A service is not live work of a Claude turn, so it holds no turn open, as
  [Background work](background-work.md#background-work) says.
- Reason: a forgotten server must not keep a cloud computer running. Cal
  checked this rule before he chose services decision 1 B.
- The rules of the idle stop, of activity, of background work, and of the
  time limits of turns stay as their docs say.

## Agent guidance

- The [agent instructions](agent-instructions.md#what-the-instructions-hold)
  give a section about services. It says these things:
  - The agent ends each temporary check server before its reply. A Claude
    agent runs such a server as tracked background work. A Codex agent
    keeps the process ID of the server, and ends that process.
  - The agent starts a server that a member needs after the reply as a
    service.
  - The agent tells the member the name and the port of such a service. It
    says that the service runs until the cloud computer stops, and that the
    use of its preview adds no awake time.
  - Builds, tests, and waits for checks that must finish stay in the turn
    of the agent.
- [The note](background-work.md#the-note) of a Claude turn gives the same
  server guidance.
- The help of the CLI and the descriptions of the MCP tools say that the
  service calls act only on this cloud computer. They say that a service
  runs outside every turn until a Stop or the stop of the cloud computer,
  and that it never keeps the cloud computer running.
- Reason: a temporary check server that keeps running holds a Claude turn
  open. A server that a member needs after the reply must not end with
  the turn.

## Risks that stay

- A service runs as the same user as the agents, the terminals, and each
  other program of the cloud computer. Its clean environment is no
  isolation (services decision 19 A).
- Its code can read each file and each credential that such a program can
  read. Examples are the workspace token, the turn token of a later turn,
  and the value of a secret while a command runs with it.
  [Turn tokens in a sandbox](version-pins.md#turn-tokens-in-a-sandbox) and
  [What the workspace tools reach](isolation.md#what-the-workspace-tools-reach)
  give these risks.
- A service lives longer than a turn. So its code can read the credentials
  of each later turn, also of the sessions of other members.
- The sandbox user can run a command as root with `sudo`, with no
  password. So the code of a service can do this too.
- Each process of the sandbox user can make the service calls. So code in
  the cloud computer can start, stop, and restart a service, and read its
  log.
- The source of a service in the app is context, not proof of the person
  who started it, as [The source](services-in-the-app.md#the-source) says.
