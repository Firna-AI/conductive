import { execFile } from 'node:child_process'
import { mkdir, readFile, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { expect, it } from 'vitest'

import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { testDirectory } from '../test-support/test-directory'
import { lifecycleCommand } from './command-intents'
import { shellQuote } from './commands'
import { localSavedScriptFixture } from './saved-script-test-support'

const run = promisify(execFile)
const owner = { kind: 'workspace', id: 'one', attempt: 'later' } as const

it('a new workspace journal truncates settled output and keeps recent and live output', async () => {
  const sandbox = await localSavedScriptFixture(owner.id)
  try {
    const root = join(
      sandbox.directory,
      'workspace-journal',
      owner.kind,
      owner.id,
    )
    const old = new Date(Date.now() - 31 * 60_000)
    const recent = new Date(Date.now() - 29 * 60_000)
    for (const [attempt, resultName, resultTime] of [
      ['settled', 'result', old],
      ['recent', 'result', recent],
      ['live', 'result.tmp', old],
    ] as const) {
      const path = join(root, attempt, 'startup')
      await mkdir(path, { recursive: true })
      await writeFile(join(path, 'stdout'), 'output\n')
      await writeFile(join(path, 'stderr'), 'error\n')
      await writeFile(join(path, resultName), '0\n')
      await utimes(join(path, resultName), resultTime, resultTime)
    }

    const settled = join(root, 'settled', 'startup')
    const command = `test ! -s ${shellQuote(join(settled, 'stdout'))} && test ! -s ${shellQuote(join(settled, 'stderr'))}`
    expect(
      await sandbox.run(lifecycleCommand(owner, 'startup', command)),
    ).toMatchObject({ exitCode: 0 })
    for (const [attempt, stdout, stderr] of [
      ['settled', '', ''],
      ['recent', 'output\n', 'error\n'],
      ['live', 'output\n', 'error\n'],
    ] as const) {
      const path = join(root, attempt, 'startup')
      expect(await readFile(join(path, 'stdout'), 'utf8'), attempt).toBe(stdout)
      expect(await readFile(join(path, 'stderr'), 'utf8'), attempt).toBe(stderr)
    }
    expect(
      await readFile(join(root, 'settled', 'startup', 'result'), 'utf8'),
    ).toBe('0\n')
  } finally {
    await sandbox.dispose()
  }
})

async function runInPrivateMount(directory: string, script: string) {
  const args = [
    '--mount',
    '--propagation',
    'private',
    '/bin/sh',
    '-eu',
    '-c',
    script,
    'workspace-journal-test',
    directory,
  ]
  const options = {
    env: isolatedProcessEnvironment({
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
      LC_ALL: 'C',
    }),
  }
  try {
    return await run('unshare', ['--user', '--map-root-user', ...args], options)
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes('Operation not permitted')
    )
      throw error
    return run('sudo', ['-n', '--', 'unshare', ...args], options)
  }
}

it('publishes the actual exit status after the command fills the runtime filesystem', async () => {
  const files = await testDirectory('journal-full-')
  try {
    const root = join(files.path, 'conductive-lifecycle')
    const result = join(
      root,
      owner.kind,
      owner.id,
      owner.attempt,
      'startup',
      'result',
    )
    const fill = [
      'set -eu',
      `placeholder_size=$(stat -c '%s' -- ${shellQuote(`${result}.tmp`)} 2>/dev/null || printf 0)`,
      `set -- $(stat -f -c '%a %S' -- ${shellQuote(root)})`,
      `fallocate -l "$(($1 * $2))" -- ${shellQuote(join(root, 'fill'))}`,
      `test "$(stat -f -c '%a' -- ${shellQuote(root)})" = 0`,
      'test "$placeholder_size" = 4 || exit 91',
      'exit 7',
    ].join('\n')
    const journal = lifecycleCommand(owner, 'startup', fill)
      .replaceAll('/run/conductive-lifecycle', root)
      .replaceAll('sudo -n -- /bin/sh -c ', '/bin/true ')
    const { stdout } = await runInPrivateMount(
      files.path,
      [
        'mount -t tmpfs -o size=8k,mode=0700 tmpfs "$1"',
        `mkdir -- ${shellQuote(root)}`,
        'status=0',
        `${journal} || status=$?`,
        'printf "exit=%s\\n" "$status"',
        `stat -f -c 'free=%a' -- ${shellQuote(root)}`,
        `if [ -f ${shellQuote(result)} ]; then cat -- ${shellQuote(result)}; fi`,
      ].join('\n'),
    )
    expect(stdout).toBe('exit=7\nfree=0\n7\n')
  } finally {
    await files.remove()
  }
})
