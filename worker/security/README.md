# Sign-in and request gate

This area checks browser sign-in, request origins, and org membership.
Protected app requests pass through `gate` before route dispatch.
The gate checks access before it reads a write body.

## JSON request bodies

The gate calls `readJsonObject(request)` once for each write.
The call follows the session and org access checks.
The [shared JSON request reader](../http/README.md#json-request-objects) owns content type normalization, the byte limit, parsing, and object checks.
That page states the exact budget and each HTTP error response.
A body error prevents route dispatch.

## Development

Run `npm run test -- worker/security/gate.test.ts worker/security/gate-body.test.ts worker/http/bounded-body.test.ts` from the repository root.
Use Node 24.
The body tests use streams with deterministic pull and cancellation counts.
They send multibyte text to check byte counts.
They also send incorrect `Content-Length` values in both directions.

### Key Code

- [gate.ts](gate.ts) checks the host, origin, session, membership, and JSON body.
- [gate-body.test.ts](gate-body.test.ts) checks the exact body limit and early cancellation through HTTP routes.
- [gate.test.ts](gate.test.ts) checks access, dispatch order, and JSON errors.
- [auth.ts](auth.ts) starts and finishes GitHub sign-in.
- [cookies.ts](cookies.ts) builds and reads the session cookies.
- [crypto.ts](crypto.ts) signs and verifies tokens.

### Related Docs

- [Access requirements](../../docs/protocol/access-and-security.md#hostnames-and-gates)
- [Worker backend](../README.md)
