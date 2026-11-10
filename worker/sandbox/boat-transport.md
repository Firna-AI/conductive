# Boat transport details

The [sandbox provider README](README.md) gives the account and client entry points.

## Response byte limits

[Response byte limits](response-limits.md#response-byte-limits) gives the
budget of each fixed Boat route.

## Response failures

[Response failures](response-limits.md#response-failures) gives the errors
of a Boat response that passes its budget.

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

