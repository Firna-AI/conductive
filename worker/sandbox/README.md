# Sandbox provider

This area owns the Boat transport and the use of the app's one Boat key.
Every sandbox and every saved snapshot of every org lives in the app's own
Boat organization. The key does not keep the orgs apart, so each caller
authorizes its org and its resource before it asks for a provider.

Call `orgSandboxProvider(env, userId, orgId, fetch)` when the caller still
needs the membership check. It returns 404 `org_not_found` for a user who is
not a member of the org.
Trusted feature code calls `sandboxProvider(env, fetch)` after it authorizes
its workspace, its build, or its cleanup lease.
Both return `SandboxProvider`. Neither gives the key to its caller.
The caller checks ownership before it passes a sandbox or saved snapshot ID.

The transport creates the API URL and headers from fixed routes.
It sends `X-Boat-Org` with `BOAT_ORG_ID` on every API request. A change of the
active Boat organization of the key's user then moves no work of the app.
It forwards no browser cookie.
File writes also send a signed PUT to the exact address that the fixed
upload-grant route returns. That transfer sends no provider credential or org header.

`SandboxProvider.privatePort(sandboxId, port, mode)` calls only the fixed host
route. It requires explicit localhost or network mode and private access.
It parses the provider URL into a server-only origin and token.
`SandboxProvider.desktop(sandboxId)` calls only the fixed desktop route.
It returns a typed ready URL or a starting result. Ready URLs require HTTPS
and a fragment token. The feature layer maps starting into its public response.
Both methods use the same `BoatTransport` as commands, lifecycle, and file reads.
The transport validates sandbox ID segments and centralizes errors and the organization pin.

`SandboxProvider.runCommand` and `SandboxProvider.startCommand` both call `POST /sandboxes/{id}/commands`.
`runCommand` waits for the command, with a 600 second Boat timeout and a 610 second request timeout.
`startCommand` starts a detached command, with a 30 second request timeout.
`SandboxProvider.getCommandStatus` reads detached output from byte offsets, with the same 30 second timeout.

## The app's Boat account

