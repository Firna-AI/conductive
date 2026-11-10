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
