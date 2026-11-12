# E2B image live check

This mode of the [developer live check](../developer-scripts.md#live-check)
checks the [E2B template](README.md) and the production image installers.
It uses the real E2B client with a persistent local D1 database.
It creates no app user, org, workspace, GitHub token, or agent session.

## Prepare without credentials

Run from the repository root with Node 24 and the existing root and runner
packages installed. Build the current runner bundles first:

```sh
npm --prefix runner run build
node image/live-check.mjs --provider=e2b --help
node image/live-check.mjs --provider=e2b --prepare
```

The bundle check includes `relay.mjs`, the shared HTTP preview relay.
`--prepare` checks the bundle files, provider migration, and script imports.
It uses no provider, image, sandbox, or agent.
Preparation does not prove a real template or runtime check.

The default live-check mode still uses Boat and retains its chat and
placement measurements. This E2B mode runs a separate image/runtime check.
The app chat, terminal, and preview smoke tests remain separate work.

## Real inputs

Supply the required values through the process environment.
Put no credential in a saved command, file, `.env`, or `.dev.vars`.

| Name | Value |
| --- | --- |
| `LIVE_E2B_KEY` | The API key of the dedicated EU project. |
| `LIVE_E2B_DOMAIN` | The routing domain of that project. |
| `LIVE_E2B_TEMPLATE_ID` | The actual ID printed by the template builder. |
| `LIVE_E2B_STATE_KEY` | A stable 32-byte random encryption key, encoded as Base64. Keep it in memory and reuse it for the same state directory. |
| `LIVE_RUNNER_ARCHIVE_URL` | The public HTTPS URL of the current packaged runner archive. |
| `LIVE_RUNNER_ARCHIVE_SHA256` | The digest of that exact archive. It must include `runner/relay.mjs`. |

Optional inputs:

| Name | Value |
| --- | --- |
| `LIVE_E2B_STATE_DIR` | Persistent provider state under `.context/`. Default: `.context/e2b-backup-provider/live-state`. Use a separate directory for each project. |
| `LIVE_OUTPUT` | A report directory under `.context/`. The default has a fresh run ID. |

No app cookie, private repository, or agent login is needed.
Use a project with the EU region and filesystem-only support enabled.
Confirm the required disk capacity and the operating authorization from
[Deployment inputs](../../docs/deployment.md).

With those inputs available:

```sh
node image/live-check.mjs --provider=e2b
```

## Image chain

1. Create a clean sandbox from the configured template.
2. Check Ubuntu, the base tools, Node 24, Python 3.12, and a disposable Docker container.
3. Install the production workspace tools, runner, terminal, and HTTP preview relay.
4. Run a harmless install script and write public disk and runtime markers.
5. Save filesystem-only image A and delete the first build sandbox.
6. Close the local D1 runtime and reopen its persistent path with the same key.
7. Create another build sandbox from image A through the saved mapping.
8. Check marker retention and run the same production installers again.
9. Save filesystem-only image B and delete the second build sandbox.
10. Create a probe sandbox from image B and run the runtime and ingress assertions.
11. Pause and resume it without memory, then check fresh runtime state and preview access again.
12. Delete the owned sandboxes and temporary saved images.

Saved images contain no app workspace, GitHub credential, agent login,
workspace token, or org secret. The repository folder is a harmless local
Git repository created only for this check.

## Runtime and ingress assertions

The check requires 4 CPUs and 8192 MiB in the provider's sandbox detail.
The provider's `diskSizeMB` field reports provisioned disk size in MiB.
The check converts that value to bytes and requires the requested 51 GB.
It records formatted filesystem capacity separately as an observation.
It requires systemd as PID 1 and tmpfs at `/run`.
It checks enabled services and verifies that runner and terminal stay
gated without workspace credentials or ready markers.
It checks that disk markers survive and runtime markers disappear.
The environment file must contain the current harmless probe value with
mode 0600. The preview ingress metadata must remain root-owned mode 0444.
A detached job from before the pause must become lost after the resume.

A disposable HTTP server binds IPv4 loopback, IPv6 loopback, and a network
port. The private preview descriptor first reaches the E2B TCP relay.
That relay reaches the shared HTTP preview relay on its configured port.
The HTTP relay then reaches the probe server with a localhost Host header.
The probe gets the descriptor's exact private header names and the shared
preview-port header. HTTP and WebSocket requests retain the traffic token
and send harmless values for each other checked header. Routing values
use the actual sandbox ID and outer relay port. The controller records
success only when the probe finds none of these headers.
It also checks binary WebSocket traffic through both layers.
A request without the traffic credential must get 403.
Network mode must reach the network-bound server directly.
After the pause, the shared HTTP relay must reject the old ingress alias
before the adapter registers a fresh one.

The shared HTTP relay, socket, runner archive, and installers come from
their production sources. The script does not maintain copies of them.

## State, output, and cleanup

The local Miniflare database holds only the provider's durable claims,
snapshot mappings, and encrypted traffic credentials.
It applies the actual provider migration once, by filename.
It adds no migration digest gate and never opens the deployed app's D1.
The process must receive the same encryption key when it reopens that state.

`resources.json` records safe allocation keys and resource identities.
`summary.json` records selected assertion booleans and observed resource
counts. Neither report stores raw provider output or credentials.
The result identifies its scope as `e2b-image-runtime`.

Cleanup runs after success and failure. An ambiguous create without an
identity uses a separate identity-only cleanup client. It resolves the
recorded key without creating, connecting, or bootstrapping a sandbox.
A typed no-allocation result tombstones the key and clears the entry.
An unknown dispatched operation remains in `cleanupNeeded` with its key.
An HTTP 404 from deletion of a known sandbox or snapshot means it is absent.
An HTTP 404 from inventory does not prove that an allocation is absent.
A failed snapshot deletion remains there with its app snapshot name.
Keep the report, state directory, and encryption key until cleanup finishes.
Inspect unresolved resources in the provider project before deleting that state.
An incomplete cleanup makes the check fail and keeps `completed` false.

The offline state-reopen and journal integration tests use real local D1
and the E2B fake. They check identity-only cleanup and retained unknown
operations. A separate test checks the provisioned MiB disk size against
the request while retaining formatted capacity as an observation.
These tests do not prove a real EU runtime.
