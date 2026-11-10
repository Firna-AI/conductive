# E2B sandbox client

This adapter implements `SandboxProvider` through the E2B control API and envd.
Desktop and fork return safe typed rejected promises.
The [provider README](../README.md#the-apps-e2b-account) gives account setup.
The [sandbox requirements](../../../docs/protocol/workspaces-and-sandboxes.md#the-provider)
give the account assignment and provider boundary.

## Configuration

An entry in the JSON `SANDBOX_PROVIDER_ACCOUNTS` Worker secret has these fields:

```json
{
  "e2b": {
    "kind": "e2b",
    "apiKey": "<Worker-only API key>",
    "domain": "<trusted EU domain from E2B support>",
    "templateId": "<prepared template ID>"
  }
}
```

The parser keeps valid entries and warns without printing malformed values.
The pinned Boat account keeps `BOAT_API_KEY` and `BOAT_ORG_ID`.
E2B composition also requires D1 and `BOAT_KEY_ENCRYPTION_KEY`.
Control calls use only `https://api.<configured-domain>`.
Envd calls use only `https://49983-<sandbox-id>.<configured-domain>`.
A sandbox ID must fit one DNS label before it enters a host.
Provider response domains and URLs never select a credential destination.

## Lifecycle and durable recovery

The fixed control routes cover create, detail, delete, pause, connect, timeout,
sandbox inventory, snapshot create, snapshot inventory, and template delete.
The client sends `X-API-Key` only to the configured control origin.
Create sets private traffic and filesystem-only timeout pause.
It disables traffic-triggered resume and sends no workspace env values in provider configuration.
Explicit resume requests a disk boot. Ordinary reads never wake a paused sandbox.

A D1 claim precedes each possible allocation or snapshot capture.
An ambiguous outcome uses account and request metadata to recover its identity.
It never dispatches another mutation while that outcome is unknown.
Several matches produce a safe failure instead of choosing a resource.
Snapshot records keep the app name, source sandbox, and full namespaced provider ID.
A pending snapshot returns `saving` until inventory finds it.
Snapshot operations never connect their source sandbox.

The API can certify a safe fresh attempt with `Should-Retry: true`.
That refusal enters the guarded `retryable` state.
The existing lifecycle retry window controls when the next call arrives.
Only one caller can reclaim that state for a fresh attempt.
Input, authentication, billing, and missing-target preflight refusals retain a terminal rejection.
Other uncertified outcomes remain ambiguous. Status alone does not make a conflict or limit refusal safe to repeat.
The adapter adds no hidden retry loop.

## Identity-only cleanup

The internal `allocationMode: 'cleanup'` resolves allocation identity only.
It sends no create, connect, envd, or bootstrap request.
A known ID can be deleted even when no traffic token was recovered.
An unknown dispatched claim keeps its key until inventory resolves it.
Proved no-resource outcomes become atomic tombstones.
They throw the generic `ProviderAllocationAbsent` outcome for the cleanup caller.
A normal provider `not_found` is not that proof.
The Worker marks the existing no-resource ledger intent rejected.
The standalone live-check journal needs no Worker ledger tables.
Tombstones prevent late active retries from dispatching after cleanup.

## Credentials and environment

Create and explicit resume return a traffic token.
AES-GCM encrypts it before D1 stores it.
The encryption context binds both the account and the sandbox ID.
Token storage and create completion use one D1 batch.
Delete removes the encrypted traffic token.
Envd tokens come from a non-mutating detail read for each operation group.
They are never stored. The account API key never reaches envd.

Each actual create and resume writes the current env at `/run/ascii-secrets/env.sh`.
A paused idempotent replay returns its archived identity without env bootstrap.
A root helper precreates a user-owned file with mode 600 on tmpfs.
The adapter streams quoted env bytes through the fixed upload route.
A value-free helper then atomically replaces the env file.
Failure removes the protected temporary file and preserves the old published file.
Env values enter neither process arguments nor helper output.
The helper also publishes the trusted preview ingress identity separately from org env values.

## Commands and files

A provider-owned Python supervisor runs with root access to its private runtime folder.
It drops ordinary child commands to `user` and runs owned bootstrap helpers as root.
It writes raw stdout, stderr, initial process identity, and atomic exit JSON under `/run`.
A runtime-generated safe numeric job ID stays independent of Linux PID reuse.
The ready marker appears only after output files and process metadata exist.
Canceling a detached Start stream does not stop the supervisor.

Waiting commands get 600 seconds. Timeout kills the child process group and records its outcome.
Detached commands have no command deadline. Their startup request keeps the 30-second transport deadline.
Status reads use saved byte offsets with bounded Range requests.
A partial UTF-8 suffix stays at its byte offset until a later poll completes it.
A missing job or a dead/reused supervisor without final status becomes `lost`.
Malformed final status fails safely.

Public file reads use Stat, bounded binary download, and base64 output.
The caller supplies the backend limit, normally 5 MiB.
Content overflow rechecks metadata for the exact size result.
Writes stream octets with counted bytes and require complete source consumption.
No upload follows a redirect or buffers the whole input file.

## Private ports and previews

Network mode returns the requested port with a header traffic credential.
Localhost mode runs the owned root TCP relay helper within its ten-second command deadline.
It preserves the user's listener and returns the assigned network port.
Both modes keep provider origins and credentials on the server.
The port credential strips traffic, access, and provider routing headers.

The shared HTTP preview relay has a separate exact-host check.
Bootstrap writes root-owned `/run/conductive-preview/ingress.json` on tmpfs.
It contains the validated sandbox ID, configured domain, and per-target alias record.
After TCP ensure, the adapter atomically registers the actual shared-relay alias before returning its descriptor.
The runner reads current bounded metadata for every request.
It accepts only the exact sandbox, domain, and registered outer port.
It rejects a target that loops through the outer alias or internal relay port.
The runner removes provider credentials before forwarding HTTP and WebSocket traffic to the app.

## Response budgets

Control success and error bodies each have the 1 MiB budget.
Envd metadata and upload replies use the same bound.
Command operations share one 18 MiB wire/output budget across both streams and their metadata.
A separate predicted JSON budget counts text escaping before later serialization.
It preserves ordinary ASCII capacity without charging decoded text twice to the wire counter.
Readers count actual received bytes. They do not trust Content-Length.
Overflow cancels reading and returns the existing safe response or command error.
Unknown provider text is omitted. Only stable machine codes enter typed errors.

## Development

Run `npm run test -- worker/sandbox/e2b worker/sandbox/provider-contract.test.ts` with Node 24.
The shared contracts cover lifecycle, snapshots, commands, files, ports, and errors on both providers.
Wire tests use [FakeE2b](../../test-support/fake-e2b.ts) and real local D1.
Runtime tests execute the shipped supervisor and env helpers in `.context/`.
They fake timeout outcomes instead of sleeping or asserting elapsed time.
Real E2B boot, tmpfs, private ingress, and filesystem-only snapshot checks need provider access.

### Key Code

- [client.ts](client.ts) composes the provider methods and internal cleanup context.
- [control.ts](control.ts), [envd.ts](envd.ts), and [connect.ts](connect.ts) own fixed-origin requests and bounded wire parsing.
- [allocation.ts](allocation.ts) and [allocation-cleanup.ts](allocation-cleanup.ts) separate active starts from identity recovery.
- [snapshots.ts](snapshots.ts) maps names, recovers saves, and deletes snapshots.
- [commands.ts](commands.ts), [command-status.ts](command-status.ts), and [command-supervisor.py](command-supervisor.py) own job lifetime and byte offsets.
- [environment.ts](environment.ts) and [environment.py](environment.py) stage protected env files and preview metadata.
- [files.ts](files.ts) and [file-content.ts](file-content.ts) own bounded file transfers.
- [ports.ts](ports.ts) owns private port credentials and TCP alias registration.
