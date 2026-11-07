# Sandbox provider

This area owns Boat transport and the org's encrypted sandbox key.
Call `orgSandboxProvider` with the authorized user and org.
It checks membership and returns `SandboxProvider` without exposing the key.
The caller must first check that the sandbox belongs to an authorized workspace.

Trusted feature code can call `authorizedOrgSandboxProvider` after it authorizes
the workspace and org. This factory reuses the same encrypted key handling.
It returns no plaintext key. `orgSandboxProvider` retains its membership check
and its existing missing-key behavior.

The transport creates the URL and headers from fixed routes.
It pins the saved account with `X-Boat-Org` and forwards no browser cookie.

`SandboxProvider.privatePort(sandboxId, port, mode)` calls only the fixed host
route. It requires explicit localhost or network mode and private access.
It parses the provider URL into a server-only origin and token.
`SandboxProvider.desktop(sandboxId)` calls only the fixed desktop route.
It returns a typed ready URL or a starting result. Ready URLs require HTTPS
and a fragment token. The feature layer maps starting into its public response.
Both methods use the same `BoatTransport` as commands, lifecycle, and file reads.
The transport validates sandbox ID segments and centralizes errors and account pinning.

`SandboxProvider.runCommand` and `SandboxProvider.startCommand` both call `POST /sandboxes/{id}/commands`.
`runCommand` waits for the command, with a 600 second Boat timeout and a 610 second request timeout.
`startCommand` starts a detached command, with a 30 second request timeout.
`SandboxProvider.getCommandStatus` reads detached output from byte offsets, with the same 30 second timeout.

## Response byte limits

Every Boat response uses the [shared bounded JSON reader](../http/README.md#bounded-json-reader).
The following limits are Worker policy chosen by the user.
They are not published Boat response maxima.
The Worker counts received bytes and does not trust `Content-Length`.
A body at its exact budget passes the size check.
A larger body fails, even when Boat permits it.
Here, a successful response has an HTTP 2xx status.
A command with a nonzero exit code still uses 18 MiB when its HTTP response is successful.

| Fixed route | Successful response budget | Error response budget |
| --- | --- | --- |
| `GET /orgs` | 1 MiB | 1 MiB |
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

Here, 1 MiB is 1,048,576 bytes.
The 18 MiB command budget is 18,874,368 bytes for the complete JSON body.
It includes both output streams, JSON escaping, metadata, and whitespace.
Boat permits 8 MiB of output for each waiting command stream.
Two plain ASCII streams at that limit fit with room for the envelope.
More JSON escaping can make an otherwise permitted command reply exceed the Worker budget.

The [organization reference](https://docs.boat.dev/api/reference/account/list-organizations) defines the org array.
The [limits reference](https://docs.boat.dev/limits#other-limits) states the command output limit.
The [command reference](https://docs.boat.dev/api/reference/agent/execute-sandbox-command) defines both output fields and the other response fields.
The [file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file) states the 5 MiB content limit.
The [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info) defines the file detail fields.

The [public OpenAPI schema](https://docs.boat.dev/openapi/boat-v1.yaml) gives no total response byte maximum for most routes.
The org list has no item bound.
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

After overflow, the adapter calls `GET /sandboxes/{id}/files/info` with the same path.
It checks Boat's flat metadata response and returns its file size.
It checks the path in both file and metadata responses.
The metadata request uses the 1 MiB response budget.
The [primary file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file)
and [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info)
define these two routes.

The [Files backend](../files/README.md) checks decoded byte counts and converts file content for browser responses.
Provider failures use safe typed errors.
Upstream error messages never reach the browser.

## Development

Run `npm run test -- worker/files worker/sandbox` from the repository root with Node 24.
Tests use [FakeBoat and local storage](../test-support/README.md).
The transport tests use counted streams to check exact budgets and early cancellation.

### Key Code

- [provider.ts](provider.ts) defines the server's sandbox and file read interface.
- [boat.ts](boat.ts) forwards provider operations to the Boat helpers.
- [keys.ts](keys.ts) checks membership and decrypts the org's key inside this area.
- [routes.ts](routes.ts) holds the fixed Boat route list.
- [transport.ts](transport.ts) owns request headers and response handling.
- [transport-body.test.ts](transport-body.test.ts) checks normal and command byte limits and safe overflow messages.
- [transport-error-body.test.ts](transport-error-body.test.ts) checks the shared error budget and provider error mapping.
- [file-response.ts](file-response.ts) calculates the file content budget.
- [The shared readers](../http/bounded-body.ts) collect bounded bytes and decode and parse complete JSON bodies.
- [file-read.ts](file-read.ts) parses file replies and reads metadata after overflow.

See the [access requirements](../../docs/protocol/access-and-security.md#orgs-and-workspaces)
and [file requirements](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
