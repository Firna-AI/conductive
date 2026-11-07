#!/bin/sh
set -eu
current_turn=${CONDUCTING_TURN_ID:-}
if [ -f /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
  set +a
fi
# The runner sets this separately for each agent process.
export CONDUCTING_TURN_ID=$current_turn
exec /opt/conducting/software/node/bin/node /opt/conducting/git-credential-helper.mjs "$@"
