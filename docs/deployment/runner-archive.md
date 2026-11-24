# Conductive releases and software image

This page belongs to [Deployment inputs](../deployment.md). It describes
the release, container base image, and software image of each deploy from
`main`.

## Conductive release files

Every org image build and refresh installs the newest Conductive release.
The Worker reads the newest-version JSON before admission and command
composition. `CONDUCTIVE_RELEASE_SERVER` can replace the default base
`https://runner.conductive.build`. No archive URL or digest variable is needed.
A workspace read and a history read need no release lookup.

The static Rust program runs the agent runner, CLI, MCP server, preview
relay, Git credential helper, and updater. It embeds its version and a
schema-versioned parts list. The parts are `node`, `system`, and `sdk-helper`.
Each part has a name, an absolute HTTPS URL, and a SHA-256 digest.
The private Node archive stays at its official `nodejs.org` URL. The deploy
reads its URL and digest from the Worker's pinned runtime settings.
The Rust runner uses Node only for the SDK helper.

[The release crate](../../crates/cnd-release/README.md#quick-start) gives local
packaging commands. Publish a release from the same commit as the Worker,
so their runner protocols agree. Publish every immutable file before the
newest-version JSON. Use a separate release server for manual test releases.

### The release in each deploy

The R2 bucket `conductive-runner` serves release files at
`https://runner.conductive.build/`. The deploy builds the static program for
`x86_64-unknown-linux-musl`. Its version is `0.0.<count>`, where `<count>`
is the commit count of `main`. The checkout includes the full history.

The deploy writes these keys:

- SDK helper: `releases/download/sdk-helper/sdk-helper-<sha256>.tar.gz`.
- System: `releases/download/system/system-<sha256>.tar.gz`.
- Program: `releases/download/conductive/<version>/<release-digest>/conductive-<version>-x86_64-unknown-linux-musl.tar.gz`.
- Program manifest: `releases/download/conductive/<version>/<release-digest>/conductive-<version>-x86_64-unknown-linux-musl.json`.
- Program signature: `releases/download/conductive/signatures/<manifest-sha256>.sig`.
- Parts: `releases/download/conductive/<version>/<sha256>/parts-<version>-x86_64-unknown-linux-musl.json`.
- Newest-version JSON: `releases/latest/conductive/x86_64-unknown-linux-musl`.

Each `<sha256>` names the digest of that file's bytes. The
`<release-digest>` is the SHA-256 digest of the program archive.
The `<manifest-sha256>` is the SHA-256 digest of the program manifest.
The program manifest has the same bytes as the newest-version JSON for
that release. The detached Ed25519 signature covers those bytes.
The program archive holds `conductive`. The parts JSON has schema version
1 and a `parts` array of `name`, `url`, and `sha256` objects.
Immutable files have a one-year cache
time. The newest-version JSON has content type `application/json` and
`Cache-Control: max-age=60`.

The newest-version JSON uses the `cli-release-interface` format. It has
`binary`, `version`, `target`, `asset_name`, `download_url`, and `sha256`.
The URL is the absolute public program archive URL. The digest is required.
`HttpReleaseClient` reads it without a release server process.

1. Package `sdk-helper` and `system`, then embed all three parts and the
   version in the musl program build.
2. Upload each missing immutable file through R2's S3 API with the AWS CLI.
   Check each file's public size, including files that already exist.
3. Apply migrations, deploy the Worker, and pass its health check.
4. Read the current newest-version JSON directly from R2, outside the cache.
   Publish the candidate only for a higher version. A missing JSON permits
   the first release. A failed read or invalid current JSON stops publication.
5. Check the new JSON's public size with a version query that bypasses the
   previous cache entry. Then request the software image.

The S3 key pair comes from the deploy token, as
[Cloudflare documents](https://developers.cloudflare.com/r2/api/tokens/).
The key ID is the token ID. The secret key is the SHA-256 digest of the token.
The run masks it in the log. Old immutable files stay in the bucket.

### The container base image in each deploy

The `container-base` job runs after a successful `deploy` job on `main`.
It builds the Ubuntu 24.04 base of the E2B template and installs the
Conductive release of that deploy by version and program archive digest.
Each own computer uses this base for its first org image build.
See [The org image of each own computer](../protocol/own-computers.md#the-org-image-of-each-own-computer).

The job writes these immutable keys to `conductive-runner` with a one-year
cache time.

- OCI archive at `releases/download/container-base/<version>/<archive-sha256>/container-base-<version>.tar`, with content type `application/x-tar`.
- Signature at `releases/download/container-base/signatures/<manifest-sha256>.sig`, with content type `application/octet-stream`.
- Manifest at `releases/download/container-base/<version>/<release-digest>.json`, with content type `application/json`.

`<release-digest>` is the `sha256` of the program archive in the
newest-version JSON for that release. The container base image manifest
records the release identity, the archive digest and size, and the
Podman image ID. Its Ed25519 signature covers the manifest bytes.

1. Check the public manifest key. If it exists, record the skip and end the job.
2. Build the image, save it as an OCI archive, and sign its manifest with
   the release signing key.
3. Upload the archive and signature through the R2 S3 API. Skip each key
   that exists. Check the public archive size and the signature bytes.
4. Upload the manifest last and check its public size. This makes the
   archive and signature available before a reader finds the manifest.

### The software image

Each deploy from `main` asks the Worker for the
[software image](../protocol/org-image.md#the-software-image) of its new
version. The software image holds the base image, the Conductive release, and
the rest of the app's own sandbox software. The Worker builds it in the
`boat` account only. The first build of an org on `e2b` installs the app's
own software on the E2B template.

1. Before the Worker upload, the deploy makes 32 random bytes as its
   deploy token. It keeps the token in a file of the deploy job only, and
   masks it in the log.
2. It sets `CONDUCTIVE_DEPLOY_TOKEN_SHA256` to the SHA-256 digest of the
   token, with `--var`.
3. After the health check and release publication, it calls `POST /v1/deploy/software-image` on
   the machine hostname every 10 seconds, for up to 15 minutes. Each call
   sends the token and its digest. Each call moves the build on, and
   answers with its state and its new output.
4. A later job fails the run unless the last answer says that the image
   is ready.

- The Worker accepts the token only for 30 minutes after the creation time
  of its version, which `CF_VERSION_METADATA` gives.
- An older Worker version answers 409 to the digest of a newer deploy. The
  deploy then asks again.
- A deploy by hand sets no new token, so it builds no software image. Builds
  of an org without an org image then install the app's own software.
- After the wait ends, the 15-minute Cron Trigger moves an unfinished
  build on, until it ends or reaches its time limit of 60 minutes.
