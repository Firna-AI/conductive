# HTTP body limits and readers

This area holds the request body limit of the Worker entry, the JSON request policy, the raw upload routes (decision 144), and the bounded readers.
Every request passes through `requestBodyEntry` before a route can read its body.
Use `readJsonObject` for JSON request bodies.
Use `readBoundedJson` or `readBoundedBody` for a body with a budget from the caller, such as a provider response.
The [access protocol](../../docs/protocol/access-and-security.md#request-bodies) states the request body requirements.

## Request body limit

`request-body.ts` exports this function:

```ts
requestBodyEntry(
  handle: (request: Request, env?: AppEnv) => Promise<Response>,
): (request: Request, env?: AppEnv) => Promise<Response>
```

`createApp` in [application.ts](../application.ts) wraps its `fetch` handler in `requestBodyEntry`.
The entry uses the private helpers `requestBodyBudget` and `withRequestBodyLimit` to select and apply the body budget.
It returns an overflow as a private JSON error response.
On an app API path, that response gets the same desktop CORS headers as other API responses.

`requestBodyBudget` returns the default of 1,000,000 bytes, which is 1 MB in decimal units.
It returns `GITHUB_WEBHOOK_BODY_BYTES`, 27,262,976 bytes, only for a `POST` to `MACHINE_PATHS.githubWebhook`, which is `/v1/github/webhooks`, on the machine origin.
It returns 100,000,000 bytes for a `POST` under either model gateway base on the machine origin.
The gateway bases come from `MACHINE_PATHS.claudeGateway` and `MACHINE_PATHS.codexGateway`.
A route that a later change adds gets the default without code of its own.
A machine route that needs a higher limit declares it in `requestBodyBudget`.
A raw upload route declares its limit in the [raw upload registry](#raw-upload-routes) instead (decision 144).
For a `POST` to such a route on the app host, the entry uses that `maxBytes`, 25,000,000 bytes, and its overflow error is 413 `attachment_too_large` (decision 144).
Beside that raw upload selection, `requestBodyEntry` selects `FEEDBACK_BODY_MAX_BYTES`, 10,000,000 bytes, for a `POST` to `FEEDBACK_PATH`, which is `/api/feedback`, on the app host.
Both names come from [`src/shared/feedback.ts`](../../src/shared/feedback.ts).
That JSON body keeps the 413 `body_too_large` error of the default.
Another method on that path, or that path on another host, takes its budget from `requestBodyBudget`.

`withRequestBodyLimit` passes `handle` a new request with one bounded body stream:

- A request without a body passes unchanged.
- A WebSocket upgrade gets a request without a body.
  The helper cancels the body that the client sent and removes `Content-Length` and `Transfer-Encoding`.
- The stream pulls from the source only when the handler reads.
  A handler that refuses a request before its read pulls no body bytes.
- The stream counts the byte length of each chunk before it passes the chunk on.
  It does not trust `Content-Length`.
- A body at the exact budget passes.
- The first chunk that takes the count above the budget errors the stream and cancels the source.
  The helper does not wait for the cancellation to finish.
- A clone and a forwarded copy of the request read the same bounded stream.
- When the overflow happens before `handle` settles, the helper throws the shared 413 `HttpError`, whatever `handle` returned or threw.
  It also cancels the body of a response that `handle` returned.
  So a route that catches its read error cannot change the answer.
- An overflow after `handle` settled only errors the body stream.
  The response status is then already fixed.

A `handle` function must finish its read of the request body before it returns a response.
The [model gateway upload](../model-gateway/upload.ts) forwards the bounded stream without a clone.
If the upstream answers early, the gateway drains the remaining upload through the same bounded reader before it returns the answer.
An overflow aborts the upstream request and cancels its answer.
The entry then returns the shared 413 error, including after an early upstream answer.

| Input | HTTP status | Error code | Message |
| --- | --- | --- | --- |
| Body above its budget | 413 | `body_too_large` | The request is too large. Send less data. |
| Body above the budget of a raw upload route (decision 144) | 413 | `attachment_too_large` | Each file can be up to 25 MB. |

Tests call `requestBodyEntry`, also for a handler that `createApp` does not mount.
They pass the machine origin in the environment, so the entry selects the raised budget.

## Raw upload routes

`raw-upload-routes.ts` holds the one registry of the raw upload routes (decision 144).
Each entry has a method, a path pattern, and `maxBytes`.
One entry is a `POST` to `/api/orgs/{orgId}/attachments`, the draft upload of an org.
The other is a `POST` to `/api/orgs/{orgId}/workspaces/{workspaceId}/attachments`.
Both have `maxBytes` of 25,000,000 bytes, which is also the file limit.

`raw-upload-routes.ts` exports these functions:

```ts
rawUploadRoute(
  request: Pick<Request, 'url' | 'method'>,
): { workspaceIdSegment: string | null; maxBytes: number } | null

rawUploadLength(request: Request, maxBytes: number): number
```

`rawUploadRoute` matches the method and the path, and returns the policy of the route or `null`.
The Worker entry, the [request gate](../security/README.md#json-request-bodies), and the feature dispatch use it (decision 144).
So a route gets the raw exception only with its own limit, and a route that a later change adds gets neither.

`rawUploadLength` checks the headers of a raw request and returns its declared length (decision 144).
The gate puts that length in `RequestContext.rawUploadBytes`.

| Input | HTTP status | Error code | Message |
| --- | --- | --- | --- |
| No content type, or one other than `application/octet-stream` | 415 | `file_content_type_required` | Send the file as application/octet-stream. |
| No `Content-Length` header | 411 | `content_length_required` | Send the file with its byte length. |
| A `Content-Length` that is not a whole decimal number | 400 | `invalid_content_length` | The file byte length is not valid. |
| A `Content-Length` above `maxBytes` | 413 | `attachment_too_large` | Each file can be up to 25 MB. |

The content type check removes surrounding spaces and converts the value to lowercase.
It accepts no parameter, so `application/octet-stream; charset=binary` gets the 415 error.

`fixed-upload-body.ts` exports `fixedUploadBody(request, sizeBytes)` (decision 144).
It pipes the body that the entry counted into a native `FixedLengthStream` of the declared length, because R2 needs a stream of known length.
It returns that fixed-length `body`, the `finished` promise of the pipe, `failed`, and `cancel`.
A body with fewer or more bytes than its declared length fails the stream, so no file is stored.
The [attachment routes](../chat/attachment-routes.ts) call it, and wait for both the R2 write and the end of the source.
The [access protocol](../../docs/protocol/access-and-security.md#attachment-uploads) states the conditions.

## JSON request objects

`json-body.ts` exports this function:

```ts
readJsonObject(request: Request): Promise<Record<string, unknown>>
```

It returns the parsed JSON object or throws `HttpError`.
It reads the media type before the first semicolon.
It removes surrounding spaces and converts the media type to lowercase.
The normalized media type must be `application/json`.

The helper has no byte budget of its own.
It parses the body with `request.json()` and relies on the entry limit.
Call it only with a request that passed through `requestBodyEntry`.
The parsed value must be an object.

| Input | HTTP status in `HttpError` | Error code | Message |
| --- | --- | --- | --- |
| Missing or unsupported content type | 415 | `json_required` | Send the request as JSON. |
| Missing body, failed body read, or malformed JSON | 400 | `invalid_json` | The request is not valid JSON. |
| JSON value that is not an object | 400 | `invalid_json` | Send a JSON object. |

A body above the entry budget fails the read, so the helper throws the 400 error.
The entry then replaces the answer with the 413 error of the [request body limit](#request-body-limit).

The [request gate](../security/README.md#json-request-bodies) calls this helper after its access checks, for each write except a raw upload route (decision 144).
The desktop sign-in exchange and the [agent tools](../tools/README.md) handler call it too.
Each caller owns its sign-in, origin, session, and membership checks, and the mapping of its 400 errors.

## Bounded JSON reader

`bounded-body.ts` exports this function:

```ts
readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  budget: number,
): Promise<unknown>
```

A missing body throws `SyntaxError` with message `Missing JSON body`.
The helper calls `readBoundedBody` with the supplied byte budget.
It decodes the complete accepted bytes as UTF-8 and parses JSON.
It returns the parsed value as `unknown`.
Overflow remains `BodyBudgetExceeded`.
Malformed JSON remains `SyntaxError`.
Callers keep their budgets, content type checks, object validation, access checks, and error mappings.

The [sandbox transport](../sandbox/response-limits.md#response-byte-limits) uses this function for every Boat response.
It owns the response budgets and provider error mapping.
The successful file content route keeps its dynamic base64 budget and size fallback.

## Bounded byte collector

Call `readBoundedBody(body, budget)` with a body stream and a byte budget.
It returns an ArrayBuffer-backed `Uint8Array` when the whole body fits.

It accepts a body whose byte length equals the budget.
It counts the byte length of each chunk before keeping that chunk.
On overflow, it cancels the stream and throws `BodyBudgetExceeded`.
It releases the reader lock after success or failure.

The caller chooses the byte budget and handles a missing stream.
The byte collector has no route, provider, credential, file, or JSON policy.

The [GitHub](../github/README.md) webhook and transport call it with their own budgets.
The webhook handler reads its body with the same `GITHUB_WEBHOOK_BODY_BYTES` budget as the entry.
Under the entry limit, an oversized webhook gets the shared `body_too_large` error.

## Development

Run `npm run test -- worker/http` from the repository root with Node 24.
The focused tests use deterministic in-memory streams that count pulls, bytes, and cancellations.
Run `npm run test -- worker/security/gate-body.test.ts` to check the request body boundary through the app.
Run `npm run test -- worker/security/gate.test.ts` to check the JSON request type and object policy.
Run `npm run test -- worker/http/raw-upload-body.test.ts worker/security/raw-upload.test.ts` to check the raw upload routes (decision 144).
Run `npm run test -- worker/security/desktop-exchange.test.ts` to check the limit on the public sign-in exchange.
Run `npm run test -- worker/app-api/feedback-body.test.ts` to check the feedback JSON budget through the production entry.
Run `npm run test -- worker/files worker/sandbox worker/http/bounded-body.test.ts` for the current integration.

### Key Code

- [request-body.ts](request-body.ts) exports `requestBodyEntry` and keeps the budget selector and bounded stream helpers private.
- [request-body.test.ts](request-body.test.ts) checks the default limit, the raised webhook budget, overflow answers, and WebSocket upgrades.
- [../model-gateway/upload.test.ts](../model-gateway/upload.test.ts) checks the gateway budget and an overflow after an early upstream answer.
- [request-body.test-support.ts](request-body.test-support.ts) builds streamed requests that count pulls, bytes, and cancellations.
- [raw-upload-routes.ts](raw-upload-routes.ts) holds the registry of raw upload routes and exports `rawUploadRoute` and `rawUploadLength` (decision 144).
- [fixed-upload-body.ts](fixed-upload-body.ts) exports `fixedUploadBody`, which gives R2 a stream of the declared length (decision 144).
- [raw-upload-body.test.ts](raw-upload-body.test.ts) checks the exact raw file limit at the entry, and the JSON limit of the other routes (decision 144).
- [../app-api/feedback-body.test.ts](../app-api/feedback-body.test.ts) checks the exact feedback budget, with and without `Content-Length`.
- [json-body.ts](json-body.ts) exports `readJsonObject` and owns the JSON request policy.
- [bounded-body.ts](bounded-body.ts) exposes `readBoundedBody`, `readBoundedJson`, and `BodyBudgetExceeded`.
- [bounded-body.test.ts](bounded-body.test.ts) checks the exact byte boundary and early cancellation.

### Related Docs

- [Access and security: Request bodies](../../docs/protocol/access-and-security.md#request-bodies)
- [Access and security: Attachment uploads](../../docs/protocol/access-and-security.md#attachment-uploads)
- [Feedback: The routes](../../docs/protocol/feedback.md#the-routes)
- [Worker backend](../README.md)
