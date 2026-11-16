import { execFile, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, expect, it } from 'vitest'

import { BRIDGE_MAIN, BRIDGE_PATHS } from './bridge-files'

const execute = promisify(execFile)
const temporaryFolders: string[] = []
afterEach(async () => {
  await Promise.all(
    temporaryFolders
      .splice(0)
      .map((folder) => rm(folder, { recursive: true, force: true })),
  )
})

it('installs each bridge file at its repository path, so the bridge loads its modules', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'terminal-release-'))
  temporaryFolders.push(folder)
  const { stdout } = await execute('bash', ['image/package-system.sh', folder])
  const digest = stdout.trim()
  await execute('tar', [
    '-xzf',
    `${folder}/system-${digest}.tar.gz`,
    '-C',
    folder,
  ])
  expect(await readFile(`${folder}/terminal`, 'utf8')).toContain(BRIDGE_MAIN)
  const root = `${folder}/terminal-bridge`
  for (const path of BRIDGE_PATHS)
    expect(await readFile(`${root}/${path}`, 'utf8')).toBe(
      await readFile(path, 'utf8'),
    )
  // Without arguments, the bridge loads all its modules, then shows its use.
  const run = spawnSync(
    process.execPath,
    [`${root}/worker/terminal/bridge/main.ts`],
    { encoding: 'utf8' },
  )
  expect(run.status).toBe(2)
  expect(run.stderr).toBe(
    'Usage: main.ts <tmux> <socket> <repository> [session]\n',
  )
})

it('lists every module that the bridge imports, and no package', async () => {
  for (const path of BRIDGE_PATHS) {
    const text = await readFile(path, 'utf8')
    const folder = path.split('/').slice(0, -1)
    for (const [, target = ''] of text.matchAll(/from '([^']+)'/g)) {
      if (target.startsWith('node:')) continue
      const parts = [...folder]
      for (const part of target.split('/')) {
        if (part === '..') parts.pop()
        else if (part !== '.') parts.push(part)
      }
      expect(BRIDGE_PATHS, `${path} imports ${target}`).toContain(
        parts.join('/'),
      )
    }
  }
})
