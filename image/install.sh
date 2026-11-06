#!/bin/sh
set -eu

# The staged archive contains node/bin/node and runner/main.mjs with its SDKs.
# It is public software. Never put credentials in the URL or the archive.
artifact_url=$1
artifact_sha256=$2
archive=$(mktemp)
fresh_software=$(mktemp -d /opt/conducting/software.XXXXXX)
trap 'rm -f "$archive"; rm -rf "$fresh_software"' EXIT HUP INT TERM
curl --fail --silent --show-error --location "$artifact_url" --output "$archive"
printf '%s  %s\n' "$artifact_sha256" "$archive" | sha256sum --check --status
tar -xzf "$archive" -C "$fresh_software" --no-same-owner
test -x "$fresh_software/node/bin/node"
test -f "$fresh_software/runner/main.mjs"
chmod -R a+rX "$fresh_software"
"$fresh_software/node/bin/node" --version
rm -rf /opt/conducting/software
mv "$fresh_software" /opt/conducting/software

install -m 755 /opt/conducting/staged/runner-start.sh /opt/conducting/runner-start.sh
install -m 755 /opt/conducting/staged/git-credential-helper.sh /usr/local/bin/conducting-git-credential
install -m 644 /opt/conducting/staged/git-credential-helper.mjs /opt/conducting/git-credential-helper.mjs
install -m 644 /opt/conducting/staged/conducting-runner.service /etc/systemd/system/conducting-runner.service
git config --system --replace-all credential.helper /usr/local/bin/conducting-git-credential
git config --system credential.useHttpPath true
systemctl daemon-reload
systemctl enable conducting-runner.service
# Builds contain no workspace settings. Services start only in a workspace.
