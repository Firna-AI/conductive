# Install in a build

This guide belongs to the [sandbox software](README.md). It describes the
software step of an image build.

Before this step, Git in the build sandbox copies each repository of the job
into a new folder, as the
[source loader](../worker/lifecycle/repository-layout.md#the-source-loader)
says. That Git comes from the image that the build sandbox starts from.
Each build and refresh starts from a ready software image of the app
software version in its provider account. It skips the software step after the copy.
Without that image, it starts from the provider's base image and runs the
full software step. No image job starts from an org image, so no program
of an earlier org install can read a later clone token. The copy uses no
part of this folder's software. The Worker revokes each copy token before
the software step or the install script starts, as
[GitHub tokens](../docs/protocol/github-tokens.md)
says.

A build runs the saved install script. A refresh runs the install script
of the newest successful build, with that build's repositories and folders.
Both copy the newest commits into fresh folders. An empty script skips the
install step, so its log shows no install step.

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

A build or refresh from a software image skips this step, and the terminal
installer with it.
[Old workspaces](../docs/protocol/workspace-life.md#old-workspaces) says
how an existing workspace gets a change in this folder or in the terminal
software.