The Worker reads two values. The root [Get started](../../README.md#get-started)
says where to set them.

- `BOAT_API_KEY`: an API key for the app's own Boat organization. It is the
  only Boat credential, and a Worker secret.
- `BOAT_ORG_ID`: the ID of that organization. It is not a secret.

Make the organization and the key once, in the Boat dashboard:

1. Use a Boat organization that holds only the app's sandboxes and saved
   snapshots. Keep other Boat work in other organizations.
2. Read its `id` once with `GET /orgs`, using an operator credential with
   `account.read`. Set `BOAT_ORG_ID` to that value. The
   [organization reference](https://docs.boat.dev/api/reference/account/list-organizations)
   defines the reply. The [scope reference](https://docs.boat.dev/api-keys/scopes)
   gives the lookup permission.
3. Select that organization in the dashboard. Make an API key with Custom
   actions, and add these actions:
   `sandbox.create`, `sandbox.read`, `sandbox.update`, `sandbox.stop`,
   `sandbox.resume`, `sandbox.fork`, `sandbox.delete`, `exec`,
   `snapshot.read`, `snapshot.write`, `file.read`, `file.write`, `host`, and `desktop`.
4. Limit the key to one environment. Give it a lifetime of 365 days, and
   plan its replacement before that date.

Boat's `ci` preset deletes only the sandboxes that its own key created, so
the key needs custom actions. The fixed routes in [routes.ts](routes.ts) set
the actions. A new route can need a new action.
To replace the key, put the new key in the Worker secret. The new key must
reach the same organization, because the sandboxes and the org images
stay there.

## Response byte limits

Every Boat API response uses the [shared bounded JSON reader](../http/README.md#bounded-json-reader).
Signed file transfers use the same bounded byte reader without requiring JSON.
The following limits are Worker policy chosen by the user.
They are not published Boat response maxima.
The Worker counts received bytes and does not trust `Content-Length`.
A body at its exact budget passes the size check.
A larger body fails, even when Boat permits it.
Here, a successful response has an HTTP 2xx status.
A command with a nonzero exit code still uses 18 MiB when its HTTP response is successful.

| Fixed route | Successful response budget | Error response budget |
| --- | --- | --- |
| `POST /sandboxes` | 1 MiB | 1 MiB |
| `GET`, `PATCH`, `DELETE /sandboxes/{id}` | 1 MiB | 1 MiB |
| `POST /sandboxes/{id}/stop`, `POST /sandboxes/{id}/resume`, `POST /sandboxes/{id}/fork` | 1 MiB | 1 MiB |
| `POST /sandboxes/{id}/host` | 1 MiB | 1 MiB |
| `POST /sandboxes/{id}/desktop` | 1 MiB | 1 MiB |
| `POST /sandboxes/{id}/commands` | 18 MiB | 1 MiB |
| `GET /sandboxes/{id}/commands/{processId}` | 18 MiB | 1 MiB |
| `POST /saved-snapshots` | 1 MiB | 1 MiB |
| `GET`, `DELETE /saved-snapshots/{name}` | 1 MiB | 1 MiB |
| `GET /sandboxes/{id}/files` | `4 × ceil(maxBytes / 3) + envelopeBytes` | 1 MiB |
| `GET /sandboxes/{id}/files/info` | 1 MiB | 1 MiB |
| `POST /sandboxes/{id}/files/upload-url` | 1 MiB | 1 MiB |
| `PUT` to that grant's exact signed upload address | 1 MiB | 1 MiB |

Here, 1 MiB is 1,048,576 bytes.
The 18 MiB command budget is 18,874,368 bytes for the complete JSON body.
It includes both output streams, JSON escaping, metadata, and whitespace.
Boat permits 8 MiB of output for each waiting command stream.
Two plain ASCII streams at that limit fit with room for the envelope.
More JSON escaping can make an otherwise permitted command reply exceed the Worker budget.

The [limits reference](https://docs.boat.dev/limits#other-limits) states the command output limit.
The [command reference](https://docs.boat.dev/api/reference/agent/execute-sandbox-command) defines both output fields and the other response fields.
The [file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file) states the 5 MiB content limit.
The [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info) defines the file detail fields.

The [public OpenAPI schema](https://docs.boat.dev/openapi/boat-v1.yaml) gives no total response byte maximum for most routes.
The common error schema leaves message lengths and `error.details` unbounded.
Thus these Worker budgets can reject responses that Boat permits.
The shared reader retains chunks while it allocates the collected byte buffer.

## Response failures

The reader cancels when the next chunk crosses the budget.
It does not retain that chunk or parse an incomplete body.
For a command or command status response, overflow throws `HttpError` with status 502 and code `command_output_too_large`.
Its exact message is "The command output is too large."
Other response overflows use status 502 and code `sandbox_response_too_large`.
Their message is "The cloud computer response is too large."
These messages describe a response body that exceeds the Worker budget.
They contain no provider text.

A successful file content overflow instead keeps the metadata fallback described below.
An oversized file error reply gets the generic response error and does not start that fallback.
An oversized metadata reply also gets the generic response error.

An error reply within 1 MiB keeps the ordinary typed provider error, status, provider code, and retry metadata.
Malformed success replies keep the `invalid_response` provider error with status 502.
Malformed error replies keep their upstream status and retry metadata without a provider code.
A typed provider error from a file content read also starts the metadata fallback.

## File reads

`SandboxProvider.readFile(sandboxId, path, maxBytes)` takes the backend's file byte limit.
It returns a file result or a size result.
The file result has the path, size, encoding, and content.
The size result has the exact reported file size and the caller's limit.

The adapter calls `GET /sandboxes/{id}/files` with the path and base64 encoding.
The budget is the sum of these values:

- Four bytes for each complete or partial group of three permitted file bytes.
- The UTF-8 byte length of the documented JSON envelope, with two-space formatting.

The envelope includes the JSON-escaped requested path and the largest safe integer size.
It also includes the response type, encoding, booleans, and empty content field.
The transport sends file content through the [shared bounded JSON reader](../http/README.md#bounded-json-reader).
Its byte collector counts each `Uint8Array.byteLength` before keeping the chunk.
When the next chunk crosses the budget, it cancels the stream and discards that chunk.
The shared JSON reader decodes and parses only after the complete body fits.

After a successful file content overflow or a typed provider error, the adapter calls `GET /sandboxes/{id}/files/info` with the same path.
It checks Boat's flat metadata response.
It checks the path in both file and metadata responses.
The metadata request uses the 1 MiB response budget.
The [primary file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file)
and [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info)
define these two routes.

The metadata fallback returns the size result only when valid metadata gives a size above `maxBytes`.
Otherwise, the read fails with a safe error:

- After a successful file content overflow, valid metadata with a size at or below `maxBytes` gives the `invalid_response` provider error with status 502.
- After a successful file content overflow, a metadata failure gives its own safe error.
- After a typed provider error, that error stays when the metadata is valid or the metadata failure is a typed provider error.
- After a typed provider error, an oversized metadata reply gets the generic response error.

The [Files backend](../files/README.md) checks decoded byte counts and converts file content for browser responses.
Provider failures use safe typed errors.
Upstream error messages never reach the browser.

## File writes

`SandboxProvider.writeFile(sandboxId, path, body, sizeBytes)` is an internal streamed write.
The caller authorizes the workspace and its actual sandbox before calling it.
The adapter obtains a grant through `POST /sandboxes/{id}/files/upload-url`.
It requires `file.upload_url`, method `PUT`, the exact requested canonical path,
a future expiry, and an HTTPS address without user information.
The [upload URL reference](https://docs.boat.dev/api/reference/agent/create-upload-url)
defines the grant and permits files of any size.

The adapter streams the body to that exact address with `application/octet-stream`.
It follows no redirect and sends no cookie, Authorization, or `X-Boat-Org` header.
It forwards each byte without encoding or a complete file buffer.
It counts bytes against `sizeBytes` and requires the stream to finish before success.
An incomplete source, a byte-count mismatch, or a failed transfer gives a safe typed error.
The transfer uses the same 65 second request timeout as file reads.
The adapter keeps the signed address out of its return value and errors.
It does not copy transfer error text or codes.

## Development

Run `npm run test -- worker/files worker/sandbox` from the repository root with Node 24.
Tests use [FakeBoat and local storage](../test-support/README.md).
The transport tests use counted streams to check exact budgets and early cancellation.

### Key Code

- [provider.ts](provider.ts) defines the server's sandbox and file read/write interface.
- [boat.ts](boat.ts) forwards provider operations to the Boat helpers.
- [client.ts](client.ts) creates the provider from the app's Boat values, with or without the membership check.
- [routes.ts](routes.ts) holds the fixed Boat route list.
- [transport.ts](transport.ts) owns request headers and response handling.
- [transport-body.test.ts](transport-body.test.ts) checks normal and command byte limits and safe overflow messages.
- [transport-error-body.test.ts](transport-error-body.test.ts) checks the shared error budget and provider error mapping.
- [file-response.ts](file-response.ts) calculates the file content budget.
- [The shared readers](../http/bounded-body.ts) collect bounded bytes and decode and parse complete JSON bodies.
- [file-read.ts](file-read.ts) parses file replies and runs the metadata fallback.
- [file-read.test.ts](file-read.test.ts) checks size results and safe errors from the metadata fallback.
- [file-write.ts](file-write.ts) validates upload grants and runs the internal file write.
- [file-write-body.ts](file-write-body.ts) counts streamed bytes without buffering the file.
- [file-write.test.ts](file-write.test.ts), [file-write-failure.test.ts](file-write-failure.test.ts), and [file-write-response.test.ts](file-write-response.test.ts) check bytes, path binding, credential separation, safe failures, and response budgets.

See the [access requirements](../../docs/protocol/access-and-security.md#orgs-and-workspaces),
the [rules of the app's Boat key](../../docs/protocol/access-and-security.md#the-apps-boat-key),
and the [file requirements](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
