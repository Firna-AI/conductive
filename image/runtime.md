# The private Node runtime

This guide belongs to the [sandbox software](README.md).

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
holds an executable `bin/node`. Otherwise it downloads the archive, and
checks its digest with `sha256sum`. A wrong digest fails the build. It
unpacks the checked archive into a new folder, which then replaces the
version folder. It keeps the folders of other releases. A build from a
ready software image runs no software step, so it keeps the release of
that image. A build from the base image downloads the release.

## Update the Node release

1. Choose the new Node 24 release. Copy the digest of its
   `node-v<version>-linux-x64.tar.gz` archive from its release page,
   `https://nodejs.org/en/blog/release/v<version>`. Check that
   `https://nodejs.org/dist/v<version>/SHASUMS256.txt` gives the same digest.
2. In `image-runtime.ts`, change `version` and `IMAGE_NODE_RUNTIME.sha256`.
   Change the release and its link on this page too.
3. Run the installer into a new scratch folder to check the real download:

   ```sh
   sh image/install-runtime.sh '<download URL>' '<digest>' "$PWD/.context/node-check/node-v<version>-linux-x64"
   ```

4. Run the tests in [Development](README.md#development).

After you deploy the Worker, the next build of each org image installs the
new release. A refresh does not install it. A workspace that exists keeps
the Node of its image.
