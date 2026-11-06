import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { CommandResult } from '../sandbox/provider'
import { repositoryDirectory, shellQuote } from './commands'

export const SAVED_BASH_SCRIPT = [
  'set -euo pipefail',
  '[[ ! -o posix ]]',
  `words=('saved script' "Bash's ✓")`,
  `printf '%s|%s|%s|%s\\n' "\${words[*]}" "$PWD" "\${SAVED_TEXT-unset}" "\${CONDUCTING_DISK_KEEPALIVE-unset}"`,
].join('\n')

const scriptPaths = {
  install: '/tmp/conducting-install.sh',
  startup: '/run/conducting/startup.sh',
  retention: '/run/conducting/retention-startup.sh',
}
type ScriptKind = keyof typeof scriptPaths

/** Runs only known, harmless scripts inside an isolated temporary sandbox. */
export async function localSavedScriptFixture(
  repositoryId: string,
  diskKeepalive: '0' | '1' = '0',
) {
  const root = resolve(
    import.meta.dirname,
    '../../.context/boat-native-remote-workspaces/milestone-5/orchestrator-round-2/saved-bash/local-scripts',
  )
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'case-'))
  const repository = join(directory, 'repository')
  const runtime = join(directory, 'runtime')
  const environment = join(directory, 'env.sh')
  const runnerCalls = join(directory, 'runner-calls')
  const install = join(directory, 'install.sh')
  const mappedPaths = new Map([
    [repositoryDirectory(repositoryId), repository],
    ['/run/conducting', runtime],
    ['/run/ascii-secrets/env.sh', environment],
    [scriptPaths.install, install],
  ])
  await mkdir(repository)
  await writeFile(
    environment,
    [
      `CONDUCTING_REPOSITORY_DIR=${shellQuote(repository)}`,
      `CONDUCTING_DISK_KEEPALIVE=${shellQuote(diskKeepalive)}`,
      `SAVED_TEXT='loaded value'`,
    ].join('\n'),
    { mode: 0o600 },
  )
  function mapPath(path: string): string {
    for (const [source, target] of mappedPaths)
      path = path.replaceAll(source, target)
    if (!path.startsWith(`${directory}/`))
      throw new Error('A script path leaves its isolated sandbox')
    return path
  }
  async function readOptional(path: string): Promise<string | null> {
    try {
      return await readFile(path, 'utf8')
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return null
      throw error
    }
  }
  return {
    directory,
    repository,
    contains: (command: string, kind: ScriptKind) =>
      command.includes(scriptPaths[kind]),
    run: async (command: string): Promise<CommandResult> => {
      let mapped = command
        .replaceAll(
          'sudo -n install -d -m 700 -o user -g user /run/conducting',
          'install -d -m 700 /run/conducting',
        )
        .replaceAll(
          'sudo -n systemctl restart conducting-runner.service',
          `printf '%s\\n' runner-restarted >> ${shellQuote(runnerCalls)}`,
        )
      for (const [source, target] of mappedPaths)
        mapped = mapped.replaceAll(source, target)
      const unmapped = mapped.replaceAll(directory, '<isolated-sandbox>')
      if (/\/(?:run|opt|home\/user|tmp|\.git)(?:\/|\b)/.test(unmapped))
        throw new Error('A script command keeps a production path')
      if (mapped.includes(scriptPaths.install) || mapped.includes('sudo '))
        throw new Error('A script command keeps an unmapped operation')
      return new Promise((resolve, reject) => {
        execFile(
          '/bin/sh',
          ['-c', mapped],
          {
            cwd: directory,
            env: {
              PATH: '/usr/bin:/bin',
              HOME: directory,
              LC_ALL: 'C',
              TZ: 'UTC',
              GIT_CONFIG_NOSYSTEM: '1',
              GIT_CONFIG_GLOBAL: '/dev/null',
              GIT_CEILING_DIRECTORIES: directory,
            },
          },
          (error, stdout, stderr) => {
            const exitCode = error ? error.code : 0
            if (typeof exitCode !== 'number') return reject(error)
            resolve({ exitCode, stdout, stderr, timedOut: false })
          },
        )
      })
    },
    script: async (kind: ScriptKind) => {
      const path = mapPath(scriptPaths[kind])
      const text = await readOptional(path)
      return text === null
        ? null
        : { text, mode: (await stat(path)).mode & 0o777 }
    },
    ready: () => readOptional(join(runtime, 'workspace-ready')),
    runnerCalls: () => readOptional(runnerCalls),
    dispose: () => rm(directory, { recursive: true, force: true }),
  }
}
