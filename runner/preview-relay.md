# Preview relay

This guide belongs to the [runner README](README.md#preview-relay).

The preview relay connects preview requests to servers in the sandbox.
It gives each server `Host: localhost:<port>`.
It streams HTTP bodies and WebSocket traffic.
It adds `X-Conductive-Relay: 1` to every response, including errors and upgrade handshakes.
It replaces any value for this header that the previewed server sends.
The Worker uses the mark to distinguish relay answers from provider answers.
The Worker removes the mark before it sends the answer to the browser.
The [preview requirements](../docs/protocol/terminal-previews-and-desktop.md#port-previews)
state its access rules.

[`src/relay/main.ts`](src/relay/main.ts) starts the relay.
With one systemd descriptor for its own process ID, the relay listens on descriptor 3.
Without those activation variables, it listens on `127.0.0.1:7682`.
[`startPreviewRelay`](src/relay/server.ts) takes a listen port and target
addresses for tests.
The build writes its bundle to `dist/runner/relay.mjs`.
The archive stores that bundle as `runner/relay.mjs`.
It uses only built-in Node modules.

The [image installer](../image/install.md) installs a separate relay service.
It also installs and enables `conductive-preview-relay.socket`.
The socket holds port 7682 while the relay service restarts.
Both units stay enabled, so the service starts without waiting for a preview request.
A runner restart does not restart the relay.
A workspace gets the relay only from a new image build.
A refresh installs no software.
An existing workspace keeps the software of its image, also after a resume.
Start a new workspace from the new image to get the relay.

## Private ingress identity

The Boat host check keeps its existing private relay address rule.
E2B uses the trusted `/run/conductive-preview/ingress.json` record instead.
The Worker writes this root-owned, read-only file on tmpfs outside org env values.
It binds the sandbox ID, configured domain, and exact outer alias of each relay target.
The TCP helper can choose a new outer port after restart.
The Worker registers that alias atomically before it returns the descriptor.
The runner reads current metadata for every HTTP request and WebSocket handshake.
It accepts only the exact registered address of its own relay port.
Wrong IDs, domains, outer ports, and duplicate Host fields are refused on this path.
A target cannot be the internal relay port or its current outer alias.
A malformed present metadata file fails closed.
A missing file keeps the Boat path, and the reader does not cache that absence.

The reader opens only the fixed path without following a symlink.
It requires a regular root-owned file without group or other write permission.
It reads at most 1025 bytes and accepts at most 1024.
The provider credential and routing headers never reach the previewed app.
The relay strips `e2b-traffic-access-token`, `x-access-token`,
`e2b-sandbox-id`, and `e2b-sandbox-port` on HTTP and WebSocket requests.
The Worker's port credential also strips those names from replies.
Both use the exact header list from the shared ingress contract.

## Development

Run `npm --prefix runner test -- src/relay` from the repository root with Node 24.
Tests use real local HTTP and WebSocket servers.
They keep the Boat host guards and check the exact current E2B alias.
They also check metadata trust, alias changes, credential removal, streams, and disconnects.
This local proof needs no E2B credential.
The deployed private ingress and cold-boot path still need the live check.

### Key Code

- [server.ts](src/relay/server.ts) owns the HTTP server and current ingress reader.
- [ingress.ts](src/relay/ingress.ts) reads bounded protected metadata.
- [headers.ts](src/relay/headers.ts) checks the host and target and removes private headers.
- [http.ts](src/relay/http.ts) and [upgrade.ts](src/relay/upgrade.ts) stream requests to the selected local server.
