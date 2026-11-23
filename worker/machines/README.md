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
generation and hello state for hibernation. The object records each hello,
and sends a welcome only for the supported version. Ping uses a hibernation
auto response.

Each stop attempts token revocation before the provider request. All stop
paths use one helper that catches revocation failures and writes a fixed
warning without error text. The stop and later stopped hooks still run.
The stopped hook attempts revocation again. The next start replaces the token.

## Operations and streams

The typed client issues and revokes tokens and exposes the fixed command,
file, and port operations. Each operation checks its owner before dispatch.
Request timeouts, reply byte budgets, and request counts bound pending work.
Large messages use the shared binary frame codec. Incomplete reply parts
share a memory budget. An overflow releases the request's parts immediately.

Streams reach only the terminal and preview relay ports. Each direction
has a byte credit window. A read returns credit after it delivers data.
A write waits when its credit ends. End half closes one direction.
Close or a dropped host connection fails both directions.
Close still errors both directions and removes the stream when its send fails.
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
- [pending.ts](pending.ts): request deadlines, reply budgets, and assembly memory.
- [stream.ts](stream.ts): stream credit, reads, writes, and half closes.
- [revoke.ts](revoke.ts): workspace and computer-ledger revocation helpers.
- [host.test-support.ts](host.test-support.ts): the fake host and runtime fixture.

### Related Docs

- [Machines](../../docs/architecture/machines.md)
- [Hostnames and gates](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Workspace lifecycle](../lifecycle/README.md)
- [Test support](../test-support/README.md)
