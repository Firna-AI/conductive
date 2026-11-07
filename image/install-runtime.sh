#!/bin/sh
set -eu

runtime_url=$1
runtime_sha256=$2
runtime_directory=$3

if [ -f "$runtime_directory/bin/node" ] && [ -x "$runtime_directory/bin/node" ]; then
  exit 0
fi

runtime_parent=${runtime_directory%/*}
install -d -m 755 "$runtime_parent"
archive=$(mktemp)
fresh_runtime=$(mktemp -d "$runtime_parent/.node.XXXXXX")
trap 'rm -f "$archive"; rm -rf "$fresh_runtime"' EXIT HUP INT TERM

curl --fail --silent --show-error --location "$runtime_url" --output "$archive"
printf '%s  %s\n' "$runtime_sha256" "$archive" | sha256sum --check --status
tar -xzf "$archive" -C "$fresh_runtime" --strip-components=1 --no-same-owner
test -f "$fresh_runtime/bin/node"
test -x "$fresh_runtime/bin/node"
chmod -R a+rX "$fresh_runtime"
rm -rf "$runtime_directory"
mv "$fresh_runtime" "$runtime_directory"
