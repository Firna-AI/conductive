#!/bin/sh
set -eu

service_user=${1:?Pass the sandbox service user.}
runner_prefix=${2:-/opt/conducting-runner}
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

getent passwd "$service_user" >/dev/null
node_binary=$(command -v node)
install -d "$runner_prefix/service"
install -m 644 "$source_dir/../dist/runner/runner.mjs" "$source_dir/../dist/runner/measure.mjs" "$source_dir/../dist/runner/compare.mjs" "$runner_prefix/"
install -m 644 "$source_dir/package.json" "$source_dir/package-lock.json" "$runner_prefix/"
install -m 755 "$source_dir/service/start.sh" "$runner_prefix/service/start.sh"
npm ci --omit=dev --ignore-scripts --prefix "$runner_prefix"
sed -e "s|@USER@|$service_user|g" -e "s|@PREFIX@|$runner_prefix|g" -e "s|@NODE@|$node_binary|g" \
  "$source_dir/service/conducting-runner.service" > /etc/systemd/system/conducting-runner.service
systemctl daemon-reload
systemctl enable conducting-runner.service
