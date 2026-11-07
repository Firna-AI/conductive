#!/bin/sh
set -eu

set -a
. /run/ascii-secrets/env.sh
set +a

runner_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
exec "${1:?Pass the private Node executable path.}" "$runner_dir/runner.mjs"
