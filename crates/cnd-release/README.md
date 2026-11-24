# cnd-release

This crate owns the formats of Conductive releases and container base
images. The deploy commands use its filesystem boundary. The
`conductive` build script uses its parts reader. Depend on this crate to
read, write, or verify these release files.

## Responsibilities

- Validate versioned parts files, HTTPS URLs, and required SHA-256 digests.
- Write reproducible program archives, parts files, and signed updater metadata.
- Write signed manifests for container base images and validate them on read.
- Compare commit-count versions before a deploy replaces the newest version.

## What This Crate Does

`PartsList` schema version 1 holds a list of parts. Each part has a stable
`name`, an absolute HTTPS `url`, and a `sha256` digest. A new part needs one
entry. Readers accept added JSON fields. Incompatible schema versions,
duplicate names, and invalid downloads fail. Each release program checks
that its embedded list contains the roles that it needs. Older updaters
keep no fixed list of required roles.

`ReleaseFiles` owns the filesystem boundary. `DiskReleaseFiles` writes
files below the supplied output folder, with paths that match their R2
keys. Each program archive holds one executable named `conductive`. Its
headers have fixed timestamps and permissions. The program archive and
the parts file use keys that contain the SHA-256 digest of their bytes.

The deploy also runs `bash image/package-system.sh OUTPUT`. That command
writes the digest-named system archive and prints its digest. The system
part carries the sandbox scripts, units, GitHub CLI wrapper, and udev rule.
The deploy also runs `node runner/sdk-helper/scripts/package.mjs OUTPUT`.
That command writes `sdk-helper-<sha256>.tar.gz` and prints its digest.
The helper part holds its Node bundle, runtime npm packages, and agent programs.
Its Node runtime stays in the separate `node` part.
The Rust executable starts the helper from the same pinned release folder.
The complete parts list holds `node`, `sdk-helper`, and `system`.

The updater reads the parts embedded in the checked new executable.

The `parts` command writes an input file for the program build. Repeat
`--part NAME URL SHA256` for each part. The `package` command writes the
release files. Build its program with the same version and parts file.
Set `CONDUCTIVE_RELEASE_SIGNING_KEY` to the Ed25519 private key in PKCS#8
PEM format. The key must match `RELEASE_PUBLIC_KEY` in `signature.rs`.
The packager writes the same manifest bytes to the newest-version key
and the immutable program manifest key for that release. It signs those
bytes and writes the 64-byte signature to
`releases/download/conductive/signatures/<manifest-sha256>.sig`.
The deploy publishes the immutable files before the newest-version JSON.
Call `program_archive_key` and `program_manifest_key` with the release
version and program archive digest to get the server-relative keys.
Call `verify_manifest` with the fetched manifest bytes, the detached
signature, and a trusted public key.

The `container-base` command takes a Podman OCI archive and the image
ID. It uses the same signing key as `package` and prints the manifest key.
`ReleaseFiles::write_container_base` writes these files below the output
folder. It copies the input archive into its staging folder and hashes
the copy.

| File | Key relative to the release server |
| --- | --- |
| OCI archive | `releases/download/container-base/<version>/<archive-sha256>/container-base-<version>.tar` |
| Manifest | `releases/download/container-base/<version>/<release-digest>.json` |
| Signature | `releases/download/container-base/signatures/<manifest-sha256>.sig` |

The release digest is the SHA-256 digest of the program archive. The
version 1 manifest records the release version and digest, the OCI
archive digest and size, and the image ID with its `sha256:` prefix.
The signature holds 64 raw Ed25519 bytes over the exact manifest bytes. Call
`verify_manifest` before `read_container_base_manifest`. The reader
checks the expected release and validates the manifest fields.

The `newer` command prints `true` or `false`. Invalid metadata fails the
command. These commands upload nothing.

## The signing key

Make the key pair once, on a trusted machine. Set the private key as the
secret of the `production` environment, and print the public key bytes:

