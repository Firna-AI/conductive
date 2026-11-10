# Install in a build

This guide belongs to the [sandbox software](README.md). It describes the
software step of each image build.

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
4. It installs the GitHub CLI package when needed. It installs the runner
   start script, the git credential helper, the GitHub CLI wrapper, and the
   runner's systemd unit.
5. It makes `conductive-git-credential` the system credential helper of
   git, and sets `credential.useHttpPath`.
6. It enables the runner service. It does not start it.

A refresh and a first build from a software image skip this step, and the
terminal installer with it. So a change
in this folder or in the terminal software reaches the new workspaces of an
org only after its next build. A workspace that exists keeps its software.
