#!/bin/sh
set -eu
if [ -f /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
  set +a
fi
test "${CONDUCTING_DISK_KEEPALIVE:-0}" != 1 || exit 0
if [ -z "${WORKSPACE_TOKEN:-}" ] || [ -z "${CONDUCTING_WORKSPACE_ID:-}" ]; then
  exit 0
fi
# Startup writes this marker only after branch preparation and the user script.
test -f /run/conducting/workspace-ready || exit 0
cd "$CONDUCTING_REPOSITORY_DIR"
exec @CONDUCTING_NODE@ /opt/conducting/software/runner/main.mjs
