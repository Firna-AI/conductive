#!/bin/sh
set -eu
if [ -f /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
  set +a
fi
test "${CONDUCTIVE_DISK_KEEPALIVE:-0}" != 1 || exit 0
if [ -z "${WORKSPACE_TOKEN:-}" ] || [ -z "${CONDUCTIVE_WORKSPACE_ID:-}" ]; then
  exit 0
fi
# Startup writes this marker only after branch preparation and the user script.
test -f /run/conductive/workspace-ready || exit 0
cd "$CONDUCTIVE_REPOSITORY_DIR"
exec /opt/conductive/software/node/bin/node /opt/conductive/software/runner/main.mjs
