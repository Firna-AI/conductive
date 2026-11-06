#!/bin/sh
set -eu
if [ -f /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
  set +a
fi
test "${CONDUCTING_DISK_KEEPALIVE:-0}" != 1 || exit 0
test -n "${WORKSPACE_TOKEN:-}" || exit 0
test -f /run/conducting/workspace-ready || exit 0
umask 077
mkdir -p /run/conducting
if [ ! -f /run/conducting/terminal-password ]; then
  head -c 32 /dev/urandom | base64 > /run/conducting/terminal-password
fi
cd "$CONDUCTING_REPOSITORY_DIR"
exec ttyd --interface 0.0.0.0 --port 7681 --writable \
  --credential "conducting:$(cat /run/conducting/terminal-password)" /bin/bash -l
