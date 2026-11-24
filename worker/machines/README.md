# Machine connections

This area owns the outbound host connection of each workspace computer.
The `Machine` Durable Object holds that connection and its token digest.
The [host protocol](../../docs/protocol/host-connection.md) defines the
operations, version, ports, and token lifetime.
Production command, file, terminal, and preview callers still use the
provider adapters. They do not call these operations yet.

## Access and lifetime

The object name is `workspace:<workspaceId>` in the `MACHINES` binding.
Trusted RPC calls include the org and workspace owner. A different owner
gets `machine_not_found`. A missing binding gives `service_unavailable`.

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

## Development

Run `npm run test -- worker/machines` from the repository root with Node 24.
The tests connect a fake host over a real Miniflare WebSocket.
The test caller is a Durable Object, so transferred streams stay in one
I/O context. Tests can still drive each read and write from Node.

### Key Code

- [machine.ts](machine.ts): the Durable Object, token storage, RPC methods,
  hello checks, and hibernation socket handlers.
- [client.ts](client.ts): the typed caller interface and token env builder.
- [route.ts](route.ts): the host route and namespace ID check.
- [channel.ts](channel.ts): request dispatch, message parts, and stream routing.
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

### Related Docs

- [Machines](../../docs/architecture/machines.md)
- [Hostnames and gates](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Workspace lifecycle](../lifecycle/README.md)
- [Test support](../test-support/README.md)
