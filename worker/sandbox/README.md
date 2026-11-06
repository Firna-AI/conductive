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

## File reads

`SandboxProvider.readFile(sandboxId, path, maxBytes)` takes the backend's file byte limit.
It returns a file result or a size result.
The file result has the path, size, encoding, and content.
The size result has the exact reported file size and the caller's limit.

The adapter calls `GET /sandboxes/{id}/files` with the path and base64 encoding.
Only that content response has a byte budget.
The budget is the sum of these values:

- Four bytes for each complete or partial group of three permitted file bytes.
- The UTF-8 byte length of the documented JSON envelope, with two-space formatting.

The envelope includes the JSON-escaped requested path and the largest safe integer size.
It also includes the response type, encoding, booleans, and empty content field.
The file route is the first caller of the [shared bounded body reader](../http/README.md).
The shared reader counts each `Uint8Array.byteLength` before keeping the chunk.
When the next chunk crosses the budget, it cancels the stream and discards that chunk.
The file adapter parses JSON only after the shared reader returns the complete body bytes.

After overflow, the adapter calls `GET /sandboxes/{id}/files/info` with the same path.
It parses Boat's flat metadata response and returns its file size.
It checks the path in both file and metadata responses.
The metadata request uses the normal response parser.
No metadata, account, lifecycle, command, or snapshot response budget is added here.
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
