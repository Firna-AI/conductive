# Host connection

This doc holds the requirements and the decisions in force for the host
connection: the one connection that each machine opens to the Worker for
the work of the Worker on that machine. It covers the host mode of the
program `conductive`, the machine token, the operations, the streams, the
version, and the bootstrap. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md).
[The migration job](host-connection-migration.md) belongs to this doc. It
holds the job that brings each machine onto the host connection when the
change deploys. [Own computers](own-computers.md) holds the own computers
and their computer connection. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An own computer decision number, such as own computer decision 1,
names the dated record of one decision of the change that adds own
computers and the host connection. Its plan keeps these records while the
change is open. Its pull request keeps them after the merge.

## One connection for each machine

- Each machine runs the program `conductive` in host mode as a system
  service (own computer decision 1 D). The docs call this mode the host
  program. Each sandbox on Boat or E2B runs it. So does each container on
  an own computer, and the machine of each build, refresh, and software
  image build.
- The Worker does its work on a machine only over the host connection of
  that machine. This work is the commands, the file reads, the terminal,
  and the previews.
- Reason: every computer then has one path. A new feature needs one
  version and one set of tests, and a new provider needs only to run a
  Linux machine.
- A host connection for own computers only, with the provider API for the
  work on each cloud computer, was rejected (own computer decision 1).
  Reason: each feature then needs two versions.
- The provider API keeps only the life of each machine: create, get, stop,
  resume, delete, the automatic stop, and saved snapshots. Three more
  provider calls stay: the [bootstrap](#the-bootstrap), the env write of a
  resume on E2B, and the desktop of a sandbox on Boat.
- The host program opens one outbound WebSocket to `/v1/host` on
  `api.conductive.build`, the hostname for machines. It proves itself with
  the [machine token](#the-machine-token) of its machine.
- Reason: the agent runner and the Mac app connect in the same way, so the
  machine needs no open port.
- The connection ends in the machine object, the Durable Object of that
  machine. The workspace object and the build jobs reach the machine only
  through it. Reason: a build machine has no workspace object.
- The host connection is separate from the runner connection. The runner
  connection stays as [The agent runner](agent-runner.md#the-agent-runner)
  says. Reason: the runner protocol then stays the same, so older runners
  keep working.
- The host program connects again after each drop, as the runner does.

## The machine token

- Each machine gets a new random machine token at each create and at each
  resume, in its env, as it gets the workspace token. This also holds for
  a start that gets no other secret, such as the restart near day 14 of
  an archived sandbox.
- The Worker keeps only a digest of the token.
- A machine token works only for the host connection of its own machine.
  The gate of `api.conductive.build` accepts it only on `/v1/host`.
- A machine token stops working when its machine gets a new token, and
  at each stop of its machine (own computer decision 11 B). So the token
  of a brief start of the
  [migration job](host-connection-migration.md#brief-starts) also stops at
  its stop.
- A new host connection with the token replaces the open one, as for the
  runner. Reason: a reconnect after a silent drop must not wait for the
  old connection to time out.
- Reason: a copy of the token then works only during one run of its
  machine. A refusal of a second connection was rejected, because it
  delays each reconnect.
- No log, start step, saved snapshot, or reply to a browser holds a
  machine token. The runner and the start log hide it, as they hide the
  workspace token.
- Risk: each process in the machine can read its machine token, as it can
  read the workspace token. With a copy, a program outside the machine can
  open the host connection of that machine until the machine stops or
  gets a new token.

## Operations

- The host connection carries only fixed operations of the Worker:
  - run a command
  - start a command
  - read the status of a started command
  - read the metadata of a file
  - read a file
  - open a [stream](#streams) to a local port
- The host connection has no general pass-through. Reason: the Worker then
  calls only fixed operations on each machine, as it calls only fixed
  routes of each provider.
- Before each operation, the Worker checks in its own records that the
  machine belongs to a workspace or a build of the org of the request, as
  [Orgs and workspaces](isolation.md#orgs-and-workspaces) says.
- The replies of the host connection have the size limits of the provider
  replies of [Orgs and workspaces](isolation.md#orgs-and-workspaces). A
  command reply above its limit fails in the same way.
- A started command keeps running when the host connection drops. The
  Worker reads its status after the host program connects again.

## Streams

- A stream connects the Worker to one local port of the machine. It
  reaches only a port of a fixed list: the port of the terminal service,
  and the port of the preview relay.
- Each terminal socket reaches its shell through a stream to the terminal
  port. Each preview request reaches the preview relay through a stream to
  the relay port. The [file server](file-server.md) gets its requests only
  through the relay.
- The Worker opens a stream only after the checks of the terminal or of
  the preview, as
  [Terminal, previews, and desktop](terminal-previews-and-desktop.md)
  says.
- No stream needs a port address or a port credential of a provider.
- The streams of the terminal and of the previews go through the machine
  object.
- A drop of the host connection ends each open stream. A terminal then
  connects again once by itself, as after any other drop, as
  [The shell](terminal-shell.md#the-shell) says. Its shell keeps running.

## The version

- The host connection carries a host protocol version, from its first
  release. It is separate from the runner protocol version.
- The Worker records the host protocol version of each machine at each
  connection.
- The Worker serves only the current host protocol version. A machine that
  connects with an older version gets the [bootstrap](#the-bootstrap).
  The Worker refuses a connection of any other version before any
  operation.
- Reason: the Worker then needs no code for an older host version, and the
  bootstrap brings each older machine to the current version.

## The bootstrap

- When a machine does not open the host connection in time at a start,
  the Worker runs the bootstrap (own computer decision 7 D). The bootstrap
  is one fixed provider command. It installs the release of the Worker and
  starts the host program.
- The bootstrap runs at each kind of start: a create, a resume, the restart
  near day 14 of a stop, a build, a refresh, and a software image build.
  This includes the first start after the lift of a suspension.
- The Worker also runs the bootstrap for a machine that connects with an
  older host protocol version.
- Reason: a machine without the current host program can get no other
  work. Such a machine can be a stopped machine that resumes with older
  software, a machine from an org image of before the change, or the
  machine of a build from a base image.
- The release of the Worker is the release that the deploy of the running
  Worker published. The Worker knows its version and its digest.
- Reason: during a deploy, the newest release of the release address can
  still be the previous release.
- The Worker checks the [signature](sandbox-software.md#releases) of that
  release before it gives its digest to the command. Reason: an older
  program checks no signature.
- The command holds no secret.
- A start that runs the bootstrap waits for the download of the release.
  The wait counts toward the time limit of the start. When the download
  fails, the start fails as after any other error.
- An install of the bootstrap stays across a stop. The next start of the
  runner starts that release. That start never counts the install as a
  failed start only because no runner confirmed it before the stop.
- The bootstrap never brings back a runner below protocol version 2, also
  when a later start returns to the previous release.
  [Runner versions](version-pins.md#runner-versions) states that version.
- The provider command of the bootstrap stays for good. Reason: a build
  from a base image always needs it.
