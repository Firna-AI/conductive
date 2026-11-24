# Own computers

This folder holds the install script of an own computer, the systemd user
unit of its computer mode, and the build of its container base image. An
own computer is a Linux server that an admin adds to an org. Each
workspace and each build of the org on that server runs in its own Podman
container. [Own computers](../../docs/protocol/own-computers.md) gives the
requirements.

The program `conductive` runs on the server in computer mode, outside the
containers. The [computer crate](../../crates/cnd-computer/README.md)
holds that mode. The [own computers backend](../../worker/own-computers/README.md)
holds the code exchange and the computer connection in the Worker.

## Install on a server

The Worker serves [`install.sh`](install.sh) at `/install-computer` on the
marketing site. An admin runs it on the server with the one-time code of
the computer, as
[Add computer](../../docs/protocol/own-computers.md#add-computer) says:

```sh
curl -fsSL https://conductive.build/install-computer | sh -s -- --code <code>
```

Run the command as a user who can use `sudo`, or as root. The Worker
bundles the script when it builds. So a new install gets a change of the
script after the next deploy of the Worker.

| Option | Value |
| --- | --- |
| `--code` | Required. The one-time code from the app: four groups of four characters, joined by hyphens. Each character is a digit or a capital letter other than I, L, O, and U. |
| `--origin` | The Worker origin for the code exchange and the computer connection. The default is `https://api.conductive.build`. |
| `--release-server` | The base URL of the release files. The default is `https://runner.conductive.build`. |

Each URL must use HTTPS, or HTTP with the host `127.0.0.1`, `localhost`,
or `[::1]`. Each can have a port. A user name, a query, or a fragment
makes either URL invalid. The computer uses only the scheme, host, and
port of `--origin`. It ignores its path. The `--release-server` URL can
have a path prefix.

Before it changes anything, the script checks the server. The needs are
Linux on x86_64, systemd as the init system, Podman 4 or later, cgroups
v2, and the commands `newuidmap`, `newgidmap`, `curl`, `sha256sum`, and
`tar`. The script prints one line for each missing need, and then it
stops. It also stops when it does not run as root and `sudo` is missing.

Then the script does these steps:

1. It creates the user `conductive`, with the home `/home/conductive`, no
   login shell, and a group of its own. An existing user stays.
2. It adds a range of 65,536 subordinate IDs for that user to
   `/etc/subuid` and to `/etc/subgid`, when a file has no range for that
   user. The range starts after the highest range in the two files.
3. It delegates the cgroup controllers `cpu`, `cpuset`, `io`, `memory`, and
   `pids` to the systemd user manager of that user. The drop-in file is
   `/etc/systemd/system/user@<uid>.service.d/conductive-delegate.conf`.
4. It turns on lingering for the user, so that its user manager runs from
   boot, with no login. It waits up to 30 seconds for the bus of that
   manager.
5. As the user `conductive`, it runs `--version` on the installed program
   at `current/conductive`. If the command succeeds and prints
   `conductive <version>`, the script uses that program. If the program is
   missing or cannot run, the script reads the `version` and `sha256` of
   the newest release for `x86_64-unknown-linux-musl` and downloads its
   program archive.
6. When the script downloads a program, it checks the archive's SHA-256
   digest. As the user `conductive`, it puts the program in the release store
   `.local/share/conductive/` in the home of the user, at
   `versions/<version>/conductive`. Then it points the link `current` at
   that version. Each change is a rename, so a stopped install leaves no
   partial program or link.
7. As the user `conductive`, it runs `conductive computer check`,
   `conductive computer enroll`, and `conductive computer service`. The
   check prints the health report of the server and of Podman without
   root. The enroll exchanges the code for the computer token. The service
   step writes the user unit and starts it.
8. It prints the commands that show the state and the log of the service.

For a first install or a repair, the script uses the digest from the
newest-version JSON. The updater checks the signature of each later
release and completes a trial before it changes `current`. See
[The computer connection](../../docs/protocol/own-computers.md#the-computer-connection).

The script sends the code to `computer enroll` on standard input. When
the health report shows a failed check, the script stops. The admin then
fixes the server and runs the command again. A second run keeps the user,
its ID ranges, and the drop-in file. It keeps `current` when the installed
program can run, even if the code exchange fails. If the program is
missing or cannot run, the script prints a warning and installs the
newest release. If the code exchange fails, read the reason that
`computer enroll` prints.

The script reads the newest-version JSON with `awk`, so each key must be
on its own line, as the release packager writes it.

| Exit status | Meaning |
| --- | --- |
| 0 | The computer mode is installed, enrolled, and started. |
| 1 | A need is missing, a step failed, or a signal stopped the script. |
| 2 | An option is missing or wrong. |

## The user service

[`conductive-computer.service`](conductive-computer.service) is the
systemd user unit of the computer mode. The program embeds this file. The
command `conductive computer service` writes it for the user `conductive`
and starts it.

- It runs `conductive computer run` through the link `current` of the
  release store. So each start runs the release that `current` selects.
- systemd starts it again 5 seconds after each exit.
- It belongs to the default target of the user manager. Lingering starts
  that manager at each boot of the server.
- `KillMode=process` makes a stop of the unit end only its main process.
  With the default, a stop also ends the `conmon` process of each
  container, and `podman stop` then hangs.

Show the state and the log of the service with these commands. Use the
user ID of `conductive` for `<uid>`.

```sh
sudo -u conductive -- env XDG_RUNTIME_DIR=/run/user/<uid> \
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/<uid>/bus \
  systemctl --user status conductive-computer.service
sudo journalctl _UID=<uid> _SYSTEMD_USER_UNIT=conductive-computer.service
```

The install script prints these commands at its end, in the form for root
when root ran it.

## The container base image

Each own computer builds its first org image from the container base
image, as
[The org image of each own computer](../../docs/protocol/own-computers.md#the-org-image-of-each-own-computer)
says. The image holds the base software of the
[E2B template](../e2b/README.md) and the release of one deploy. Its Podman
name is `localhost/conductive/base:<version>`.

[`Containerfile`](Containerfile) builds the image in two stages from
`docker.io/library/ubuntu:24.04`:

1. The stage `tools` installs `systemd`, `systemd-sysv`, `sudo`,
   `ca-certificates`, and `curl`. It removes the user `ubuntu` of the
   Ubuntu image when it exists. It makes the user `user` with the user ID
   1000, the home `/home/user`, and `sudo` with no password. Then it runs
   the `install-base.sh` of the E2B template with no change. That script
   runs the other install scripts of the template. systemd is the first
   process of the image, and the stop signal `SIGRTMIN+3` shuts it down.
   The stage sets no `USER`, so systemd runs as root in the user namespace
   of the container.
2. The last stage installs `ttyd` and `tmux` with apt, and masks the
   `ttyd` service of the package. The terminal of the release needs them,
   as [Installs in a build](../../docs/protocol/sandbox-software.md#installs-in-a-build)
   says. Then it downloads the program archive of the release and checks
   its digest. That program installs its own release with
   `conductive update check --bootstrap --release <version> --digest <sha256>`,
   `update apply`, and `update started`. This pinned install checks the
   signature of the release, as
   [Release installation](../install.md#release-installation) says. The
   stage fails unless `/opt/conductive/current` selects that version and
   the version is complete.

The install scripts run `systemctl` to reload systemd and to start units.
systemd does not run during an image build, so these commands fail there.
[`systemctl-build.sh`](systemctl-build.sh) takes the place of `systemctl`
in each build step that runs the scripts, and that step removes it. It
does nothing and exits with status 0 for `daemon-reload`, `daemon-reexec`,
`start`, `restart`, `try-restart`, `reload`, `stop`, `kill`, and
`reset-failed`. It passes each other command, such as `enable`, `mask`,
and `add-wants`, to `/usr/bin/systemctl`. So no unit starts during the
build, and each enabled unit starts at the first boot of a container.

[`build-base.mjs`](build-base.mjs) bundles [`base-build.ts`](base-build.ts)
with esbuild and runs it. The build copies its files into a new folder
under `.context/computer-base/`. The files are the public inputs of the
E2B template, `runtime-settings.sh` with the pinned base Node,
`Containerfile`, and `systemctl-build.sh`. Podman builds from that folder.
The folder stays after the build.

### The image in each deploy

The job `container-base` of
[`deploy.yml`](../../.github/workflows/deploy.yml) runs after each
successful deploy from `main`. It builds the image of the release of that
deploy with `build-base.mjs`, with Podman as root through `sudo`. It signs
the image with the `container-base` command of the
[release crate](../../crates/cnd-release/README.md) and the release
signing key. It uploads the OCI archive and the signature first, and the
manifest last. A rerun skips a release whose manifest exists.
[The container base image in each deploy](../../docs/deployment/runner-archive.md#the-container-base-image-in-each-deploy)
gives the keys and the order.

## Build and test locally

Run the commands from the repository root with Node 24, after `npm ci`.
`build-base.mjs` loads esbuild from the npm packages of the repository.
The image commands need Podman 4 or later, with or without root.

Test the install script with these commands:

```sh
cargo test -p cnd-cli --test computer_install_tests
npm run test -- worker/marketing/install-computer.test.ts
shellcheck image/computer/install.sh image/computer/systemctl-build.sh
```

The Rust tests run `install.sh` with fake system commands and a fake
release server in a temporary folder. They change nothing on the machine.
The Vitest test checks that the marketing site serves the exact script.
No gate runs `shellcheck`, so run it after each change of a shell script
in this folder.

Build the container base image with these commands:

```sh
node image/computer/build-base.mjs --prepare
node image/computer/build-base.mjs --tools
node image/computer/build-base.mjs --version "$RELEASE_VERSION" \
  --digest "$RELEASE_DIGEST" --archive .context/computer-base/base.tar
```

- `--prepare` copies the build files into a new folder and prints its
  path. It does not run Podman.
- `--tools` builds only the stage `tools`, as
  `localhost/conductive/base-tools:dev`. It installs each tool of the E2B
  template, so it takes some minutes.
- The release build takes the version `0.0.<number>` of a signed release,
  the `sha256` of its program archive, and a path for the OCI archive. It
  checks the two values before it builds. It builds the whole image, saves
  it with `podman save --format oci-archive`, and prints the Podman image
  ID alone to standard output. The Podman output goes to standard error.
  `--release-server` replaces the default release server. It takes an HTTP
  or HTTPS base URL with no credentials, query, or fragment.

A failed command prints `The container base image command failed.` with
the reason, and exits with status 1.

Boot the stage `tools` to check a change:

```sh
podman run -d --systemd=always --name base-check localhost/conductive/base-tools:dev
podman exec base-check systemctl is-system-running --wait
podman exec base-check systemctl --failed
podman rm -f base-check
```

During boot, `systemctl is-system-running --wait` can fail to reach the
systemd bus. Run that command again after a few seconds.
`systemctl --failed` lists `docker.service` and
`docker.socket`, as [Checks and limits](#checks-and-limits) says.
[Developer scripts](../developer-scripts.md#development) gives the
typecheck and the lint of the TypeScript files.

## Checks and limits

- The stage `tools` builds and boots with Podman 4.9.3 without root.
  systemd runs as the first process. The display, desktop, Chrome,
  computer config, and relay services of the E2B template run.
- The Docker service of the E2B template fails in a container of Podman
  without root. `dockerd` cannot make its NAT chain, because `iptables`
  gets `Permission denied`. So `docker.service` and `docker.socket` fail,
  and systemd reports the state `degraded`. Docker does not work in a
  workspace on an own computer.
- The release build installs a release with the program of that release.
  So it works only for a signed release whose program has the options
  `--release` and `--digest` of `update check`.
- No CI gate builds the image, and no automated check boots it. The job
  `container-base` builds it only after a deploy from `main`.
- No automated test runs the install script on a real server.

### Key Code

- [`install.sh`](install.sh): the install script of a server.
- [`conductive-computer.service`](conductive-computer.service): the user
  unit that the program embeds and writes.
- [`Containerfile`](Containerfile): the two stages of the image.
- [`systemctl-build.sh`](systemctl-build.sh): the build stub of `systemctl`.
- [`base-build.ts`](base-build.ts): stages the build folder and runs Podman.
- [`build-base.mjs`](build-base.mjs): bundles and runs `base-build.ts`.
- [`template-context.ts`](../e2b/template-context.ts): copies the public
  inputs of the E2B template.
- [`install-computer.ts`](../../worker/marketing/install-computer.ts):
  serves the install script.
- [`computer_install_tests.rs`](../../crates/cnd-cli/tests/computer_install_tests.rs):
  runs the install script with fake system commands.

### Related Docs

- [Own computers](../../docs/protocol/own-computers.md): the install, the
  computer connection, and the org image of each own computer.
- [Releases](../../docs/protocol/sandbox-software.md#releases): the release
  files and their signatures.
- [The container base image in each deploy](../../docs/deployment/runner-archive.md#the-container-base-image-in-each-deploy):
  the keys and the order of the upload.
- [Release installation](../install.md#release-installation): the pinned
  install and the release layout.
- [E2B base template](../e2b/README.md): the base software and its pins.
- [Machines](../../docs/architecture/machines.md#own-computers): own
  computers in the architecture.
