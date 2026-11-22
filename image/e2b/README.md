# E2B base template

This template supplies the base software and the private loopback relay for
E2B sandboxes. It uses Ubuntu 24.04, 4 vCPU, and 8192 MiB of memory.
The org image build then installs the newest release of the sandbox
software with the existing [release installer](../install.md#release-installation).

The template installs every tool in
[`BASE_IMAGE`](../../src/shared/base-image.ts): Node 24, npm, pnpm, Bun,
Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh.
It also supplies the `computer` MCP server through the Cua Driver, with
Google Chrome on display `:0`. It supplies no desktop stream.

## Build the template

Run commands from the repository root with Node 24 and the runner packages
installed, as [Developer scripts](../developer-scripts.md) says.

```sh
node image/e2b/build-template.mjs --help
node image/e2b/build-template.mjs --prepare
```

`--prepare` bundles the build script and stages its public inputs under
`.context/e2b-backup-provider/template-builds/`. It installs no CLI and
makes no E2B request. A prepared context is not a built template.

For a real build, supply `E2B_API_KEY` and `E2B_DOMAIN` through the process
environment. Use the key and routing domain of the app's E2B project,
such as `e2b.app` for E2B's default cluster.
Put no key in a command, a source file, `.env`, or `.dev.vars`.

```sh
node image/e2b/build-template.mjs --name conductive-base
```

The script uses the official `@e2b/cli@2.23.0` through `npm exec`.
The first real build can therefore download that CLI into the npm cache.
It builds only a new directory with explicitly copied image inputs.
It does not upload the repository or its secret files.
It removes API URL and debug overrides from the CLI's child environment,
so the selected domain controls its requests.

The ready command checks that the relay service and Docker are active,
and that the relay socket exists. E2B runs this fixed command as `user`.
Each check uses passwordless `sudo -n`. The root checks can use systemd's
private socket before the system bus is ready. The socket check needs root
to reach `/run/conductive-e2b`, whose mode is 0700.

After the build, it reads the CLI's JSON template list and finds one
matching template with 4 CPUs and 8192 MiB. It prints the actual template
ID alone to stdout. It saves `build-result.json` beside the staged files,
with the template ID, build ID, domain, CPU, memory, disk, and envd version.
The manifest contains no credential or creator email. Raw CLI output is
suppressed, including on failure.

Use the printed ID as the template ID of the E2B provider account, as
[Deployment inputs](../../docs/deployment.md) says.
Disk capacity comes from the project setting at build time.
The reported `diskSizeMB` is the provisioned disk size in MiB.
Ask support for the required capacity before relying on it.
The CLI's `minFreeDiskMb` setting describes free space after a build.
It does not set a total disk size.

## Software and pins

`install-base.sh` installs the Ubuntu packages and enables Docker.
It installs Ubuntu's [`dbus` package](https://packages.ubuntu.com/en/noble/dbus)
for the system message bus. Its `dbus-system-bus-common` dependency supplies
`dbus.socket`, and `dbus` supplies `dbus.service`.
Both units have no `[Install]` section. The installer uses
`systemctl add-wants sockets.target dbus.socket` to keep the socket in the
boot dependencies. It starts the socket during the template build too.
The socket activates the system bus at `/run/dbus/system_bus_socket`.
Read-only `systemctl` queries then work as `user` without sudo after each
filesystem boot. Commands that start, stop, or enable units still need root.

It installs the base Node from the URL, digest, and version of
[`IMAGE_NODE_RUNTIME`](../../worker/lifecycle/image-runtime.ts).
It checks the digest of the archive before it unpacks it under
`/opt/conductive-e2b/node/<version>`.
The base image also puts Node, npm, and npx on the ordinary user's path.
This base Node is separate from the private Node of each release, which the
runner uses.

`install-tools.sh` pins pnpm 12.18.0, Bun 1.4.4, and uv 0.13.7.
It verifies the Bun and uv release archives before it unpacks them.
The pins and digests come from the publisher's release metadata:

- [pnpm package](https://registry.npmjs.org/pnpm/12.18.0).
- [Bun release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4)
  and [asset digests](https://api.github.com/repos/oven-sh/bun/releases/tags/bun-v1.4.4).
- [uv release](https://github.com/astral-sh/uv/releases/tag/0.13.7)
  and [asset digests](https://api.github.com/repos/astral-sh/uv/releases/tags/0.13.7).

`install-computer.sh` installs Xvfb, Openbox, and the MIT-licensed Cua Driver
0.54.0. It downloads only the stable Linux x86-64 binary archive from
[release `cua-driver-rs-v0.54.0`](https://github.com/trycua/cua/releases/tag/cua-driver-rs-v0.54.0).
Its SHA-256 is `53b38ee3a5aeed39bdcd3acee0bea98a0eed3315e9df2d8af73345680c49868e`,
from the release's
[`SHA256SUMS`](https://github.com/trycua/cua/releases/download/cua-driver-rs-v0.54.0/SHA256SUMS).
The installer checks the digest before extraction. It installs `cua-driver`
and `cua-cursor-theme` from the archive root. It installs no nightly build,
SDK library, Wayland helper, or AGPL extension, including `cua-perception`.

`install-chrome.sh` installs `google-chrome-stable` from Google's signed apt
repository. Chrome follows that repository's stable version at template
build time. It uses no snap. The installer verifies the primary signing
key fingerprint `EB4C1BFD4F042F6DDDCCEC917721F63BD38B4796`, published on
[Google's Linux repository page](https://www.google.com/linuxrepositories/).
It exports only that key into a repository-specific keyring. Apt verifies
the repository metadata and the downloaded package against that key.

## Computer services

The template installer enables and starts four systemd services.
They start again at every filesystem boot:

- `conductive-e2b-display.service` starts Xvfb on `:0` at 1920 by 1080,
  with 24-bit colour and no TCP listener. It reports ready through Xvfb's
  display notification pipe. It removes the previous boot's display socket
  and lock before starting Xvfb.
- `conductive-e2b-desktop.service` starts Openbox and a session D-Bus.
  Openbox reports ready after its startup. The user-owned runtime directory
  `/run/conductive-e2b-desktop` holds the bus socket with mode 0700.
- `conductive-e2b-chrome.service` starts Google Chrome on that display,
  with accessibility enabled and an empty page. Its disposable profile
  stays under `/run`, so a saved image keeps no browser process lock.
- `conductive-e2b-computer-config.service` merges `mcpServers.computer`
  into `/home/user/.claude.json` before the runner starts.

The computer services do not delay envd startup. The config service waits
for the desktop, and only the runner waits for the config service.

The config service runs as `user`. It creates a missing file with mode
0600. It replaces only `computer` and keeps every other key and MCP server.
It warns and keeps the existing file when it cannot parse or write it.
The entry starts `/usr/bin/env` with these arguments, in order:

```text
DISPLAY=:0
DBUS_SESSION_BUS_ADDRESS=unix:path=/run/conductive-e2b-desktop/bus
XDG_RUNTIME_DIR=/run/conductive-e2b-desktop
/usr/local/bin/cua-driver
mcp
```

The entry has no `env` field. The runner reads it at each agent start.
Every published runner release passes its command and arguments to both
agents. The launcher therefore supplies the desktop settings even when
an older runner does not pass a server's `env` field to Codex.

Linux `cua-driver mcp` owns its runtime, so the template starts no driver
daemon. The pinned
[runtime guide](https://github.com/trycua/cua/blob/cua-driver-rs-v0.54.0/libs/cua-driver/rust/Skills/cua-driver/RUNTIME.md#preflight-and-transport)
states this mode. One-shot driver CLI calls use a daemon instead.
The pinned
[Linux guide](https://github.com/trycua/cua/blob/cua-driver-rs-v0.54.0/libs/cua-driver/rust/Skills/cua-driver/LINUX.md#at-spi-needs-the-session-bus-headless--containers--runuser)
explains why the graphical programs and the MCP process share a D-Bus.
These services need no workspace credential. A filesystem-only resume
starts them again from disk and writes the computer entry again.

## Private loopback relay

The E2B ingress reaches a sandbox's network address.
The relay lets that ingress reach a web server that listens only on
`127.0.0.1` or `::1`. Network mode uses the server's port directly.
The terminal already has a network listener.

The enabled `conductive-e2b-port-relay.service` copies the public helper
from `/usr/local/lib/conductive-e2b/port-relay.py` to
`/run/conductive-e2b/port-relay.py` at each service start.
Its control socket is `/run/conductive-e2b/relay.sock`.
The directory is root-owned mode 0700. The socket is mode 0600.
The helper accepts a port, and no host, URL, or token.

The adapter runs this owned command as root:

```sh
systemctl start conductive-e2b-port-relay.service
/usr/bin/python3 /run/conductive-e2b/port-relay.py ensure 3000
```

The complete adapter command has a 10-second deadline.
The service uses `Type=notify` and reports ready after its socket exists.
Starting it before `ensure` also covers a cold boot where envd becomes
available before the relay service starts.
The service does not block envd startup.

A successful ensure prints one object and exits 0:

```json
{"targetPort":3000,"listenPort":41235}
```

The OS assigns each network listener's port.
Repeated and concurrent requests for a target reuse one listener.
The daemon forwards raw bytes to IPv4 loopback, with IPv6 loopback as a
fallback. It preserves write half-close, so a response can finish after
the request ends. It also forwards binary and WebSocket traffic.
The relay holds no token. The adapter's private ingress credential
protects the selected listener.

Its socket, helper copy, listener map, and connections live under `/run`
or in memory. A filesystem-only resume starts the service with empty
runtime state. The source under `/usr/local/lib` contains only code.

## Checks and live prerequisites

[E2B image live check](live-check.md) gives the provider mode of the
existing live entry. It uses persistent local D1 state and the real client.
It builds clean disposable images and checks both preview relay layers.
Its base probe requires an active `dbus.socket` through `systemctl` as
`user`, without sudo. Its boot probe checks the same socket after image
restore and filesystem-only resume. Its service queries also run without sudo.
It checks the actual stdio computer server, a 1920 by 1080 screenshot, and
a visible Chrome page before and after filesystem-only image restores and
resume. The computer process gets only the entry's command and arguments,
with `HOME` and `PATH` as its initial environment. This checks the Codex
launch path without adding the desktop settings from the probe process.
These computer probes run only in a real E2B live check.
Its help and prepare modes need no key. A real run needs the project
inputs and support settings described in that guide.

The relay integration tests run through the existing root Vitest setup:

```sh
npm run test -- worker/lifecycle/e2b-relay.test.ts
npx tsc -p image/tsconfig.json
```

The tests use the real Python relay and local TCP peers in private scratch
directories. They need no provider key or running E2B sandbox.

A real template build and boot still need the E2B project and its credentials.
The live checks must prove systemd boot, `/run` tmpfs, filesystem-only
resume, the requested disk capacity, and the shared image installers.
The project also needs filesystem-only support and the operating
authorizations in [Deployment inputs](../../docs/deployment.md).

### Key code

- `Dockerfile`, `install-base.sh`, `install-tools.sh`: the base software.
- `install-computer.sh`, `install-chrome.sh`: the desktop and verified downloads.
- `display-start.py`, `display.service`, `desktop.service`, `desktop-session.conf`,
  `chrome.service`: display readiness, the session bus, Openbox, and Chrome.
- `computer-config.py`, `computer-config.service`: the boot-time MCP merge.
- `build-template.mjs`, `template-build.ts`: the developer entry and build.
- `template-context.ts`: the public upload context and shared Node inputs.
- `template-cli.ts`: the pinned CLI invocation and private output handling.
- `port-relay.py`, `port-relay.service`: the runtime listener owner.
- [`e2b-relay.test.ts`](../../worker/lifecycle/e2b-relay.test.ts): the relay
  behavior checks, with its adjacent test support.
- `live-state.ts`, `live-provider.ts`: persistent local D1 and the real client.
- `live-main.ts`, `live-builds.ts`, `live-resources.ts`: the image chain and cleanup.
- `live-probes.ts`, `computer-probe.py`, `live-preview.ts`: runtime,
  computer MCP, and private ingress assertions.
