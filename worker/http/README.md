# Bounded body reader

This area holds the shared byte collector for HTTP body streams.
Call `readBoundedBody(body, budget)` with a body stream and a byte budget.
It returns an ArrayBuffer-backed `Uint8Array` when the whole body fits.

It accepts a body whose byte length equals the budget.
It counts the byte length of each chunk before keeping that chunk.
On overflow, it cancels the stream and throws `BodyBudgetExceeded`.
It releases the reader lock after success or failure.

The caller chooses the budget, parses the bytes, and maps errors to its response.
The helper has no route, provider, credential, file, or JSON policy.
The caller also handles a missing body stream.

The [sandbox file content route](../sandbox/README.md#file-reads) is the first caller.
It keeps its base64 response budget and JSON parsing in sandbox code.
Milestone 4c owns later wiring for the request gate and other Boat routes.
Those callers do not use this helper yet.

## Development

Run `npm run test -- worker/http/bounded-body.test.ts` from the repository root with Node 24.
The focused tests use deterministic in-memory streams.
Run `npm run test -- worker/files worker/sandbox worker/http/bounded-body.test.ts` for the current integration.

### Key Code

- [bounded-body.ts](bounded-body.ts) exposes `readBoundedBody` and `BodyBudgetExceeded`.
- [bounded-body.test.ts](bounded-body.test.ts) checks the exact byte boundary and early cancellation.
