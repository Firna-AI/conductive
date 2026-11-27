# Install in a build

This guide belongs to the [sandbox software](README.md). It describes the
software step of each image build and the release installer interface.

Before this step, Git in the build sandbox copies each chosen repository
into its folder, as the
[source loader](../worker/lifecycle/repository-layout.md#the-source-loader)
says. That Git comes from the image that the build sandbox starts from.
A first build starts from a ready software image of the app software
version in its provider account. It installs the newest release after the copy.
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
release install command as an org build. It has no
repository or environment variable.

The software step calls `installImageSoftware`. The Worker reads the newest
release JSON before it composes that command. `CONDUCTIVE_RELEASE_SERVER`
sets its base URL. The default is `https://runner.conductive.build`.
The Worker checks the binary, target, version, HTTPS URL, and SHA-256 digest.
A failed read fails the build with a software-release error.

The release program includes the workspace CLI and MCP server.
The Worker installs no separate tool source files or launcher.

The command first runs the apt part. It installs `ttyd` and `tmux` with
`terminalPackagesCommand()`, then `gh`, with apt. It disables and masks the
package's own ttyd service.

The `apt-get update` of the apt part adds
`-o Acquire::AllowReleaseInfoChange::Label=true`, so apt accepts a changed
`Label` in the release file of a source. The Boat base image holds
`ondrej/php`, a Launchpad apt source of PHP packages. Its `Label` changed to
`PPA for PHP (deprecated)`. Without the option, `apt-get update` fails with
exit code 100 while the cached lists hold the old `Label`. apt still checks
the signatures. A changed `Origin` or `Codename` still stops the update.

`imagePackagesVersion()` hashes this part alone, so a new release does not
change it. A change of the part's text, such as an apt option, changes this
version. It also changes the app software version, which hashes the release
version and the whole install command. Each build job and each software
image row records the version of the part that its command ran.

A later build reads the version that its source image holds. When that
version is current, the command first checks the image. When `dpkg-query`
finds the three packages installed and `systemctl is-enabled ttyd.service`
prints `masked`, the command skips apt. Otherwise, and for a software image
build from the base image, it runs the apt part. So after a change of the
part, the next build or refresh from each image with an older version runs
the apt part once.

The release part runs as root with `umask 022`, so services that run as
`user` can read the release files. When `/opt/conductive/current/conductive`
exists, that program runs `update check --bootstrap`. The check waits for a
running background check and downloads only the parts that the image lacks.
The installed program is used only when the check succeeds and
`versions/<version>/complete` then exists for the release that the Worker
read. Otherwise the command downloads the program archive with curl, checks its digest with `sha256sum`, and extracts `conductive`
into a temporary folder. When an installed program exists but its check
did not get the release, the command first prints a warning. That
bootstrap program runs the check. The program
that ran the check then runs the other root commands in
[Release installation](#release-installation).
A failure stops the build. The temporary folder is removed on exit.
The release owns the terminal scripts and units. The build never overwrites
them with the legacy terminal installer.

Every org build and refresh installs the newest release.
A first build still uses a matching software image when one is ready.
That build also runs the release install, so a newer release can apply.
Each build and refresh still fails when no release is available.
A refresh then snapshots the result without running the org install script.

A workspace without `/opt/conductive/current/conductive` bootstraps at its
next normal start. The Worker reads the release JSON when it composes the
startup command. A failed read prints a warning and leaves startup running.
The command launches a root `nohup setsid` job. Its output goes to
`/run/conductive/bootstrap.log`. Neither startup nor the runner restart waits
for its download. Disk retention starts do not bootstrap software.

The background job checks the program again under a download lock.
It verifies and extracts the bootstrap archive, then runs `update check --bootstrap`.
Activation takes `/run/conductive/bootstrap-activate.lock`.
The runner restart takes the same lock. The download never holds this lock.
Activation checks again that the program is missing, applies the release,
and confirms the initial installation with `update started`.
This confirmation clears the first pending marker, which has no previous release.
The new units take effect at the next runner start. Bootstrap starts no unit.

## Disk flushes

[Disk flushes](../docs/protocol/workspaces-and-sandboxes.md#disk-flushes) gives
the requirement. The udev rule `60-conductive-disk-cache.rules` sets
`queue/write_cache` to `write through` on each whole virtio disk, at each
boot. The kernel then sends no flush to the host, and `fsync` returns once
the host has the data. Installation changes no disk setting, so the build
sandbox keeps its flushes. The updater installs the rule from the system part.
A workspace without the updater receives it through the background bootstrap.

To check a sandbox, read `/sys/block/vda/queue/write_cache`. It reads
`write through` with the rule and `write back` without it.

## Release installation

The Worker installs releases through `conductive`. It runs these commands
as root with the installed program, or with a verified bootstrap
executable when the image has no program or its check fails:

```sh
/path/to/conductive update check --bootstrap
/path/to/conductive update apply
/opt/conductive/current/conductive update started
```

The check command logs a warning and returns failure after a failed
download. The installation check waits for a running background check.
Background checks still return a busy error when the download lock is held.
Downloads have a one-hour total timeout and a ten-second connect timeout.
A build must stop when any command fails. A build must verify that `current/conductive` and
`current/complete` exist after apply. A build confirms the initial
installation with `update started`, because it starts no runner.
The image build installs `gh`, `ttyd`, and `tmux` through apt when the
image lacks one of them, when the ttyd service is not masked, or when the
apt part changed.

The program uses this layout under `/opt/conductive`:

```text
current -> versions/<active-version>
previous -> versions/<previous-version>
pending                         # JSON start journal, absent after confirmation
update.lock                     # exclusive background-check lock
update-apply.lock               # exclusive apply/confirmation lock
part-publish.lock               # lock of the last check and rename of a part
versions/<version>/conductive
versions/<version>/parts.json
versions/<version>/sdk-helper -> /opt/conductive/parts/<sdk-helper-sha256>
versions/<version>/node -> /opt/conductive/parts/<node-sha256>
versions/<version>/system -> /opt/conductive/parts/<system-sha256>
versions/<version>/complete
rejected/<failed-version>       # persistent rejection record
parts/<sha256>/complete
parts/<sdk-helper-sha256>/sdk-helper.mjs
parts/<node-sha256>/bin/node
parts/<system-sha256>/install-system.sh
parts/<system-sha256>/*          # scripts, units, wrapper, and udev rule
```

The links use absolute targets under the configured root. The Node part
removes the archive's top folder. The SDK helper archive has its entry
point at the part root. The complete marker is written last. An interrupted check can
leave incomplete version folders and private `.partial-<process ID>`
part folders. Those folders never qualify for apply. A later check or
collection replaces them.

Apply reads `parts.json` of the version that it starts. A part is
present when its folder has the `complete` marker and the entry files of
its role: `bin/node`, `sdk-helper.mjs`, or `runner-start.sh` and
`install-system.sh`. Apply downloads each missing part again, with the
digest check of a check. It takes no download lock. All part downloads
of one apply share a limit of 60 seconds. A failed download logs a
warning, and apply goes on. Each unpack, by a check or by apply, writes
into the private folder `parts/<sha256>.partial-<process ID>`. It holds
`part-publish.lock` only for the last presence check and the rename, and
it keeps a part that is present. Collection removes a private folder
that an interrupted unpack leaves.

Apply calls `current/system/install-system.sh`. That script installs all
release units into `/etc/systemd/system`, copies the udev rule, sets the
system Git credential helper, and links the `gh` wrapper. It also links
`/usr/local/bin/conductive` to `/opt/conductive/current/conductive`.
That program serves workspace commands, MCP, previews, Git credentials, release updates, and the disk hold.
The credential alias `/usr/local/bin/conductive-git-credential` links to the
same program and selects `git-credential`.
It runs
`systemctl daemon-reload` and enables the runner, relay, terminal, check
timer, disk hold timer, and disk hold path unit. It changes no package,
and it starts no stopped service.
A changed start of a running unit, such as its commands, user, or
environment, applies only at the next start of that unit. The reload
applies a changed `OOMPolicy` of a running unit at once.
Last, it restarts the relay when the relay runs, without waiting.
Boat starts the relay at boot, before the runner pre-start step applies a
release, so the relay otherwise keeps the release that was active at boot.
The socket holds port 7682 during the restart. A failed restart prints a
warning, and the installer still succeeds.

The release units are:

- `conductive-update-check.service`: root background download.
- `conductive-update-check.timer`: boot checks and a check every 10 minutes.
- `conductive-disk-hold.service`: root command to set the ext4 disk hold.
- `conductive-disk-hold.timer`: boot check and a check every five minutes.
- `conductive-disk-hold.path`: starts the hold service when the restore marker changes.
- `conductive-runner.service`: root activation in pre-start, then the Rust runner as `user`.
- `conductive-preview-relay.service` and `.socket`: Rust relay as `user`.
- `conductive-terminal.service` and `conductive-terminal-sessions.service`: terminal services as `user`.

The runner pre-start step runs apply only when `/run/conductive/workspace-ready` exists.
Relay and terminal restarts do not change the selected release.
A running runner also runs apply itself, through `sudo -n`, when its
workspace is idle and its own release is confirmed. It then executes the new
`current/system/runner-start.sh` in the same process, as the
[runner service guide](../runner/service/README.md) says. The apply runs
the same system installer, which restarts no unit. So the relay and
terminal keep their running release until they start again.
The runner, relay, and terminal entry points use `current/system/`.
The runner executes `/opt/conductive/current/conductive runner`. It resolves
its private Node and SDK helper beside that executable. The relay executes
the active Rust program too. The system installer removes a stale process-start
confirmation unit. The Rust runner confirms the release only after its first
valid Worker `welcome`. Confirmation changes nothing unless the executable's
version matches current and pending. It reads the saved Node state file without conversion.
The next apply restores `previous` when a new release still has its pending
marker. That fallback runs the previous system installer, which restores its
units and starts the previous Rust runner on the next service attempt.
The first published Rust release uses this pre-start layout too, so its
fallback never pulls in a second activation unit. Collection after confirmation
retains current, previous, and the release that the next apply selects.
It reads the retained set under the download lock and removes other
version payloads and unused parts. Rejection records survive collection,
so a failed version cannot download or apply again.
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
