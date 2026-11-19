#!/bin/sh
set -eu

base_scripts=$(dirname -- "$0")
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  bash build-essential ca-certificates clang curl dbus docker.io gh git golang-go \
  iproute2 openjdk-21-jdk-headless procps python3 python3-pip python3-venv \
  rustc cargo sudo unzip util-linux xz-utils

. "$base_scripts/runtime-settings.sh"
base_node_stage=$(mktemp -d)
trap 'rm -rf "$base_node_stage"' EXIT
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
  --output "$base_node_stage/node.tar.gz" "$base_node_url"
printf '%s  %s\n' "$base_node_sha256" "$base_node_stage/node.tar.gz" | sha256sum --check --status
install -d -m 755 "$base_node_directory"
tar -xzf "$base_node_stage/node.tar.gz" -C "$base_node_directory" --strip-components=1
for base_command in node npm npx; do
  ln -sf "$base_node_directory/bin/$base_command" "/usr/local/bin/$base_command"
done
sh "$base_scripts/install-tools.sh" \
  "$base_node_directory/bin/node" \
  "$base_node_directory/lib/node_modules/npm/bin/npm-cli.js"
sh "$base_scripts/install-computer.sh"

usermod -aG docker user
install -d -m 755 /usr/local/lib/conductive-e2b
install -m 644 "$base_scripts/port-relay.py" \
  /usr/local/lib/conductive-e2b/port-relay.py
install -m 644 "$base_scripts/port-relay.service" \
  /etc/systemd/system/conductive-e2b-port-relay.service
systemctl daemon-reload
systemctl add-wants sockets.target dbus.socket
systemctl enable docker.service conductive-e2b-port-relay.service
systemctl start dbus.socket docker.service conductive-e2b-port-relay.service
