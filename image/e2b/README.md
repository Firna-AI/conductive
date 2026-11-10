# E2B base template

This template supplies the base software and the private loopback relay for
E2B sandboxes. It uses Ubuntu 24.04, 4 vCPU, and 8192 MiB of memory.
The org image build then installs the runner archive and terminal software
with the existing [image installers](../install.md).

The template installs every tool in
[`BASE_IMAGE`](../../src/shared/base-image.ts): Node 24, npm, pnpm, Bun,
Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh.
It supplies no computer MCP server or desktop stream.

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
environment. Use the key and routing domain of the selected EU project.
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
It reuses the Node URL, digest, and version directory from
[`IMAGE_NODE_RUNTIME`](../../worker/lifecycle/image-runtime.ts).
The [private runtime installer](../runtime.md) verifies that archive.
The base image also puts Node, npm, and npx on the ordinary user's path.
The runner keeps its private executable path.

`install-tools.sh` pins pnpm 12.18.0, Bun 1.4.4, and uv 0.13.7.
It verifies the Bun and uv release archives before it unpacks them.
The pins and digests come from the publisher's release metadata:

- [pnpm package](https://registry.npmjs.org/pnpm/12.18.0).
- [Bun release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4)
  and [asset digests](https://api.github.com/repos/oven-sh/bun/releases/tags/bun-v1.4.4).
- [uv release](https://github.com/astral-sh/uv/releases/tag/0.13.7)
  and [asset digests](https://api.github.com/repos/astral-sh/uv/releases/tags/0.13.7).

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
Its help and prepare modes need no key. A real run needs the project
inputs and support settings described in that guide.

The relay integration tests run through the existing root Vitest setup:

```sh
npm run test -- worker/lifecycle/e2b-relay.test.ts
npx tsc -p image/tsconfig.json
```

The tests use the real Python relay and local TCP peers in private scratch
directories. They need no provider key or running E2B sandbox.

A real template build and boot still need the EU project and credentials.
The live checks must prove systemd boot, `/run` tmpfs, filesystem-only
resume, the requested disk capacity, and the shared image installers.
The project also needs filesystem-only support and the operating
authorizations in [Deployment inputs](../../docs/deployment.md).

### Key code

- `Dockerfile`, `install-base.sh`, `install-tools.sh`: the base software.
- `build-template.mjs`, `template-build.ts`: the developer entry and build.
- `template-context.ts`: the public upload context and shared Node inputs.
- `template-cli.ts`: the pinned CLI invocation and private output handling.
- `port-relay.py`, `port-relay.service`: the runtime listener owner.
- [`e2b-relay.test.ts`](../../worker/lifecycle/e2b-relay.test.ts): the relay
  behavior checks, with its adjacent test support.
- `live-state.ts`, `live-provider.ts`: persistent local D1 and the real client.
- `live-main.ts`, `live-builds.ts`, `live-resources.ts`: the image chain and cleanup.
- `live-probes.ts`, `live-preview.ts`: runtime and private ingress assertions.
