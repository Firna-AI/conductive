# Sandbox provider

This area owns Boat transport and the org's encrypted sandbox key.
Call `orgSandboxProvider` with the authorized user and org.
It checks membership and returns `SandboxProvider` without exposing the key.
The caller must first check that the sandbox belongs to an authorized workspace.

The transport creates the URL and headers from fixed routes.
It pins the saved account with `X-Boat-Org` and forwards no browser cookie.

## Response byte limits

Only the file content response has a transport byte budget.
The other fixed routes read the complete JSON response.
This includes provider error replies.
The [public OpenAPI schema](https://docs.boat.dev/openapi/boat-v1.yaml) gives no total response byte maximum for these routes.

| Fixed route | Current transport budget | Published bounds and gaps |
| --- | --- | --- |
| `GET /orgs` | None | The org array has no item bound. Org strings have no length bound. |
| `POST /sandboxes` | None | Sandbox strings and labels have no response byte bound. |
| `GET`, `PATCH`, `DELETE /sandboxes/{id}` | None | Sandbox data and error replies have no total byte bound. |
| `POST /sandboxes/{id}/stop`, `/resume`, `/fork` | None | Sandbox data and error replies have no total byte bound. |
| `POST /sandboxes/{id}/commands` | None | Waiting commands permit 8 MiB for each output stream. The complete JSON response has no byte bound. |
| `POST /saved-snapshots` | None | Snapshot strings, including failure details, have no total byte bound. |
| `GET`, `DELETE /saved-snapshots/{name}` | None | Snapshot data and error replies have no total byte bound. |
| `GET /sandboxes/{id}/files` | `4 × ceil(maxBytes / 3) + envelopeBytes` | File content can reach 5 MiB. The caller sets `maxBytes`. |
| `GET /sandboxes/{id}/files/info` | None | Metadata strings and error replies have no total byte bound. |

The [organization reference](https://docs.boat.dev/api/reference/account/list-organizations) defines the org array.
The [limits reference](https://docs.boat.dev/limits#other-limits) states the command output limit.
The [command reference](https://docs.boat.dev/api/reference/agent/execute-sandbox-command) defines both output fields and the other response fields.
The [file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file) states the 5 MiB content limit.
The [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info) defines the file detail fields.

The common error schema leaves message lengths and `error.details` unbounded.
These schemas do not establish a finite budget that accepts every permitted response.
The content limits alone do not bound the complete JSON body.
For example, two 8 MiB output streams can occupy 96 MiB when JSON escapes each control byte with six ASCII bytes.
The JSON envelope adds more bytes.
The shared reader retains the chunks while it allocates the collected byte buffer.

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
The file route uses the [shared bounded body reader](../http/README.md).
The shared reader counts each `Uint8Array.byteLength` before keeping the chunk.
When the next chunk crosses the budget, it cancels the stream and discards that chunk.
The file adapter parses JSON only after the shared reader returns the complete body bytes.

After overflow, the adapter calls `GET /sandboxes/{id}/files/info` with the same path.
It parses Boat's flat metadata response and returns its file size.
It checks the path in both file and metadata responses.
The metadata request uses the normal response parser.
The [primary file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file)
and [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info)
define these two routes.

The [Files backend](../files/README.md) checks decoded byte counts and converts file content for browser responses.
Provider failures use safe typed errors.
Upstream error messages never reach the browser.

## Development

Run `npm run test -- worker/files worker/sandbox` from the repository root with Node 24.
Tests use [FakeBoat and local storage](../test-support/README.md).

### Key Code

- [provider.ts](provider.ts) defines the server's sandbox and file read interface.
- [boat.ts](boat.ts) forwards provider operations to the Boat helpers.
- [keys.ts](keys.ts) checks membership and decrypts the org's key inside this area.
- [routes.ts](routes.ts) holds the fixed Boat route list.
- [transport.ts](transport.ts) owns request headers and response handling.
- [file-response.ts](file-response.ts) calculates the file content budget and parses bounded bytes as JSON.
- [The shared reader](../http/bounded-body.ts) collects body bytes and cancels on overflow.
- [file-read.ts](file-read.ts) parses file replies and reads metadata after overflow.

See the [access requirements](../../docs/protocol/access-and-security.md#orgs-and-workspaces)
and [file requirements](../../docs/protocol/workspaces-and-sandboxes.md#files-and-changes).
