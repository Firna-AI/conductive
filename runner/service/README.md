# Runner service

This guide belongs to the [agent runner](../README.md). The
[runner commands](../README.md#commands) build the bundles that it installs.

Each build of the org image installs the runner as a systemd service. The
install script needs root, because it writes a systemd unit.

1. Get the private Node 24 path from the image builder. Its `npm` command
   must sit beside it. The runner also needs Git.
2. Install the runner packages and build the bundles with the
   [runner commands](../README.md#commands).
3. Set `CONDUCTIVE_NODE` to that full executable path. As root, run
   `sh runner/scripts/install.sh <user> [<folder>]`. The user runs the
   agents. The folder is `/opt/conductive-runner` by default.

The install script does these steps:

- It requires the service user and the explicit private Node path.
- It copies the three bundles, `runner/package.json`,
  `runner/package-lock.json`, and `runner/service/start.sh` into the
  folder.
- It runs the adjacent npm command with the configured Node and
  `ci --omit=dev --ignore-scripts`. The runtime packages sit beside the
  bundles.
- It writes `/etc/systemd/system/conductive-runner.service` with the user,
  the folder, and the configured private Node path.
- It reloads systemd and enables the service. It does not start the
  service.

Boat restarts the enabled services after each resume and fork. So the
runner starts in each sandbox that starts from the org image.

[`conductive-runner.service`](conductive-runner.service) is the template of
the unit. The unit has these settings:

- The service runs as the user, in the home folder of the user, after
  `network-online.target`.
- The unit passes the private Node path to the startup wrapper as an
  argument. Sandbox env changes keep that argument unchanged.
- systemd starts the service again 2 seconds after it ends, for any
  reason.
- `UMask=0077` makes the new files of the runner and its agents private to
  the user.
- A stop sends `SIGTERM` to the runner and its agent processes. The runner
  closes its agents, ends its running turns, and closes its connection. Then
  it exits with code 0. After 15 seconds, systemd ends each remaining
  process.

[`start.sh`](start.sh) exports each variable of `/run/ascii-secrets/env.sh`,
the file where Boat writes the variables of the sandbox. Then it starts
`runner.mjs` from the folder with the full Node path in its service
argument. The image builder owns that path and its download. When the
secrets file is missing, the start fails, and systemd tries again.
