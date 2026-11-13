#!/bin/sh
set -eu

set -a
. /run/ascii-secrets/env.sh
set +a

runner_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export CONDUCTIVE_SDK_HELPER="$runner_dir/sdk-helper/sdk-helper.mjs"
exec "${1:?Pass the private Node executable path.}" "$runner_dir/runner.mjs"
