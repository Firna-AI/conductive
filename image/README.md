# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it into the org image before it runs the org's install script. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner and the
terminal. It also gives git a fresh GitHub token for each operation. The
agent tools are not in this folder yet.

## Responsibilities

- Install the runner archive after a check of its SHA-256 digest.
- Install `ttyd` when the image does not have it.
- Install and enable two systemd services: the agent runner and the
  terminal.
- Make the git credential helper the system credential helper of git.
- Start no runner and no terminal in a build sandbox. The services run them
  only in a workspace sandbox.

## The runner archive

Each build takes one input, an `ImageSoftwareArtifact`. It is the public
HTTPS URL of a `.tar.gz` archive, with the SHA-256 digest of the archive.
Milestone 7r, the agent runner, supplies the archive. `readImageSoftware` in
[`image-software.ts`](../worker/lifecycle/image-software.ts) refuses a URL
with a user name, a password, a query, or a fragment. It also refuses a
digest that is not 64 hexadecimal characters.

The archive must hold these paths:

- `node/bin/node`: an executable Node.
- `runner/main.mjs`: the agent runner, with its SDK dependencies.

Put no credential in the URL or in the archive. Each saved snapshot keeps
the unpacked archive.

## Install

The software step of a build calls `installImageSoftware`. It writes the
scripts and the units of this folder to `/opt/conducting/staged/`, and then
it runs this command:

```sh
sh /opt/conducting/staged/install.sh '<archive URL>' '<SHA-256 digest>'
```

`install.sh` does these steps. A failure stops it, and the build fails.

1. It downloads the archive with `curl`, and checks the digest with
   `sha256sum`.
2. It unpacks the archive into a new folder, checks both paths, and writes
   the Node version to the build log.
3. It replaces `/opt/conducting/software` with the new folder, so no file
   of an older archive stays.
4. It installs `ttyd` with `apt-get` when the image does not have it.
5. It installs the start scripts, the git credential helper, and the two
   systemd units.
6. It makes `conducting-git-credential` the system credential helper of
   git, and sets `credential.useHttpPath`.
7. It enables both services. It does not start them.

A refresh skips this step. So a change in this folder reaches the new
workspaces of an org only after its next build. A workspace that exists
keeps its software.

## Start in a workspace

The Worker gives each workspace sandbox these variables at create and at
each resume, together with the org's env vars:

| Name | Value |
| --- | --- |
| `WORKSPACE_TOKEN` | The workspace token. |
| `CONDUCTING_WORKSPACE_ID` | The workspace ID. |
| `CONDUCTING_MACHINE_ORIGIN` | The origin of the machine hostname. |
| `CONDUCTING_REPOSITORY_DIR` | The repository folder, from `repositoryDirectory` in [`commands.ts`](../worker/lifecycle/commands.ts). |
| `CONDUCTING_TURN_ID` | Empty. The runner sets it for each agent process. |
| `CONDUCTING_DISK_KEEPALIVE` | `1` in a disk retention restart, and `0` otherwise. |

Each script reads the variables from `/run/ascii-secrets/env.sh`, where
Boat puts them. A systemd service does not get them in another way.

At a create, the Worker first fetches the default branch and creates the
workspace branch. At each create and each resume, it then runs the command
of `workspaceStartupCommand`:

1. It writes the org's startup script to `/run/conducting/startup.sh`, with
   mode 600.
2. It runs the script in the repository folder, with the variables.
3. When the script succeeds, it writes the marker
   `/run/conducting/workspace-ready`, and restarts both services.

Each start script exits with success, and starts nothing, in these cases:

- `CONDUCTING_DISK_KEEPALIVE` is `1`.
- `WORKSPACE_TOKEN` is empty. The runner also needs
  `CONDUCTING_WORKSPACE_ID`.
- The marker `/run/conducting/workspace-ready` does not exist.

So a build sandbox and a disk retention restart start no runner and no
terminal. A disk retention restart runs the startup script, but it writes
no marker.

Otherwise, `runner-start.sh` runs `runner/main.mjs` with the archive's
Node, in the repository folder. `terminal-start.sh` runs `ttyd` on port
7681, with the user `conducting` and a random password. It keeps the
password in `/run/conducting/terminal-password`, and writes that file when
it does not exist. Both units restart their service after a failure.

## Git credentials

`install.sh` installs `git-credential-helper.sh` as
`/usr/local/bin/conducting-git-credential`. This wrapper keeps the
caller's `CONDUCTING_TURN_ID`, loads the sandbox variables, and runs
`git-credential-helper.mjs` with the archive's Node.

- The helper answers only a `get` request for `https` on `github.com`. It
  ignores every other request.
- It posts the turn ID to the git credential route at
  `CONDUCTING_MACHINE_ORIGIN`, with the workspace token as a bearer token.
  It refuses redirects, and it stops after 30 seconds.
- It gives git the token as the password of the user `x-access-token`.
- The Worker returns a fresh GitHub user token of the sender of that turn.
  The helper saves nothing, so each git operation asks again.
- Without a current turn, or when the Worker refuses, the helper writes one
  fixed message. Git then gets no credential from the helper.

The Worker's route is not wired to the machine hostname yet, as the
[lifecycle README](../worker/lifecycle/README.md#machine-route) says.

## Secrets

- A build sandbox starts with no org env vars and no workspace token. So no
  saved snapshot holds a secret of a workspace.
- The archive URL can hold no user name, no password, and no query.
- The workspace object keeps the env values of a start only in encrypted
  form. Before it returns a start log, it hides each of those values, also
  when a value spans two output parts.
- The terminal password stays in `/run/conducting/`, with mode 600.
- The helper never writes a token or the Worker's response to its error
  output.

## Development

These files have no tests of their own yet.

- The Worker imports each file with Vite's `?raw` suffix. When you add a
  file here, also add it to `installImageSoftware` and to `install.sh`.
- Keep each start script safe to run in a build sandbox, which has no
  workspace variables.

### Key Code

- [`install.sh`](install.sh): installs the archive, `ttyd`, the services,
  and the helper. Its arguments are the archive URL and the digest.
- [`runner-start.sh`](runner-start.sh) and
  [`conducting-runner.service`](conducting-runner.service): start the agent
  runner.
- [`terminal-start.sh`](terminal-start.sh) and
  [`conducting-terminal.service`](conducting-terminal.service): start
  `ttyd` with its password.
- [`git-credential-helper.sh`](git-credential-helper.sh) and
  [`git-credential-helper.mjs`](git-credential-helper.mjs): the git
  credential helper.
- [`image-software.ts`](../worker/lifecycle/image-software.ts): stages these
  files for a build, and makes the workspace startup command.

### Related Docs

- [Workspace lifecycle](../worker/lifecycle/README.md): the builds, the
  start steps, and the git credential route.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  the org image, the startup script, and the env vars.
- [Access and security](../docs/protocol/access-and-security.md): what a
  sandbox holds, GitHub tokens, and the terminal.
- [Architecture](../docs/architecture.md#sandbox-software): the sandbox
  software and its parts.
