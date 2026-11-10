#!/bin/sh
set -eu

# The staged archive contains the runner with its SDKs and the preview relay.
# It is public software. Never put credentials in the URL or the archive.
artifact_url=$1
artifact_sha256=$2
archive=$(mktemp)
fresh_software=$(mktemp -d /opt/conductive/software.XXXXXX)
trap 'rm -f "$archive"; rm -rf "$fresh_software"' EXIT HUP INT TERM
curl --fail --silent --show-error --location "$artifact_url" --output "$archive"
printf '%s  %s\n' "$artifact_sha256" "$archive" | sha256sum --check --status
tar -xzf "$archive" -C "$fresh_software" --no-same-owner
test -f "$fresh_software/runner/main.mjs"
test -f "$fresh_software/runner/relay.mjs"
chmod -R a+rX "$fresh_software"
@CONDUCTIVE_NODE@ --version
rm -rf /opt/conductive/software
mv "$fresh_software" /opt/conductive/software

if [ ! -x /usr/bin/gh ]; then
  apt-get update
  apt-get install -y gh
fi

install -m 755 /opt/conductive/staged/runner-start.sh /opt/conductive/runner-start.sh
install -m 755 /opt/conductive/staged/preview-relay-start.sh /opt/conductive/preview-relay-start.sh
install -m 755 /opt/conductive/staged/git-credential-helper.sh /usr/local/bin/conductive-git-credential
install -m 644 /opt/conductive/staged/git-credential-helper.mjs /opt/conductive/git-credential-helper.mjs
install -m 755 /opt/conductive/staged/github-cli.sh /usr/local/bin/gh
install -m 644 /opt/conductive/staged/conductive-runner.service /etc/systemd/system/conductive-runner.service
install -m 644 /opt/conductive/staged/conductive-preview-relay.service /etc/systemd/system/conductive-preview-relay.service
install -m 644 /opt/conductive/staged/conductive-preview-relay.socket /etc/systemd/system/conductive-preview-relay.socket
git config --system --replace-all credential.helper /usr/local/bin/conductive-git-credential
git config --system credential.useHttpPath true
systemctl daemon-reload
systemctl enable conductive-runner.service
systemctl enable conductive-preview-relay.socket
systemctl enable conductive-preview-relay.service
# Installation starts no service. The runner also needs workspace settings.
