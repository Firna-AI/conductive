# Machine connections

This area owns the outbound host connection of each machine, and the
machine channel that sends commands to that machine. A machine is a
workspace computer, or the build machine of an org image build, a refresh,
or a software image build.
The `Machine` Durable Object holds that connection and its token digest.
The [host protocol](../../docs/protocol/host-connection.md) defines the
operations, version, ports, and token lifetime.
The workspace start, Continue, the repository change, the disk retention
command, the member and automatic restarts, and the attachment downloads
send their commands through the [machine channel](#the-machine-channel).
The org image builds and refreshes, their image sources, and the software
image build use it too.
File reads, terminals, previews, the desktop, and the
[moved-base job](../lifecycle/moved-bases.md) still use the provider adapters.

## Access and lifetime

Each owner has one object in the `MACHINES` binding. Its name is
`workspace:<workspaceId>` for a workspace, `build:<buildId>` for an org image
build or a refresh, and `software-image:<imageId>` for a software image build.
Trusted RPC calls include the owner. A workspace owner and a build owner
name their org. A software image owner names only its image, because no org
owns that build. A different owner gets `machine_not_found`. A missing
binding gives `service_unavailable`.

`GET /v1/host` accepts only a machine bearer token on the machine hostname.
It refuses cookies and Origin headers. The token names an object ID that
the namespace validates. The object compares its SHA-256 digest in
constant time. It stores no raw token.

A new token or revocation of an active token changes the generation and
closes the connection. Revoking a machine without a stored token writes nothing.
A second connection replaces the first. The socket attachment keeps its
generation, hello state, and last allocated ID for hibernation. The object records each hello,
and sends a welcome only for the supported version. Ping uses a hibernation
auto response.

Each stop request attempts token revocation before it calls the provider.
One helper settles requested and observed physical stops. Its normal mode
catches revocation failures and writes a fixed warning without error text.
The stop and state publication continue after a failure.
Confirmed lifecycle stops and completed disk-retention stops attempt revocation again.
Archive maintenance and deleted-org retention propagate observed-stop revoke failures,
so their existing retry repeats the revoke before it completes the path.
The deleted-org cleanup queue preserves this rule after interrupted retention.

Display-state publication never revokes a machine token. The token remains
valid while retention runs with a stopped display state, and after a failed
software restart leaves the computer running in error for Try again.
A failed create revokes before it retires its computer for cleanup.
The next start replaces the token.

A build machine gets one token for its create. Each replay of that create
sends the same token. The cleanup of the build revokes the token before it
deletes the build machine, as
[The build machine](../lifecycle/build-machine.md) and
[Software images](../software-image/README.md#the-build-machine) say.
`computerMachineOwner` in [workspace-data.ts](workspace-data.ts) finds the
workspace or the build of a computer ledger row. So a revoke through the
computer ledger also reaches the machine of a build.

## Operations and streams

The typed client issues and revokes tokens and exposes the fixed command,
file, and port operations. Each operation checks its owner before dispatch.
Request timeouts, reply byte budgets, and request counts bound pending work.
Large messages use the shared binary frame codec. Incomplete reply parts
share a memory budget. An overflow releases the request's parts immediately.
Reply assembly and unread stream data use the same bounded byte-buffer
implementation. It copies bytes into fixed 64 KiB blocks, independent of
incoming fragment boundaries. Empty parts retain no block. Kept blocks
follow the buffered bytes, with at most one partial block per buffer.
One socket ID allocator serves requests and streams. It saves each allocation
in the attachment before dispatch. Welcome updates the same attachment owner,
and a wake restores the counter. IDs never wrap on one connection.
An exhausted counter refuses new work until a new connection starts.

Streams reach only the terminal and preview relay ports. Each direction
has a byte credit window. Reads accumulate delivered bytes and return
credit only when the ungranted total reaches one 64 KiB frame. A grant
can include the previous partial frame. An empty read queue leaves less
than one frame ungranted, so the peer can continue sending.
A write waits when its credit ends. End half closes one direction.
Close or a dropped host connection fails both directions.
Close still errors both directions and removes the stream when its send fails.
An unowned stream gets at most one `stream.close` per Worker-allocated
stream ID on the connection. This includes late `stream.opened` replies
after an open deadline or a wake. IDs that the Worker never opened get
no answer. One stored close allowance per allocated stream survives a wake
without growing memory for host frames. Sending a close consumes that
allowance. A new connection or a disconnect clears the remaining allowances.
Inline text above the reply byte limit is refused by string length before
UTF-8 encoding. Shorter strings still pass the existing UTF-8 byte check.
An open stream keeps its RPC session until the stream ends. Plain RPC
results release their session after the client reads them.

## The machine channel

`machineChannel` in [channel.ts](channel.ts) gives the `MachineChannel` of
one machine. It runs a command, starts a detached command, and
reads the status of a started command. The caller checks the org, the
owner, and the current sandbox first. It also passes the provider client
of the stored account and the sandbox ID, for the provider path.

- Each new command goes to the host path in [host-channel.ts](host-channel.ts),
  through the typed client and the `Machine` object of the owner.
- The channel uses the provider path in [provider-channel.ts](provider-channel.ts)
  only after a refusal that comes before a send: `machine_unavailable`
  without a host connection, `machine_not_found` without a machine record
  of that owner, or `service_unavailable` without the `MACHINES` binding.
  Each other error stays an error. So a request without an answer,
  `machine_error`, never runs its command again on the provider.
- A started command keeps its route, `host` or `provider`. The caller saves
  the route with the process ID, and each status read uses that route. A
  saved process without a route reads as `provider`.
- A synchronous host command gets 600 seconds, as on the provider. A
  detached command keeps running when the host connection drops. By default,
  a host status read without a connection fails with `machine_unavailable`.
  A caller can opt in to wait for a welcomed connection. The wait and the
  status read share a 30-second request limit.
- `isTransientHostError` in [errors.ts](errors.ts) names the transient host
  errors: `machine_unavailable`, `machine_disconnected`, `machine_timeout`,
  `machine_busy`, and `machine_error`. Starts, builds, refreshes, the
  software image build, and the attachment downloads treat them as they
  treat a transient provider error. The disk retention command retries them
  until its deadline.
- `observeHostChannels` marks a D1 binding, as `observeProviders` does for
  providers. Each host channel of that env then comes through its observer.
  The start records time the host calls in this way, as
  [Start step records](../lifecycle/workspace-object.md#start-step-records)
  says.

## Development

Run `npm run test -- worker/machines` from the repository root with Node 24.
The tests connect a fake host over a real Miniflare WebSocket.
The test caller is a Durable Object, so transferred streams stay in one
I/O context. Tests can still drive each read and write from Node.

### Key Code

- [machine.ts](machine.ts): the Durable Object, token storage, RPC methods,
  hello checks, and hibernation socket handlers.
- [client.ts](client.ts): the typed caller interface, the owner builders
  `workspaceMachineOwner`, `buildMachineOwner`, and
  `softwareImageMachineOwner`, and the token functions. `newMachineToken`
  makes a token without its issue, and `machineTokenEnvironment` gives the
  env of a token.
- [identity.ts](identity.ts): `MachineOwner` with its three kinds,
  `machineObjectName`, and the owner reader and comparison.
- [workspace-data.ts](workspace-data.ts): `computerMachineOwner`, the
  workspace or build owner of a computer ledger row.
- [channel.ts](channel.ts): `machineChannel`, `MachineChannel`, and the
  command results, output offsets, and routes.
- [host-channel.ts](host-channel.ts): the host path of the channel, and
  `observeHostChannels`.
- [provider-channel.ts](provider-channel.ts): the provider path of the
  channel, bound to one stored account and sandbox ID.
- [route.ts](route.ts): the host route and namespace ID check.
- [host-connection.ts](host-connection.ts): `HostConnection`, the request
  dispatch, message parts, and stream routing of one host socket.
- [socket-state.ts](socket-state.ts): the attachment reader, its single writer,
  and the shared request and stream ID allocator.
- [pending.ts](pending.ts): request deadlines, reply budgets, and assembly memory.
- [byte-buffer.ts](byte-buffer.ts): shared fixed-block storage for reply
  assembly and stream reads.
- [stream.ts](stream.ts): stream credit, reads, writes, and half closes.
- [stream-close.ts](stream-close.ts): stored close allowances for allocated
  streams, consumed once and cleared in bounded batches.
- [revoke.ts](revoke.ts): the revoke of a stop, by owner or through the computer ledger.
- [host.test-support.ts](host.test-support.ts): the fake host and runtime fixture.
- [host-inbox.test-support.ts](host-inbox.test-support.ts): `HostInbox`,
  the reader of host frames and request parts. The machine tests and the
  [lifecycle fake host](../lifecycle/tests.md#image-and-provider-boundaries)
  share it.

### Related Docs

- [Machines](../../docs/architecture/machines.md)
- [Hostnames and gates](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Workspace lifecycle](../lifecycle/README.md)
- [Test support](../test-support/README.md)
