# Sign-in and request gate

This area checks browser sign-in, request origins, and org membership.
Protected app requests pass through `gate` before route dispatch.
The gate checks access before it reads a write body.
Open chat tabs and terminal sockets check their access again through the [shared connection reader](#open-connections).

## JSON request bodies

The gate calls `readJsonObject(request)` once for each write.
The call follows the session and org access checks.
The [shared JSON request reader](../http/README.md#json-request-objects) owns content type normalization, parsing, and object checks.
The [Worker entry](../http/README.md#request-body-limit) owns the byte limit and the HTTP 413 response.
A body error prevents route dispatch.

## Open connections

A chat tab or a terminal socket stays open after the gate admits it.
`readConnectionAccess(db, identities, now)` checks the access of such open connections.
One D1 query checks a whole batch of identities.
It returns one grant for each identity that still has access.
The workspace Durable Object calls it for chat tabs.
The Worker calls it for terminal sockets.

Each identity holds a session ID, a user ID, an org ID, and a workspace ID.
Every identity passes only when all of these are true:

- The session belongs to that user and is not expired.
- The user is a member of the org.
- The org is not deleted.
- The workspace belongs to that org.

Each identity also has one of two kinds:

- `workspace`: chat tabs use it. It needs nothing more, because chat history stays readable after a stop or an archive.
- `sandbox`: terminal sockets use it. It also holds a sandbox ID. That ID must still be the sandbox of the workspace. The workspace must also be in a running state and not archived. The running states are `ready`, `working`, `unread`, and `input`.

The `connectionNumber` of a grant is the index of its identity in the input.
The grant deadline is the earlier of the session expiry and `now` plus 30 seconds.
Callers pass the start time of the read as `now`.
So a slow read cannot extend a grant.
An identity without a grant has lost access.

The reader closes nothing and keeps no timer.
Each caller keeps its own registrations and timers.
Each caller reads the first grant of a connection before it sends data.
Each caller also follows these rules:

- Refresh all live grants in one read every `CONNECTION_CHECK_MS`, 15 seconds. So a refresh has time to finish before the previous grant ends.
- Check the grant deadline before each send, without a D1 read.
- Close each connection at its deadline, also while a refresh read waits.
- Close every connection of a batch when its read fails.
- Ignore a late result for a connection that is already closed.

`scheduleConnectionCheck` is the default timer of both callers.
Tests replace it with their own `ConnectionScheduler`.

## Development

Run `npm run test -- worker/security/gate.test.ts worker/security/gate-body.test.ts worker/http/bounded-body.test.ts` from the repository root.
Use Node 24.
The body tests use streams with deterministic pull and cancellation counts.
They send multibyte text to check byte counts.
They also send incorrect `Content-Length` values in both directions.

The connection reader has no test file in this folder.
The tests of its callers check it.
After a change to the reader, run `npm run test -- worker/chat/tab-access.test.ts worker/chat/tab-deadlines.test.ts worker/chat/security.test.ts worker/terminal/access.test.ts`.

### Key Code

- [gate.ts](gate.ts) checks the host, origin, session, membership, and JSON body.
- [connection-access.ts](connection-access.ts) exports `readConnectionAccess`, the identity and grant types, `CONNECTION_CHECK_MS`, and `scheduleConnectionCheck`.
- [gate-body.test.ts](gate-body.test.ts) checks the exact body limit and early cancellation through HTTP routes.
- [gate.test.ts](gate.test.ts) checks access, dispatch order, and JSON errors.
- [auth.ts](auth.ts) starts and finishes GitHub sign-in.
- [cookies.ts](cookies.ts) builds and reads the session cookies.
- [crypto.ts](crypto.ts) signs and verifies tokens.

### Related Docs

- [Access requirements](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Access of open tabs](../../docs/protocol/access-and-security.md#orgs-and-workspaces)
- [Worker backend](../README.md)
