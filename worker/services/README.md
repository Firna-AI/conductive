# Worker services

This area owns the selected service catalogue, explicit service controls,
and log reads of one workspace. It runs inside that workspace's Durable
Object. It is separate from `worker/tools/services.ts`, which composes
workspace tool calls. Local agent service calls stay on the cloud computer.

[Service reports](../../docs/protocol/service-reports.md) and
[Services in the app](../../docs/protocol/services-in-the-app.md) give the
boundary rules. Rust owns the generated service contracts in
[cnd-runner-interface](../../crates/cnd-runner-interface/README.md).

## Runner boundary

`RunnerChannel` owns `WorkspaceServices`. Private messages enter before
`parseRunnerTransport` and numbered receipt work. A successful optional
negotiation keeps the connection and sandbox binding in the saved runner
record. A failed optional negotiation leaves chat available without services.
`RunnerConnectionState` owns the optional support and binding fields in
`ActiveRunner.state`. Its saved JSON record keeps those fields flat.

`ServiceParts` joins consecutive fragments once, then the document readers
copy the known fields. Filtering uses the running environment capture,
allowed secret-output values, and `OutputSanitizer`. Display cuts follow
the port-label code. A malformed transfer writes a fixed warning. A matching
control becomes unconfirmed; a matching log read fails with fixed text.

`ServiceReports` exposes only a snapshot delivered by the current connection.
It resolves the originating turn to the current session title at read time.
The session list already gives every workspace reader the same session
metadata. A missing turn or session gives Local command.

## State and waits

The `services:v1:` prefix keeps filtered catalogue and control records apart
from chat commands and receipts. `ServiceValues` writes 16,000-character
internal parts in a transaction. Definitions, arguments, environment values,
raw report text, and raw logs never enter this storage.

Controls keep their observed target and outcome under a digest of the request
ID. The chat queue registers the waiter and sends once. The HTTP request waits
outside that queue, so runner replies can enter it. A disconnect finishes
pending controls as unconfirmed. No control resends after a reconnect.

Log reads run one at a time in the workspace. Each read has a new runner
request ID. Its app response keeps the original browser request. Complete-text
filtering precedes the line and UTF-8 byte cuts. There is no raw log cache.

Computer Stop finishes pending controls as computer stopped, deletes every
control record, clears the catalogue, and ends log reads. Software Restart
keeps service storage. Its failure path also keeps it, while a runner
disconnect still makes a pending control unconfirmed.

## Development

Run from the repository root with Node 24:

```sh
npm run test -- worker/services
npm run typecheck
npm run lint
npm run format:check
```

The native integration tests use real feature routes and runner sockets.
They check access, correlation, filtering, hibernation, stop cleanup,
software restarts, compatibility, and unchanged activity and idle deadlines.

### Key Code

- [runtime.ts](runtime.ts): `WorkspaceServices` joins the private runner path, feature operations, and cleanup.
- [negotiation.ts](negotiation.ts): `negotiateServices` accepts or declines the optional connection support.
- [handler.ts](handler.ts) and [access.ts](access.ts): the fixed feature routes and the reused header Restart access checks.
- [binding.ts](binding.ts): `ServiceConnection` checks the current authenticated connection and captured sandbox identity.
- [parts.ts](parts.ts), [report-input.ts](report-input.ts), and [result-input.ts](result-input.ts): multipart assembly and document validation.
- [filter.ts](filter.ts): complete-field filtering, display labels, and the app log excerpt.
- [catalogue.ts](catalogue.ts): `ServiceReports` stores revisions and resolves current session provenance.
- [controls.ts](controls.ts): `ServiceControls` stores request correlation, joins duplicates, and resolves or clears controls.
- [logs.ts](logs.ts): `ServiceLogs` serializes raw reads and resolves transient waiters.
- [storage.ts](storage.ts): `ServiceValues` reads and writes chunked values under the service-only prefix.
- [../../src/shared/services.ts](../../src/shared/services.ts) and [../../src/shared/service-inputs.ts](../../src/shared/service-inputs.ts): route helpers, runtime limits, and request readers.
