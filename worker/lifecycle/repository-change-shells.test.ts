import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { afterEach, expect, it } from 'vitest'

import { repositoryChangeSettleCommand } from './repository-change-commands'

const run = promisify(execFile)
const TMUX = '/usr/bin/tmux'
const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await run(TMUX, [
      '-S',
      join(`${root}/run-terminal`, 'tmux.sock'),
      'kill-server',
    ]).catch(() => undefined)
    await rm(root, { recursive: true, force: true })
  }
})

/** The folder of each pane, by the name of its window. */
async function folders(socket: string): Promise<Record<string, string>> {
  const { stdout } = await run(TMUX, [
    '-S',
    socket,
    'list-panes',
    '-a',
    '-F',
    '#{window_name}\t#{pane_current_path}',
  ])
  return Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .map((line) => line.split('\t')),
  )
}

async function settled(
  socket: string,
  expected: Record<string, string>,
): Promise<Record<string, string>> {
  let last: Record<string, string> = {}
  for (let attempt = 0; attempt < 50; attempt++) {
    last = await folders(socket)
    if (Object.entries(expected).every(([name, path]) => last[name] === path))
      return last
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return last
}

// The sandbox image has tmux. A machine without it cannot run this test.
it.skipIf(!existsSync(TMUX))(
  'moves each idle shell of the old folder to the new folder, and keeps a busy pane and a shell elsewhere',
  async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'cnd-shells-')))
    roots.push(root)
    const old = join(root, 'old folder')
    const target = join(root, 'new folder')
    const other = join(root, 'other')
    for (const folder of [join(old, '.context', 'sub'), target, other])
      await mkdir(folder, { recursive: true })
    const runtime = `${root}/run-terminal`
    await mkdir(runtime)
    const socket = join(runtime, 'tmux.sock')
    const shell = 'bash --norc --noprofile'
    const tmux = (...args: string[]) => run(TMUX, ['-S', socket, ...args])
    await tmux(
      'new-session',
      '-d',
      '-s',
      'workspace',
      '-n',
      'idle',
      '-c',
      old,
      shell,
    )
    await tmux(
      'new-window',
      '-n',
      'deeper',
      '-c',
      join(old, '.context', 'sub'),
      shell,
    )
    await tmux('new-window', '-n', 'busy', '-c', old, 'sleep 60')
    await tmux('new-window', '-n', 'elsewhere', '-c', other, shell)
    await tmux('send-keys', '-t', 'workspace:idle', '-l', 'half typed')
    const variable = 'CONDUCTIVE_REPOSITORY_TARGET_DIR'
    const command = repositoryChangeSettleCommand({
      directory: old,
      target: { directory: target, clone: { variable } },
    } as Parameters<typeof repositoryChangeSettleCommand>[0])
      .replaceAll('/run/conductive-terminal', runtime)
      .replaceAll('/run/conductive', join(root, 'run'))
    await run('/bin/sh', ['-c', command])
    expect((await tmux('show-environment', '-g', variable)).stdout).toBe(
      `${variable}=${target}\n`,
    )
    expect(await settled(socket, { idle: target, deeper: target })).toEqual({
      idle: target,
      deeper: target,
      busy: old,
      elsewhere: other,
    })
  },
)
