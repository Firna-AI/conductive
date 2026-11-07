# Sandbox software

This folder holds the app's own sandbox software. Each image build installs
it into the org image before it runs the org's install script. The org
image is the saved snapshot that every new sandbox of an org starts from.
In a workspace sandbox, this software starts the agent runner. It also
gives git a fresh GitHub token for each operation. The agent tools are not
in this folder yet.

## Responsibilities

- Install the pinned private Node after a check of its SHA-256 digest, or
  reuse it when the image already holds it.
- Install the runner archive after a check of its SHA-256 digest.
- Install and enable the agent runner's systemd service.
- Make the git credential helper the system credential helper of git.
- Start no runner in a build sandbox. The service runs it only in a
  workspace sandbox.

The [terminal backend](../worker/terminal/README.md) owns ttyd, its service,
its launcher, and its local password. The software step of each image build
runs that area's `terminalInstallCommand()` after `install.sh`. The build log
shows the output of both. The terminal installer enables its service and
starts nothing.

## The runner archive

Each build takes one input, an `ImageSoftwareArtifact`. It is the public
HTTPS URL of a `.tar.gz` archive, with the SHA-256 digest of the archive.
The caller of the lifecycle routes supplies it as the `software` option, as
the [lifecycle README](../worker/lifecycle/README.md#browser-routes) says.
No code in this repository builds the archive yet. `readImageSoftware` in
[`image-software.ts`](../worker/lifecycle/image-software.ts) refuses a URL
with a user name, a password, a query, or a fragment. It also refuses a
digest that is not 64 hexadecimal characters.

The archive must hold `runner/main.mjs`: the agent runner, with its SDK
dependencies. It needs no Node, because the runner runs on the
[private Node runtime](#the-private-node-runtime).

Put no credential in the URL or in the archive. Each saved snapshot keeps
the unpacked archive.

## The private Node runtime

The runner, the git credential helper, and the agent tools start a private
Node by its full path. They never use a Node from `PATH` or the system
folders, because the org's install script can replace that Node.

[`image-runtime.ts`](../worker/lifecycle/image-runtime.ts) pins one Node 24
release for Linux x64, now 24.22.2. Its `version` constant names the
release. `IMAGE_NODE_RUNTIME.sha256` holds the SHA-256 digest of the
official `node-v<version>-linux-x64.tar.gz` archive. The
[release page of Node 24.22.2](https://nodejs.org/en/blog/release/v24.22.2)
gives that digest. The module derives these values from `version`:

- The download URL: `https://nodejs.org/dist/v<version>/node-v<version>-linux-x64.tar.gz`.
- The version folder: `/opt/conductive/runtime/node-v<version>-linux-x64`.
- The Node executable: `bin/node` in the version folder.

`install-runtime.sh` downloads nothing when the version folder already
holds an executable `bin/node`. So a later build reuses the release from
the last org image. Otherwise it downloads the archive, and checks its
digest with `sha256sum`. A wrong digest fails the build. It unpacks the
checked archive into a new folder, which then replaces the version folder.
It keeps the folders of other releases.

### Update the Node release

1. Choose the new Node 24 release. Copy the digest of its
   `node-v<version>-linux-x64.tar.gz` archive from its release page,
   `https://nodejs.org/en/blog/release/v<version>`. Check that
   `https://nodejs.org/dist/v<version>/SHASUMS256.txt` gives the same digest.
2. In `image-runtime.ts`, change `version` and `IMAGE_NODE_RUNTIME.sha256`.
   Change the release and its link in this section too.
3. Run the installer into a new scratch folder to check the real download:

   ```sh
   sh image/install-runtime.sh '<download URL>' '<digest>' "$PWD/.context/node-check/node-v<version>-linux-x64"
   ```

4. Run the tests in [Development](#development).

After you deploy the Worker, the next build of each org image installs the
new release. A refresh does not install it. A workspace that exists keeps
the Node of its image.

## Install

Before this step, Git in the build sandbox copies each chosen repository
into its folder, as the
[source loader](../worker/lifecycle/repository-layout.md#the-source-loader)
says. That Git comes from the image that the build sandbox starts from.
The first build starts as a new default sandbox. Each later build or
refresh starts from the last org image, which holds everything that earlier
builds installed. The copy uses no part of this folder's software.

Risk: a program with root access that an earlier install left in that
image can read the clone token of a later copy. That token can only read
its own repository, which the image already holds. The Worker revokes it
when the copy ends, as
[GitHub tokens](../docs/protocol/access-and-security.md#github-tokens)
says.

The software step of a build calls `installImageSoftware`. It writes the
scripts and the runner unit of this folder to `/opt/conductive/staged/`.
Each staged script holds the quoted full path of the private Node in place
of `@CONDUCTIVE_NODE@`. Then the step runs these commands, in this order:

```sh
sudo -n sh /opt/conductive/staged/install-runtime.sh '<Node URL>' '<Node digest>' '<version folder>'
sudo -n sh /opt/conductive/staged/install.sh '<archive URL>' '<SHA-256 digest>'
```

Boat runs commands as `user`, with passwordless sudo. The installers need
system permissions. The installed runner service runs as `user`.

`install.sh` does these steps. A failure stops it, and the build fails.

1. It downloads the archive with `curl`, and checks the digest with
   `sha256sum`.
2. It unpacks the archive into a new folder, and checks `runner/main.mjs`.
   It writes the version of the private Node to the build log.
3. It replaces `/opt/conductive/software` with the new folder, so no file
   of an older archive stays.
4. It installs the runner start script, the git credential helper, and the
   runner's systemd unit.
5. It makes `conductive-git-credential` the system credential helper of
   git, and sets `credential.useHttpPath`.
6. It enables the runner service. It does not start it.

A refresh skips this step. So a change in this folder reaches the new
workspaces of an org only after its next build. A workspace that exists
keeps its software.

## Start in a workspace

The Worker gives each workspace sandbox these variables at create and at
each resume, together with the org's env vars:

| Name | Value |
| --- | --- |
| `WORKSPACE_TOKEN` | The workspace token. |
| `CONDUCTIVE_WORKSPACE_ID` | The workspace ID. |
| `CONDUCTIVE_MACHINE_ORIGIN` | The origin of the machine hostname. |
| `CONDUCTIVE_REPOSITORY_DIR` | The folder of the workspace's repository, from the folder map that the workspace captured. |
| `CONDUCTIVE_REPOSITORY_<FOLDER>_DIR` | The folder of each repository of the image, with one variable for each repository. |
| `CONDUCTIVE_TURN_ID` | Empty. The runner sets it for each agent process. |
| `CONDUCTIVE_DISK_KEEPALIVE` | `1` in a disk retention restart, and `0` otherwise. |

[Repository folders](../docs/protocol/repository-folders.md) gives the
folder names and the variable names. The
[repository layout](../worker/lifecycle/repository-layout.md) says how the
Worker makes and keeps the folder map.

The runner and the terminal launcher read the variables from
`/run/ascii-secrets/env.sh`, where Boat puts them. A systemd service does
not get them in another way. A Boat command process does not get them
either. So the install command of a build loads the same file, with
automatic export, before Bash runs the org's install script. The install
script then gets the folder variables.

At a create, the Worker first fetches the default branch and creates the
workspace branch. When the GitHub repository has no refs, the fetch step
first pushes an empty first commit to the default branch. That push gets
its token from the [git credential helper](#git-credentials), as every
other git operation does. At each create and each resume, the Worker then
runs the command of `workspaceStartupCommand`:

1. It writes the org's startup script to `/run/conductive/startup.sh`, with
   mode 600.
2. It runs the script with Bash in the repository folder, with the
   variables.
3. When the script succeeds, it writes the marker
   `/run/conductive/workspace-ready`, and restarts the runner service.

After that command succeeds, the Worker calls the terminal backend's start
hook. That hook starts the terminal service. It caches the locally generated
password in encrypted form before the workspace becomes ready.

The runner start script exits with success, and starts nothing, in these
cases:

- `CONDUCTIVE_DISK_KEEPALIVE` is `1`.
- `WORKSPACE_TOKEN` or `CONDUCTIVE_WORKSPACE_ID` is empty.
- The marker `/run/conductive/workspace-ready` does not exist.

So a build sandbox and a disk retention restart start no runner. The
terminal backend needs its own marker under `/run`, which only its
workspace start hook creates. Builds and disk retention restarts do not
call that hook and start no terminal. A disk retention restart runs
`workspaceStartupCommand` in its `retention` mode. That mode runs the
startup script, but it writes no ready marker and does not restart the
runner service.

Otherwise, `runner-start.sh` runs `runner/main.mjs` with the private
Node, in the repository folder. The runner unit restarts its service after
a failure. The terminal backend describes its launcher, password, and
automatic restart in its [README](../worker/terminal/README.md).

## Git credentials

`install.sh` installs `git-credential-helper.sh` as
`/usr/local/bin/conductive-git-credential`. This wrapper keeps the
caller's `CONDUCTIVE_TURN_ID`, loads the sandbox variables, and runs
`git-credential-helper.mjs` with the private Node.

- The helper answers only a `get` request for `https` on `github.com`. It
  ignores every other request.
- It posts to the git credential route, `/v1/git/credential`, at
  `CONDUCTIVE_MACHINE_ORIGIN`, with the workspace token as a bearer token. It sends the turn ID in the
  `X-Conductive-Turn-Id` header. It sends no request body. It refuses
  redirects, and it stops after 30 seconds.
- It gives git the token as the password of the user `x-access-token`.
- The Worker returns a fresh GitHub user token of the sender of that turn.
  The helper saves nothing, so each git operation asks again.
- Without a current turn, or when the Worker refuses, the helper writes one
  fixed message. Git then gets no credential from the helper.

The Worker's route is not wired to the machine hostname yet, as the
[lifecycle README](../worker/lifecycle/README.md#machine-route) says.

## Secrets

- A build sandbox starts with no org env vars and no workspace token. It
  gets only the folder variables, which hold no secret. So no saved
  snapshot holds a secret of a workspace.
- The Worker gives each read token only to the Git command that copies its
  repository. The Worker revokes it before the build goes on, as
  [GitHub tokens](../docs/protocol/access-and-security.md#github-tokens)
  says. The software step and the install script run only after that.
- The archive URL can hold no user name, no password, and no query.
- The workspace object keeps the env values and output chunks of a start
  only in encrypted form. Before it returns a start log, it masks the
  complete joined stdout and stderr with the saved env values. This hides
  a value across chunks and across the stdout and stderr boundary.
- The terminal password stays in `/run/conductive-terminal/password`, with
  mode 600. The terminal backend checks that it has 64 lowercase
  hexadecimal characters.
  The readiness command writes no password to output or command history.
- The helper never writes a token or the Worker's response to its error
  output.

## Development

Run the credential helper test with
`npm run test -- worker/lifecycle/git-credential-helper.test.ts`. It
installs copies of the shipped launcher and helper, with a saved variables
file, in a temporary folder under `.context/`. It maps only
`/opt/conductive` and `/run/ascii-secrets` to that folder, and it refuses
a launcher that uses any other absolute path. It runs the launcher with
`/bin/sh`, and checks the outgoing credential request and its turn ID.
Both shell fixtures decode their files from the command of
`installImageSoftware` through one shared test helper.

Run the installer tests with
`npm run test -- worker/lifecycle/image-runtime.test.ts worker/lifecycle/image-software.test.ts`.
They run the shipped scripts with local archives and a fake `curl`.

- The Worker imports each file with Vite's `?raw` suffix. When you add a
  file here, also add it to `installImageSoftware`. Add it to `install.sh`
  too when a sandbox uses it after the build.
- Start Node in a script only as `@CONDUCTIVE_NODE@`.
- Keep each start script safe to run in a build sandbox. Of the variables
  in the table, a build sandbox has only the folder variables.

### Key Code

- [`install-runtime.sh`](install-runtime.sh): installs the private Node.
  Its arguments are the download URL, the digest, and the version folder.
- [`install.sh`](install.sh): installs the runner archive, its service,
  and the git helper. Its arguments are the archive URL and the digest.
- [`runner-start.sh`](runner-start.sh) and
  [`conductive-runner.service`](conductive-runner.service): start the agent
  runner.
- [The terminal backend](../worker/terminal/service.ts): owns the terminal
  install command, its service, and its workspace start hook.
- [`git-credential-helper.sh`](git-credential-helper.sh) and
  [`git-credential-helper.mjs`](git-credential-helper.mjs): the git
  credential helper.
- [`image-runtime.ts`](../worker/lifecycle/image-runtime.ts): the pinned
  Node release, its digest, and its paths.
- [`image-software.ts`](../worker/lifecycle/image-software.ts): stages these
  files for a build, adds the terminal install command, and makes the
  startup command for a workspace start or a disk retention restart.
- [`saved-script.ts`](../worker/lifecycle/saved-script.ts):
  `savedScriptCommand`, which writes the org's install or startup script to
  a file and runs it with Bash.

### Related Docs

- [Workspace lifecycle](../worker/lifecycle/README.md): the builds, the
  start steps, and the git credential route.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  the org image, the startup script, and the env vars.
- [Access and security](../docs/protocol/access-and-security.md): what a
  sandbox holds, GitHub tokens, and the terminal.
- [Architecture](../docs/architecture.md#sandbox-software): the sandbox
  software and its parts.
