#!/bin/bash
set -euo pipefail
output=$1
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
mkdir -p "$output"
for file in runner-start.sh repository-folders.sh preview-relay-start.sh github-cli.sh 60-conductive-disk-cache.rules install-system.sh conductive-preview-relay.socket conductive-update-check.service conductive-update-check.timer; do
  cp "image/$file" "$staging/$file"
done
cp image/release/* "$staging/"
npx --no-install esbuild worker/terminal/scripts.ts --bundle --platform=node --format=esm --loader:.sh=text --outfile="$staging/terminal.mjs"
npx --no-install esbuild worker/terminal/bridge-files.ts --bundle --platform=node --format=esm --outfile="$staging/bridge-files.mjs"
npx --no-install esbuild src/shared/agent-tools.ts --bundle --platform=node --format=esm --outfile="$staging/paths.mjs"
node --input-type=module - "$staging" <<'JS'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
const folder = process.argv[2]
const { attachScript, credentialScript, launcherScript, sessionServerScript } = await import(pathToFileURL(`${folder}/terminal.mjs`).href)
const { BRIDGE_PATHS } = await import(pathToFileURL(`${folder}/bridge-files.mjs`).href)
const bridgeRoot = `${folder}/terminal-bridge`
mkdirSync(bridgeRoot)
writeFileSync(`${bridgeRoot}/package.json`, '{ "type": "module" }\n')
for (const path of BRIDGE_PATHS) {
  const target = `${bridgeRoot}/${path}`
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(path, target)
}
const { MACHINE_PATHS } = await import(pathToFileURL(`${folder}/paths.mjs`).href)
for (const [name, script] of [['terminal', launcherScript()], ['terminal-attach', attachScript()], ['terminal-password', credentialScript()], ['terminal-sessions', sessionServerScript()]]) {
  writeFileSync(`${folder}/${name}`, script)
}
for (const name of ['runner-start.sh']) {
  const text = readFileSync(`${folder}/${name}`, 'utf8')
    .replaceAll('@RUNNER_PATH@', MACHINE_PATHS.runner)
  writeFileSync(`${folder}/${name}`, text)
}
unlinkSync(`${folder}/terminal.mjs`)
unlinkSync(`${folder}/paths.mjs`)
unlinkSync(`${folder}/bridge-files.mjs`)
JS
chmod 755 "$staging"
chmod 755 "$staging"/*.sh "$staging"/terminal "$staging"/terminal-attach "$staging"/terminal-password "$staging"/terminal-sessions
chmod 644 "$staging"/*.service "$staging"/*.socket "$staging"/*.timer "$staging"/*.rules
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -czf "$output/system.tar.gz" -C "$staging" .
digest=$(sha256sum "$output/system.tar.gz")
digest=${digest%% *}
mv "$output/system.tar.gz" "$output/system-$digest.tar.gz"
printf '%s\n' "$digest"
