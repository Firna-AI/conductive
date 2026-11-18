# Preview relay

This guide belongs to the [runner README](README.md#preview-relay). It
gives the preview relay of the sandbox: what it does, how it starts, and
how an image installs it.

The preview relay connects preview requests to servers in the sandbox.
It gives each server `Host: localhost:<port>`.
It streams HTTP bodies and WebSocket traffic.
It adds `X-Conductive-Relay: 1` to every response, including errors and upgrade handshakes.
It replaces any value for this header that the previewed server sends.
The Worker uses the mark to distinguish relay answers from provider answers.
The Worker removes the mark before it sends the answer to the browser.
The [preview requirements](../docs/protocol/terminal-previews-and-desktop.md#port-previews)
state its access rules.

`conductive relay` starts the Rust relay from
[cnd-relay](../crates/cnd-relay/README.md).
With one systemd descriptor for its own process ID, it listens on descriptor 3.
Without those activation variables, it listens on `127.0.0.1:7682`.
The relay uses Hyper and Tokio and ships inside the static `conductive` program.
It tries IPv4 loopback, IPv6 loopback, then the sandbox's other local addresses.
It connects before it reads the upload body, so a refused address loses no body.

Run `cargo test -p cnd-relay` for the real local HTTP and WebSocket tests.
Run `cargo test -p cnd-cli --test relay_activation_tests` for the shipped
command with `systemd-socket-activate`. That test needs no running systemd manager.

The [image installer](../image/install.md) installs a separate relay service.
It also installs and enables `conductive-preview-relay.socket`.
The socket holds port 7682 while the relay service restarts.
Both units stay enabled, so the service starts without waiting for a preview request.
A runner restart alone does not restart the relay.
When a runner start applies a release, the system installer restarts a running relay.
So the relay runs the active release, and not the release that was active at boot.
The release system part installs its start script and units.
The script executes `/opt/conductive/current/conductive relay`.
A workspace downloads newer software in the background. The relay runs it
from its next start, also when the runner installs it earlier at idle, as
[Release updates](../image/README.md#release-updates) describes.

## Private ingress identity

The Boat host check keeps its existing private relay address rule.
E2B uses the trusted `/run/conductive-preview/ingress.json` record instead.
The Worker writes this root-owned, read-only file on tmpfs outside org env values.
It binds the sandbox ID, configured domain, and exact outer alias of each relay target.
The TCP helper can choose a new outer port after restart.
The Worker registers that alias atomically before it returns the descriptor.
The relay reads current metadata for every HTTP request and WebSocket handshake.
It accepts only the exact registered address of its own relay port.
Wrong IDs, domains, outer ports, and duplicate Host fields are refused on this path.
A target cannot be the internal relay port or its current outer alias.
A malformed or unreadable present metadata file fails closed.
A missing file keeps the Boat path, and the reader does not cache that absence.

The reader opens only the fixed path, without following a symlink and
without blocking.
It requires a regular root-owned file without group or other write permission.
It reads at most 1025 bytes and accepts at most 1024.
The provider credential and routing headers never reach the previewed app.
The relay strips `e2b-traffic-access-token`, `x-access-token`,
`e2b-sandbox-id`, and `e2b-sandbox-port` on HTTP and WebSocket requests.
The Worker's port credential also strips those names from replies.
Both take the metadata path and the exact header list from
[`preview-ingress-config.json`](../src/shared/preview-ingress-config.json).
The Worker imports that file, and the relay embeds it at build time.
`PreviewIngressIdentity` in
[`cnd-runner-interface`](../crates/cnd-runner-interface/README.md) defines
the shape of the record for both languages.

## Development

`cargo test -p cnd-relay` also covers the E2B path with real local HTTP and
WebSocket servers.
The tests keep the Boat host guards and check the exact current E2B alias.
They also check metadata trust, alias changes, credential removal, streams, and disconnects.
A live probe test runs the shipped
[E2B preview probe](../image/e2b/preview-probe.mjs) through the real relay
over IPv4, IPv6, binary WebSocket frames, and the direct network path.
This local proof needs no E2B credential.
The deployed private ingress and cold-boot path still need the live check.

### Key Code

- [ingress.rs](../crates/cnd-relay/src/ingress.rs) checks the trust and the
  shape of the current protected metadata.
- [ingress_file.rs](../crates/cnd-relay/src/ingress_file.rs) reads the
  metadata file through a descriptor, with the size limit.
- [headers.rs](../crates/cnd-relay/src/headers.rs) checks the host and the
  target and removes the private headers.
- [proxy.rs](../crates/cnd-relay/src/proxy.rs) streams HTTP requests and
  WebSocket upgrades to the selected local server.
