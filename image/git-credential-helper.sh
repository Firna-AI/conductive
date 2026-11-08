#!/bin/sh
set -eu
current_turn=${CONDUCTIVE_TURN_ID:-}
if [ -f /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
  set +a
fi
# The runner sets this separately for each agent process.
export CONDUCTIVE_TURN_ID=$current_turn
exec @CONDUCTIVE_NODE@ /opt/conductive/git-credential-helper.mjs "$@"
