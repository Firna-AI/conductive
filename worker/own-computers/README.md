# Own computers

This area owns the org's own computer records, code exchange, and outbound
computer connection. The computer object sends the fixed container and
image operations. Each container has its own host connection for commands,
files, terminals, and previews. See the requirements in
[Own computers](../../docs/protocol/own-computers.md).

## Records and access

Browser routes use the org membership gate. Admins add computers, read and
replace their enrollment codes, set limits, request builds, and remove
records. The member list reads counts from D1 and live connection state
from the computer object. Build requests remain in D1 for a build worker.

D1 stores the code digest and an encrypted copy for Show command. A code
exchange clears both and stores the token digest in one update. The
computer object checks that digest before it accepts the WebSocket. The
first welcome records the computer's resources, default limit, and build
request. A later connection keeps the saved limit.

The Worker marks the record as removed and clears its credentials. It
then closes the socket. A repeat removal completes socket closure.

## Operations

The typed client checks the computer's org in D1 before each call. The
object checks the org and computer again. A socket attachment keeps the
owner, credential digest, welcome state, and request counter across
hibernation. Pending requests stay in memory. Each request has a deadline.
Message parts use the shared frame codec. A connection drop ends pending
requests.

## Development

Run `npm run test -- worker/own-computers` from the repository root with
Node 24. The tests use the app harness and connect a fake computer with a
real Miniflare WebSocket.

### Key Code

- [admin.ts](admin.ts) serves the protected org routes.
- [data.ts](data.ts), [code-data.ts](code-data.ts), and
  [connection-data.ts](connection-data.ts) own the D1 reads and writes.
- [route.ts](route.ts) exchanges enrollment codes and forwards upgrades.
- [own-computer.ts](own-computer.ts) owns the socket and the object access checks.
- [client.ts](client.ts) gives callers the fixed operation methods.
- [channel.ts](channel.ts) and [pending.ts](pending.ts) send requests and match replies within their budgets.

### Related Docs

- [Machines](../../docs/architecture/machines.md#computer-durable-object)
- [Workspaces on own computers](../../docs/protocol/own-computers-workspaces.md)
- [Hostnames and gates](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Computer wire types](../../crates/cnd-runner-interface/README.md)
