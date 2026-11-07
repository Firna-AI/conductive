import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import type { CommandResult } from '../sandbox/provider'
import { shellQuote } from './commands'

const execute = promisify(execFile)

/** The only executable tools are harmless stand-ins inside this mapped image. */
export async function repositoryShellFixture() {
  const root = resolve(
    import.meta.dirname,
    '../../.context/boat-native-remote-workspaces/milestone-5/decisions-89-91-94/lifecycle/image-layout',
  )
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(join(root, 'case-'))
  const home = join(directory, 'home')
  const bin = join(directory, 'bin')
  const calls = join(directory, 'calls')
  const environment = join(directory, 'env.sh')
  await mkdir(home)
  await mkdir(bin)
  for (const tool of ['sudo', 'npm', 'npx', 'pnpm', 'bun'])
    await writeFile(
      join(bin, tool),
      [
        '#!/bin/sh',
        `printf '%s|%s|%s\\n' "\${0##*/}" "$PWD" "$*" >> ${shellQuote(calls)}`,
        'if [ "${0##*/}" = npm ]; then mkdir -p node_modules; printf installed > node_modules/installed; fi',
      ].join('\n'),
      { mode: 0o700 },
    )
  const mapped = (text: string) =>
    text
      .replaceAll('/home/user', home)
      .replaceAll('/tmp/conducting-install.sh', join(directory, 'install.sh'))
      .replaceAll('/run/ascii-secrets/env.sh', environment)
  return {
    directory,
    home,
    mapped,
    writeEnvironment: (values: Readonly<Record<string, string>>) =>
      writeFile(
        environment,
        Object.entries(values)
          .map(([name, value]) => `${name}=${shellQuote(mapped(value))}`)
          .join('\n'),
        { mode: 0o600 },
      ),
    read: (path: string) => readFile(mapped(path), 'utf8'),
    run: async (
      command: string,
      values: Record<string, string> = {},
    ): Promise<CommandResult> => {
      const script = mapped(command)
      if (
        /\/(?:home\/user|run|opt|tmp)(?:\/|\b)/u.test(
          script.replaceAll(directory, '<mapped>'),
        )
      )
        throw new Error('A repository command keeps a production path')
      try {
        const result = await execute('/bin/sh', ['-c', script], {
          cwd: home,
          env: {
            PATH: `${bin}:/usr/bin:/bin`,
            HOME: home,
            LC_ALL: 'C',
            TZ: 'UTC',
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_CONFIG_GLOBAL: '/dev/null',
            GIT_CEILING_DIRECTORIES: directory,
            ...Object.fromEntries(
              Object.entries(values).map(([name, value]) => [
                name,
                mapped(value),
              ]),
            ),
          },
        })
        return { ...result, exitCode: 0, timedOut: false }
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          typeof error.code === 'number' &&
          'stdout' in error &&
          typeof error.stdout === 'string' &&
          'stderr' in error &&
          typeof error.stderr === 'string'
        )
          return {
            exitCode: error.code,
            stdout: error.stdout,
            stderr: error.stderr,
            timedOut: false,
          }
        throw error
      }
    },
    calls: async () =>
      (await readFile(calls, 'utf8')).replaceAll(home, '/home/user'),
    dispose: () => rm(directory, { recursive: true, force: true }),
  }
}
