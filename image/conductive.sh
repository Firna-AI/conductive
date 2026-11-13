#!/bin/sh
set -eu
if [ "${1-}" = update ]; then
  exec /opt/conductive/current/conductive "$@"
fi
exec /opt/conductive/agent-tools/conductive "$@"
