#!/bin/sh
set -eu

set -a
. /run/ascii-secrets/env.sh
set +a

runner_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec "${CONDUCTING_NODE:-node}" "$runner_dir/runner.mjs"
