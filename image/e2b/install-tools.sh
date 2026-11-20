#!/bin/sh
set -eu

base_node=$1
base_npm=$2
tool_downloads=$(mktemp -d)
trap 'rm -rf "$tool_downloads"' EXIT HUP INT TERM

"$base_node" "$base_npm" install --global --prefix /usr/local pnpm@12.18.0

bun_archive="$tool_downloads/bun.zip"
curl --fail --silent --show-error --location \
  https://github.com/oven-sh/bun/releases/download/bun-v1.4.4/bun-linux-x64-baseline.zip \
  --output "$bun_archive"
printf '%s  %s\n' \
  e0446eb55995772eb9894bebae9a6be368d985a8b9271ee124486f9946eedd76 \
  "$bun_archive" | sha256sum --check --status
unzip -q "$bun_archive" -d "$tool_downloads/bun"
install -m 755 "$tool_downloads/bun/bun-linux-x64-baseline/bun" /usr/local/bin/bun
ln -sf /usr/local/bin/bun /usr/local/bin/bunx

uv_archive="$tool_downloads/uv.tar.gz"
curl --fail --silent --show-error --location \
  https://github.com/astral-sh/uv/releases/download/0.13.7/uv-x86_64-unknown-linux-gnu.tar.gz \
  --output "$uv_archive"
printf '%s  %s\n' \
  c5221ff41b7892bfc223543883600125f6a47fe845093e0f5bdff4f359196d83 \
  "$uv_archive" | sha256sum --check --status
tar -xzf "$uv_archive" -C "$tool_downloads"
install -m 755 "$tool_downloads/uv-x86_64-unknown-linux-gnu/uv" /usr/local/bin/uv
install -m 755 "$tool_downloads/uv-x86_64-unknown-linux-gnu/uvx" /usr/local/bin/uvx
