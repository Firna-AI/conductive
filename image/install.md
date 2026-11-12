# Install in a build

This guide belongs to the [sandbox software](README.md). It describes the
legacy software step of each image build and the release installer interface.

Before this step, Git in the build sandbox copies each chosen repository
into its folder, as the
[source loader](../worker/lifecycle/repository-layout.md#the-source-loader)
says. That Git comes from the image that the build sandbox starts from.
A first build starts from a ready software image of the app software
version in its provider account. It skips the software step after the copy.
Without that image, it starts from the provider's base image and runs the
full software step. Each later build or refresh starts from the last org
image, which holds everything that earlier builds installed. The copy uses no part of this folder's software.

In a later build or refresh, a program with root access that an earlier
install left in the org image can read the clone token of a later copy. That token can only read
its own repository, which the image already holds. The Worker revokes it
when the copy ends, as
[GitHub tokens](../docs/protocol/github-tokens.md)
says.

The [software image build](../worker/software-image/README.md) runs the same
agent tools and image software commands as an org build. It has no
repository or environment variable.

The software step of a build calls `installImageSoftware`. It writes the
scripts, both service units, and the relay socket unit to `/opt/conductive/staged/`.
Each staged script holds the quoted full path of the private Node in place
of `@CONDUCTIVE_NODE@`. Then the step runs these commands, in this order:

```sh
sudo -n sh /opt/conductive/staged/install-runtime.sh '<Node URL>' '<Node digest>' '<version folder>'
sudo -n sh /opt/conductive/staged/install.sh '<archive URL>' '<SHA-256 digest>'
```

Boat runs commands as `user`, with passwordless sudo. The installers need
system permissions. The installed runner and relay services run as `user`.

`install.sh` does these steps. A failure stops it, and the build fails.

1. It downloads the archive with `curl`, and checks the digest with
   `sha256sum`.
2. It unpacks the archive into a new folder.
   It checks `runner/main.mjs` and `runner/relay.mjs`.
   It writes the version of the private Node to the build log.
3. It replaces `/opt/conductive/software` with the new folder, so no file
   of an older archive stays.
4. It installs the GitHub CLI package when needed.
   It installs the runner and relay start scripts.
   It installs the git credential helper and the GitHub CLI wrapper.
   It installs `conductive-runner.service` and `conductive-preview-relay.service`.
   It installs `conductive-preview-relay.socket`.
   It installs the udev rule `60-conductive-disk-cache.rules`.
5. It makes `conductive-git-credential` the system credential helper of
   git, and sets `credential.useHttpPath`.
6. It enables the runner service, the relay socket, and the relay service.
   It starts no unit.

Boat starts the enabled relay socket and service after each resume and fork.
The service requires the socket to start first.
systemd keeps `127.0.0.1:7682` open while the relay service restarts.
The service stays enabled, so the relay starts without waiting for a preview request.
The relay uses the private Node.
Its start script reads no workspace variable or workspace marker.

A refresh and a first build from a software image skip this legacy step
and the terminal installer with it. A workspace without the updater keeps
its installed software. Changes then reach later workspaces through a new
image build. A workspace with the release layout can download new parts
and apply them at its next runner start. See [Release installation](#release-installation).

## Disk flushes

[Disk flushes](../docs/protocol/workspaces-and-sandboxes.md#disk-flushes) gives
the requirement. The udev rule `60-conductive-disk-cache.rules` sets
`queue/write_cache` to `write through` on each whole virtio disk, at each
boot. The kernel then sends no flush to the host, and `fsync` returns once
the host has the data. Installation changes no disk setting, so the build
sandbox keeps its flushes. A workspace without the updater gets the rule
through an image build.
The updater installs the rule from the system part.

To check a sandbox, read `/sys/block/vda/queue/write_cache`. It reads
`write through` with the rule and `write back` without it.

## Release installation

The release installer is available in `conductive`. The current Worker
installer above does not call it yet. A caller that installs a first
release runs these commands as root with a verified bootstrap executable:

```sh
/path/to/bootstrap/conductive update check --bootstrap
/path/to/bootstrap/conductive update apply
/opt/conductive/current/conductive update started
```

The check command logs a warning and returns failure after a failed
download. A concurrent check also returns a busy error. A build must stop
when any command fails. A build must verify that `current/conductive` and
`current/complete` exist after apply. A build confirms the initial
installation with `update started`, because it starts no runner.
The image build still installs `gh`, `ttyd`, and `tmux` through apt.

The program uses this layout under `/opt/conductive`:

```text
current -> versions/<active-version>
previous -> versions/<previous-version>
pending                         # JSON start journal, absent after confirmation
update.lock                     # exclusive background-check lock
update-apply.lock               # exclusive apply/confirmation lock
versions/<version>/conductive
versions/<version>/parts.json
versions/<version>/runner -> /opt/conductive/parts/<runner-sha256>
versions/<version>/node -> /opt/conductive/parts/<node-sha256>
versions/<version>/system -> /opt/conductive/parts/<system-sha256>
versions/<version>/complete
versions/<failed-version>/rejected
parts/<sha256>/complete
parts/<runner-sha256>/runner/main.mjs
parts/<runner-sha256>/runner/relay.mjs
parts/<node-sha256>/bin/node
parts/<system-sha256>/install-system.sh
parts/<system-sha256>/*          # scripts, units, wrapper, and udev rule
```

The links use absolute targets under the configured root. The Node part
removes the archive's top folder. The runner part keeps its `runner/`
folder. The complete marker is written last. An interrupted check can
leave incomplete version folders and `.partial` part folders. Those
folders never qualify for apply. A later check replaces them.

Apply calls `current/system/install-system.sh`. That script installs all
release units into `/etc/systemd/system`, copies the udev rule, sets the
system Git credential helper, and links the `gh` wrapper. It also links
`/usr/local/bin/conductive` to the active program. It runs
`systemctl daemon-reload` and enables the runner, relay, terminal, and
check timer. It starts no service and changes no package.

The release units are:

- `conductive-update-apply.service`: root activation before runner and relay.
- `conductive-update-check.service`: root background download.
- `conductive-update-check.timer`: boot and hourly checks.
- `conductive-update-confirm.service`: root confirmation after a local runner start.
- `conductive-runner.service`: Node runner as `user`.
- `conductive-preview-relay.service` and `.socket`: Node relay as `user`.
- `conductive-terminal.service` and `conductive-terminal-sessions.service`: terminal services as `user`.

The runner, relay, and terminal entry points use `current/system/`.
Each runner or relay start resolves `current` once and uses that version's
private Node and runner part. The next apply restores `previous` when a
new release still has its pending marker. Collection after confirmation
retains current and previous and removes other versions and unused parts.
A running download defers collection without delaying the runner.

For a separate install root or a local release server, use:

```sh
conductive update check --bootstrap --root /tmp/conductive --server http://127.0.0.1:8080
conductive update apply --root /tmp/conductive
conductive update started --root /tmp/conductive
```

`--root` changes the release store. The production system installer still
writes fixed sandbox paths. Local integration tests use a system archive
whose installer writes only inside their temporary folder.
