# HTTP body readers

This area holds the JSON request policy and the reusable byte collector.
Use `readJsonObject` for JSON request bodies.
Use `readBoundedBody` when the caller owns another body policy.

## JSON request objects

`json-body.ts` exports this function:

```ts
readJsonObject(request: Request): Promise<Record<string, unknown>>
```

It returns the parsed JSON object or throws `HttpError`.
It reads the media type before the first semicolon.
It removes surrounding spaces and converts the media type to lowercase.
The normalized media type must be `application/json`.

The helper owns a fixed budget of 1,000,000 UTF-8 bytes.
This is 1 MB in decimal units.
The count includes JSON punctuation and whitespace.
The helper uses `readBoundedBody` and does not trust `Content-Length`.
A body at the exact limit passes the size check.
On overflow, the shared reader cancels before it keeps the oversized chunk.
The helper parses JSON only after the complete body fits.
The parsed value must be an object.

| Input | HTTP status in `HttpError` | Error code | Message |
| --- | --- | --- | --- |
| Missing or unsupported content type | 415 | `json_required` | Send the request as JSON. |
| Body above 1,000,000 bytes | 413 | `body_too_large` | The request is too large. Send less data. |
| Missing body, failed body read, or malformed JSON | 400 | `invalid_json` | The request is not valid JSON. |
| JSON value that is not an object | 400 | `invalid_json` | Send a JSON object. |

The [request gate](../security/README.md#json-request-bodies) calls this helper after its access checks.
Other request handlers can call the same function without copying the policy.
Each caller owns sign-in, origin, session, and membership checks.

## Bounded byte collector

Call `readBoundedBody(body, budget)` with a body stream and a byte budget.
It returns an ArrayBuffer-backed `Uint8Array` when the whole body fits.

It accepts a body whose byte length equals the budget.
It counts the byte length of each chunk before keeping that chunk.
On overflow, it cancels the stream and throws `BodyBudgetExceeded`.
It releases the reader lock after success or failure.

The caller chooses the budget, parses the bytes, and maps errors to its response.
The helper has no route, provider, credential, file, or JSON policy.
The caller also handles a missing body stream.

The [sandbox transport](../sandbox/README.md#response-byte-limits) uses the collector for every Boat response.
It owns the response budgets, JSON parsing, and provider error mapping.
The successful file content route keeps its dynamic base64 budget and size fallback.

## Development

Run `npm run test -- worker/http/bounded-body.test.ts` from the repository root with Node 24.
The focused tests use deterministic in-memory streams.
Run `npm run test -- worker/security/gate-body.test.ts` to check the request body boundary through the app.
Run `npm run test -- worker/security/gate.test.ts` to check the JSON request type and object policy.
Run `npm run test -- worker/files worker/sandbox worker/http/bounded-body.test.ts` for the current integration.

### Key Code

- [bounded-body.ts](bounded-body.ts) exposes `readBoundedBody` and `BodyBudgetExceeded`.
- [bounded-body.test.ts](bounded-body.test.ts) checks the exact byte boundary and early cancellation.
- [json-body.ts](json-body.ts) exports `readJsonObject` and owns the JSON request policy.
