#!/bin/sh
set -eu

service_user=${1:?Pass the sandbox service user.}
runner_prefix=${2:-/opt/conductive-runner}
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
node_binary=${CONDUCTIVE_NODE-}
case "$node_binary" in
  /*) ;;
  *)
    printf '%s\n' 'Set CONDUCTIVE_NODE to an absolute Node executable path.' >&2
    exit 1
    ;;
esac

getent passwd "$service_user" >/dev/null
install -d "$runner_prefix/service"
install -m 644 "$source_dir/../dist/runner/runner.mjs" "$source_dir/../dist/runner/measure.mjs" "$source_dir/../dist/runner/compare.mjs" "$runner_prefix/"
install -m 644 "$source_dir/package.json" "$source_dir/package-lock.json" "$runner_prefix/"
install -m 755 "$source_dir/service/start.sh" "$runner_prefix/service/start.sh"
"$node_binary" "${node_binary%/*}/npm" ci --omit=dev --ignore-scripts --prefix "$runner_prefix"
sed -e "s|@USER@|$service_user|g" -e "s|@PREFIX@|$runner_prefix|g" -e "s|@NODE@|$node_binary|g" \
  "$source_dir/service/conductive-runner.service" > /etc/systemd/system/conductive-runner.service
systemctl daemon-reload
systemctl enable conductive-runner.service
