import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { runScript } from '../terminal/scripts.test-support'
import type { ImagePackages } from './image-packages'
import { installImageSoftware } from './image-software'
import type { SoftwareRelease } from './software-release'

const run = promisify(execFile)

/** The parts of a sandbox that the software step reads and changes. */
export interface ImageState {
  packages: readonly string[]
  ttyd: 'enabled' | 'masked'
  program: boolean
  updater: 'works' | 'fails' | 'stale'
}

async function executable(path: string, content: string): Promise<void> {
  await writeFile(path, content)
  await chmod(path, 0o755)
}

/**
 * Runs the real software step in a folder that stands in for the sandbox.
 * Stub programs record each call. The folder replaces `/opt/conductive`.
 */
export async function runSoftwareStep(
  state: ImageState,
  packages: ImagePackages,
) {
  const root = await mkdtemp(join(tmpdir(), 'image-software-'))
  const store = `${root}/opt`
  const bin = `${root}/bin`
  const log = `${root}/calls.log`
  const release: SoftwareRelease = {
    url: 'https://software.conductive.test/conductive.tar.gz',
    sha256: '',
    version: '0.0.42',
    server: 'https://runner.conductive.test',
  }
  await mkdir(bin)
  await mkdir(store)
  await writeFile(log, '')
  await writeFile(`${root}/packages`, state.packages.join('\n'))
  // Each copy of the program logs its own path, so a test can tell the
  // installed updater from the downloaded bootstrap program.
  const program = `#!/bin/sh
printf '%s %s\\n' "$0" "$*" >> '${log}'
case "$1 $2" in
  "update check")
    [ ! -e '${root}/updater-fails' ] || [ "$0" != '${store}/current/conductive' ] || exit 1
    [ -e '${root}/updater-stale' ] && [ "$0" = '${store}/current/conductive' ] && exit 0
    mkdir -p '${store}/versions/${release.version}'
    touch '${store}/versions/${release.version}/complete' ;;
  "update apply")
    mkdir -p '${store}/current'
    [ "$0" = '${store}/current/conductive' ] || cp "$0" '${store}/current/conductive'
    touch '${store}/current/complete' ;;
esac
`
  if (state.program) {
    await mkdir(`${store}/current`)
    await executable(`${store}/current/conductive`, program)
    await writeFile(`${store}/current/complete`, '')
  }
  if (state.updater !== 'works')
    await writeFile(`${root}/updater-${state.updater}`, '')
  await mkdir(`${root}/archive`)
  await executable(`${root}/archive/conductive`, program)
  await run('tar', [
    '-czf',
    `${root}/program.tar.gz`,
    '-C',
    `${root}/archive`,
    'conductive',
  ])
  release.sha256 = createHash('sha256')
    .update(await readFile(`${root}/program.tar.gz`))
    .digest('hex')
  const stubs: Record<string, string> = {
    sudo: `[ "$1" != -n ] || shift\n[ "$1" != -- ] || shift\nexec "$@"`,
    'apt-get': `printf 'apt-get %s\\n' "$*" >> '${log}'
case "$*" in
  *update*) [ "$*" = '-o Acquire::AllowReleaseInfoChange::Label=true update' ] || exit 100 ;;
esac`,
    systemctl: `if [ "$1" = is-enabled ]; then printf '%s\\n' ${state.ttyd}; exit 1; fi
printf 'systemctl %s\\n' "$*" >> '${log}'`,
    'dpkg-query': `status=0
for name in "$@"; do
  case "$name" in -*) continue ;; esac
  if grep -qx "$name" '${root}/packages'; then printf 'install ok installed\\n'
  else printf 'dpkg-query: no packages found matching %s\\n' "$name" >&2; status=1; fi
done
exit $status`,
    curl: `printf 'curl\\n' >> '${log}'
while [ "$#" -gt 0 ]; do [ "$1" = --output ] && cp '${root}/program.tar.gz' "$2"; shift; done`,
  }
  for (const [name, body] of Object.entries(stubs))
    await executable(`${bin}/${name}`, `#!/bin/sh\n${body}\n`)
  const command = installImageSoftware(release, packages).replaceAll(
    '/opt/conductive',
    store,
  )
  const result = await runScript(command, false, {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
  })
  const calls = (await readFile(log, 'utf8'))
    .replaceAll(`${store}/current/conductive`, 'installed')
    .replace(/\S+\/conductive (?=update)/g, 'bootstrap ')
  await rm(root, { recursive: true, force: true })
  return { ...result, calls: calls.split('\n').filter(Boolean) }
}
