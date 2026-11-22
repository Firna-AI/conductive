# Sandbox software

This page describes the app's own software in each sandbox: its programs
and parts, its releases and updates, its message types, the services that
it runs, and the software image. It uses the terms of the
[architecture doc](../architecture.md#terms).
[Sandbox software](../protocol/sandbox-software.md) in the protocol docs
states the rules of the releases and the updates. A decision number names
a dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A sandbox software decision number, such as sandbox software
decision 3, names a decision of the change that makes the sandbox software
update itself. An idle update decision number, such as idle update
decision 1, names a decision of the change that installs a new release
while the workspace is idle. An own computer decision number names a
decision of the change that adds own computers and the host connection,
as [Host connection](../protocol/host-connection.md) says.

## Programs

The sandbox software includes these programs:

- `conductive`, one Rust program. Its subcommands run the agent runner,
  the preview relay, the agent tools, the git credential helper, the
  updater, the helper of each service, and the host program. The runner
  runs as an always-on service. The relay listens on a local port. The
  runner also holds the file server, which listens only on a loopback
  port.
- The host program is the host mode of the same program. It runs as a
  system service on each machine, and opens the host connection of that
  machine (own computer decision 1 D). The Worker reaches the terminal and
  the relay only through its streams.
- On an own computer, the same program also runs in computer mode,
  outside the containers. It opens the computer connection, and it runs
  the containers with Podman.
- The SDK helper, a Node program. It runs the Claude Agent SDK and the
  Codex SDK for the runner, because these SDKs exist only in TypeScript
  and Python. The runner starts it as a child process. The two programs
  exchange JSON lines.
- The terminal bridge, a Node program. Each terminal connection runs it
  between ttyd and tmux. It sends the raw shell output to the browser, so
  the browser can keep and select the output history.

Reason: one program then holds one update path for each part. The preview
relay and the git credential helper need no npm package. The SDK helper
and the terminal bridge share the release's private Node. Rust only later,
a Rust installer only, and a Rust installer with only the workspace CLI were rejected. A runner with no Node
was left out, because the stream protocol of the `claude` program is not a
published stable API.

The agent tools are an MCP server and a CLI. They manage the workspaces,
the sessions, the sections, and the port previews of the org, and they ask
for Mac commands and run commands with the secrets of the org.
[Agent tools](../protocol/agent-tools.md) states their calls. They also
control the services of their own sandbox through the service manager,
with no Worker call, as [Service calls](../protocol/service-calls.md)
says. The git credential helper gets a fresh GitHub token for each git
operation.

The program also installs the other parts of the software:

- the SDK helper, with its private Node, its packages, and the agent
  programs
- the units of the runner, the preview relay, and the host program
- the scripts, bridge, and units of the terminal service, on a private port
- the wrapper of the GitHub CLI, and the Git setting of the credential
  helper
- a udev rule that stops disk flushes at each boot, as
  [Disk flushes](../protocol/workspaces-and-sandboxes.md#disk-flushes) says

The image build installs the system packages, such as the terminal
packages `ttyd` and `tmux`. It runs apt only when the image lacks a
package, when the ttyd service is not masked, or when the apt part of the
build changed, as
[Installs in a build](../protocol/sandbox-software.md#installs-in-a-build)
says.

## Releases and updates

1. Each deploy from `main` builds the program as a static Linux program,
   and packages each other part (sandbox software decision 6).
2. The deploy writes the release files to the R2 bucket
   `conductive-runner`, which serves them at `runner.conductive.build`
   (sandbox software decision 4). It signs the manifest of the release
   with the signing key of the deploy (own computer decision 4 B). It
   writes the JSON file of the newest release last. It also publishes the
   signed container base image for own computers.
3. In each sandbox, the updater reads that JSON file when the runner
   starts and every 10 minutes. It uses the `cli-updater` crate of
   `futex-ai/cli-release` (sandbox software decision 1).
4. The updater downloads a newer release in the background, with only the
   parts that changed. It checks the signature before it uses a download.
   It never changes the release that runs.
5. The runner decides when its own release changes, because only the
   runner knows whether a turn runs. When its workspace is idle, the
   runner closes its connection, runs the updater as root to install the
   release, and runs the new release in the same process (idle update
   decision 1). So its service keeps running, and so does each process
   that an agent started. Otherwise, the next start of the runner applies
   the release (sandbox software decision 5). The preview relay and the
   terminal run a new release from their next start.
6. Before the runner starts a release, the updater downloads again each
   part of that release that is missing from the disk, as
   [Updates](../protocol/sandbox-software.md#updates) says.
7. Each build of an org image or of the software image installs the newest
   release through the same program. When the image already holds the
   program, the build uses its updater, which downloads only the parts
   that changed.
8. Each install starts the host program when it does not run. A machine
   without the current host program gets the bootstrap at its start: one
   fixed provider command that installs the release of the Worker and
   starts the host program, as
   [The bootstrap](../protocol/host-connection.md#the-bootstrap) says.

## Message types

Rust owns the messages between the runner, the SDK helper, the agent
tools, the host program, the computer mode, and the Worker (sandbox
software decision 8). The TypeScript code
of the Worker and the apps uses the types that `ts-rs` generates from the
Rust types. Reason: one source then defines each message for both
languages. Hand-written Rust copies, TypeScript or runtime schemas as the
source, and a separate source for each boundary were rejected.

## The software image

The Worker builds one software image for each version of this software,
in the `boat` account, when the deploy run asks. The software image holds
the base image and a release of this software, and no org data. A build of
an org on `boat` without an org image starts from it. That build then
installs only the parts that a newer release changed. A first build of an
org on another account, such as `e2b`, starts from the base image of that
account, and installs this software. A first build on an own computer
starts from the container base image, which holds the base of the E2B
template and a release of this software.

## Agents and ports

The SDK helper runs Claude through the Claude Agent SDK, with the agent
program that the SDK bundles at its own version. A pinned version guards
against a change in how the agent program reads its credential and its
model address. It runs Codex through the Codex SDK or the Codex App Server
(decision 36).

The runner finds the listening ports in the sandbox itself, with no Boat
call (decision 220).

The runner makes both agent programs send their model requests to the
[model gateway](../protocol/model-gateway.md). It gives each agent program
the turn token of its turn, and no agent login. A settings file in the
repository can send the requests of Claude to another address, as
[How the agents reach the gateway](../protocol/model-gateway.md#how-the-agents-reach-the-gateway)
says. A sandbox runs an older runner until an update applies, as
[Updates](../protocol/sandbox-software.md#updates) says. The workspace
refuses a runner of an unsupported protocol version, as
[Runner versions](../protocol/version-pins.md#runner-versions) says.

## Services

[Services](../protocol/services.md) are programs of a workspace that run
outside every turn, each in a transient unit of the system manager of the
sandbox.

- The runner process holds one service manager. It owns the definitions,
  the request receipts, and the identity of each run. The agent tools
  reach it through a local socket that only the sandbox user can open.
  The Worker reaches it through the runner connection.
- The system manager owns each unit, outside the unit of the runner. So
  services keep running while the runner restarts, as
  [Lifetime](../protocol/services.md#lifetime) says.
- In each unit, the helper of the service starts its command, owns its
  output, and keeps its rotating log. So the output does not depend on
  the runner.
- The definitions, the receipts, and the logs live only in runtime storage,
  in the memory of the sandbox. No disk, saved snapshot, or org image
  holds them. A stop of the sandbox ends each unit and discards this data.
- The runner reports the services, and it links each listening port to
  its service, as
  [Ports of services](../protocol/listening-ports.md#ports-of-services)
  says.
- The runner and the Worker exchange service messages of their own on the
  runner connection, only after both accept them in the hello and the
  welcome. These messages are not numbered runner events, as
  [Service reports](../protocol/service-reports.md) says.

## Previews and commits

Each preview request reaches the preview relay through a stream of the
host connection. The relay forwards it to a local port of the sandbox.
The previewed server then gets its local address as `Host`
(decision 218).
[Terminal, previews, and desktop](../protocol/terminal-previews-and-desktop.md#port-previews)
states the rules of the relay.

The file server is a part of the agent runner. It serves the files of the
workspace's repository folder over HTTP, for the files preview of the HTML
file tabs. The preview relay forwards each request of a files preview to
it, as to any port. The runner announces the file server to its workspace,
and the file server updates with the runner, also at an install at idle.
[File server](../protocol/file-server.md) states its rules. Reason: the runner already knows the repository folder,
and it reads files safely for the file tabs. The preview relay reads no
workspace variable, so it stays as it is.

The Worker gives each sandbox the commit author of its workspace owner.
The agent runner gives each agent the commit author of the sender of its
turn. [Commit author](../protocol/github-tokens.md#commit-author) states
the rules.
