# Response limits

This guide belongs to the [sandbox provider](README.md). It gives the
byte budget of each response of the fixed Boat routes, and the errors
of a response that passes its budget.
[File reads](README.md#file-reads) gives the file content budget and the
metadata fallback.

## Response byte limits

Every Boat API response uses the [shared bounded JSON reader](../http/README.md#bounded-json-reader).
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

A successful file content overflow instead keeps the metadata fallback that [File reads](README.md#file-reads) describes.
An oversized file error reply gets the generic response error and does not start that fallback.
An oversized metadata reply also gets the generic response error.

An error reply within 1 MiB keeps the ordinary typed provider error, status, provider code, and retry metadata.
Malformed success replies keep the `invalid_response` provider error with status 502.
Malformed error replies keep their upstream status and retry metadata without a provider code.
A typed provider error from a file content read also starts the metadata fallback.