```sh
umask 077
key_dir=$(mktemp -d)
openssl genpkey -algorithm Ed25519 -out "$key_dir/release-key.pem"
gh secret set CONDUCTIVE_RELEASE_SIGNING_KEY \
  --repo Firna-AI/conductive --env production < "$key_dir/release-key.pem"
openssl pkey -in "$key_dir/release-key.pem" -pubout -outform DER |
  python3 -c '
import sys
key = sys.stdin.buffer.read()
assert len(key) == 44 and key[:12].hex() == "302a300506032b6570032100"
print("[" + ", ".join(f"0x{byte:02x}" for byte in key[-32:]) + "]")
'
```

Put the printed array in `RELEASE_PUBLIC_KEY` in `src/signature.rs`. Keep
the private key file offline, or delete it. The deploy refuses to publish
while the secret is missing or while the constant is the placeholder.

## Quick Start

Run from the repository root with the SDK helper, Node, and system URLs
and digests. Set `CONDUCTIVE_RELEASE_KEY_FILE` to the path of the PEM file
that holds the key for this build.

```sh
cargo run -p cnd-release -- parts \
  --part node "$NODE_URL" "$NODE_SHA256" \
  --part sdk-helper "$SDK_HELPER_URL" "$SDK_HELPER_SHA256" \
  --part system "$SYSTEM_URL" "$SYSTEM_SHA256" \
  --output "$PWD/.context/release-input/parts.json"
CONDUCTIVE_RELEASE_VERSION=0.0.42 \
CONDUCTIVE_PARTS_FILE="$PWD/.context/release-input/parts.json" \
  cargo build --release --target x86_64-unknown-linux-musl -p cnd-cli
cargo build -p cnd-release
CONDUCTIVE_RELEASE_SIGNING_KEY="$(cat "$CONDUCTIVE_RELEASE_KEY_FILE")" \
  target/debug/cnd-release package --version 0.0.42 \
  --program target/x86_64-unknown-linux-musl/release/conductive \
  --parts .context/release-input/parts.json --output .context/release-artifact
```

Set `CONTAINER_BASE_IMAGE` to the Podman image that contains this release.
Set `PROGRAM_ARCHIVE_SHA256` to the digest in the program's manifest.

```sh
podman save --format oci-archive --output .context/container-base.tar "$CONTAINER_BASE_IMAGE"
CONDUCTIVE_RELEASE_SIGNING_KEY="$(cat "$CONDUCTIVE_RELEASE_KEY_FILE")" \
  target/debug/cnd-release container-base --version 0.0.42 \
  --digest "$PROGRAM_ARCHIVE_SHA256" --archive .context/container-base.tar \
  --image-id "$(podman image inspect --format '{{.Id}}' "$CONTAINER_BASE_IMAGE")" \
  --output .context/release-artifact
```

## Development

```sh
cargo test -p cnd-release
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
```

The disk integration test checks the signature. It also reads the same
manifest as `ReleaseAssetInfo` and installs its archive through
`cli-updater` with the required digest.

### Key Code

- [parts.rs](src/parts.rs) defines and validates the shared parts format.
- [files.rs](src/files.rs) defines `ReleaseFiles` and the deterministic writer.
- [manifest.rs](src/manifest.rs) defines the program archive and manifest keys.
- [container_base.rs](src/container_base.rs) defines the container base manifest, keys, and reader.
- [signature.rs](src/signature.rs) owns signing, verification, and the release public key.
- [version.rs](src/version.rs) owns the release identity and version ordering.
- [main.rs](src/main.rs) defines the program and container packaging commands.
- [package_tests.rs](tests/package_tests.rs) checks the written release through the updater installer.
- [container_base_tests.rs](tests/container_base_tests.rs) checks the archive, manifest, and signature written to disk.

### Related Docs

- [Deployment release files](../../docs/deployment/runner-archive.md#the-release-in-each-deploy) gives the R2 paths and publication rules.
- [Sandbox software](../../image/README.md) describes the installed software.
- [Architecture](../../docs/architecture.md) describes the system.
