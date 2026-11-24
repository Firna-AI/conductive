# cnd-computer

This crate runs the Conductive service on an org's own Linux computer.
The `conductive computer` command uses it for setup, the Worker connection,
and the container engine. `cnd-runner-interface` owns the wire types.
`cnd-release` owns the signed release format.

## Responsibilities

- Check that the server supports rootless Podman and the systemd user service.
- Exchange a one-time code and store the computer token.
- Send resources to the Worker and run its fixed container and image operations.
- Verify signed releases for base images, container bootstrap, and program updates.

## What This Crate Does

`computer check` reports each required capability. It reports separately
whether a computer token is saved. `computer enroll` reads one line from
standard input and saves the token in `$XDG_CONFIG_HOME/conductive/computer.json`.
The default configuration folder is `~/.config`. The file has mode 0600.
The containing Conductive folder has mode 0700. `computer service` installs
and starts the embedded user unit. Stopping the unit leaves Podman containers
running.

`computer run` rereads its credentials before each outbound attempt. The
Worker must accept the hello before the computer handles requests. The
hello carries the program version, available CPUs, total memory, and OS.
The connection pings every 25 seconds and ends after 60 seconds without
an incoming frame. On SIGTERM or SIGINT, the service cancels requests,
closes the connection, and exits. The log contains fixed events and
codes. It excludes credentials, env vars, and process output.

Operations on one container run in order. A failed create removes the
partial container. A failed or cancelled start stops the container if
that request started it. At startup and before operations, the service
unpauses paused Conductive containers. A create caps CPUs and memory at
the server limits.
The env file is written in `/run/ascii-secrets/env.sh` as `user` with
mode 0600. Environment values enter Podman on standard input. The file
contains only shell variable names. Podman mounts `/run` in memory and
`/tmp` on an anonymous volume.

| Operation | Success | Operation-specific errors |
| --- | --- | --- |
| `container.create` | Creates, starts, and writes the env file. Returns `running`. | `already_exists` for the container. `not_found` for an absent org image. Release errors for base images. |
| `container.get` | Returns `running`, `stopped`, or `missing`. | |
| `container.start` | Starts a stopped container and writes the env file. Returns `running`. | `not_found` |
| `container.stop` | Gives Podman 30 seconds for a stop. Returns `stopped`. | `not_found` |
| `container.delete` | Removes the container and volumes. A missing container also returns `container.deleted`. | |
| `image.save` | Pauses a running container during commit and unpauses it when the save succeeds, fails, or is cancelled. Returns `image.saved` on success. | `not_found` for the container. `already_exists` for the image. |
| `container.bootstrap` | Installs the requested release. Apply restarts a running preview relay, as with every apply. Bootstrap then restarts the host service. Returns `container.bootstrapped` with the version. | `not_found` for the container. `invalid_request` when it is stopped. Release errors or `internal`. |

An operation with invalid arguments returns `invalid_request`. A request
over connection capacity returns `busy`. A storage exhaustion error
returns `no_space`. Other engine failures and local deadlines return
`internal`. The local deadline is 14 minutes for create, image save, and
bootstrap. The other operations have 50 seconds.

An absent or invalid pinned program manifest, an absent or invalid
signature, a wrong digest, or an inconsistent signed image returns
`release_invalid`. A network failure or another unavailable release file
returns `release_unavailable`. The program streams base archives to private
temporary files. It verifies the size and digest, then checks the image ID
after Podman loads the archive. Requests for the
same base image share an import. A local marker identifies an interrupted
import. A pinned program download verifies the published manifest bytes and
checks the requested release identity. The program caches verified executables
by version and archive digest.

Automatic updates check for a signed newer release one minute after
startup, then every ten minutes. An update checks the candidate's
`--version` output and waits for accepted requests and their replies.
It records the candidate as a trial and exits. On restart, `current`
still points to the last confirmed release. That release counts each
trial attempt and starts the trial in the same process. A Worker welcome
or 60 seconds of uptime confirms the trial. Confirmation atomically
switches `current` to the trial and records the old release as previous.
After five unconfirmed attempts, the confirmed release records the trial
as refused and runs the service itself.

At startup and when it records a trial, the program prunes cached
programs. It keeps the current, previous, and trial versions. Startup
also removes temporary files from interrupted downloads and installs.
Development builds skip automatic updates.

## Quick Start

Run these commands as the dedicated computer user after installation.

```sh
conductive computer check
printf '%s\n' "$COMPUTER_CODE" | conductive computer enroll
conductive computer service
```

Enrollment accepts `--origin URL` and `--release-server URL`. The defaults
are `https://api.conductive.build` and `https://runner.conductive.build`.
Use HTTPS or a loopback HTTP address. The systemd unit calls
`conductive computer run` from `~/.local/share/conductive/current`.

## Development

Run these commands from the repository root.

```sh
cargo test -p cnd-computer
cargo test -p cnd-cli
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli
```

The tests use mocked effects, local HTTP and WebSocket servers, a Podman
stub executable, and a shell. They run with no Podman installation or root access.

### Key Code

- [Setup](src/settings.rs) owns the paths and private credential file.
- [Enrollment](src/enrollment.rs) exchanges the one-time code.
- [Health report](src/preflight.rs) checks systemd and Podman capabilities.
- [Service](src/service.rs) installs the embedded systemd user unit.
- [Runtime](src/runtime.rs) applies connection and retry limits.
- [Session](src/session/serve.rs) negotiates the connection and serves requests.
- [Wire codec](src/wire.rs) verifies and assembles binary message parts.
- [Dispatcher](src/operations/dispatch.rs) validates and serializes operations.
- [Podman](src/engine/podman.rs) builds local command arguments.
- [Release client](src/releases/http.rs) verifies release files with the caller's public key.
- [Launcher](src/update/launch.rs) counts tries and starts the trial program.
- [Updater](src/update/runtime.rs) confirms trials and stages verified releases.

### Related Docs

- [Architecture](../../docs/architecture.md)
- [Own computers](../../docs/protocol/own-computers.md)
- [Host connection](../../docs/protocol/host-connection.md)
- [Sandbox software](../../docs/protocol/sandbox-software.md)
- [CLI](../cnd-cli/README.md)
