import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { dirname, join, posix, relative, resolve } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

import type { CommandResult } from '../sandbox/provider'
import { shellQuote } from './commands'

const installedRoots = ['/opt/conducting', '/run/ascii-secrets']

/** Map only the launcher's approved absolute paths before executing it. */
function mappedLauncher(source: string, root: string): string {
  if (
    !source.startsWith('#!/bin/sh\n') ||
    /[`\\]/.test(source) ||
    source.includes('$(')
  )
    throw new Error('Unsafe credential launcher script')
  return source.replace(
    /(?<![\w./-])\/[\w./-]+/g,
    (path: string, offset: number) => {
      if (offset === 2 && path === '/bin/sh') return path
      if (
        !installedRoots.some(
          (prefix) => path === prefix || path.startsWith(`${prefix}/`),
        ) ||
        posix.normalize(path) !== path ||
        !/^[\s;"')]*$/.test(source[offset + path.length] ?? '')
      )
        throw new Error(`Unmapped credential launcher path: ${path}`)
      return shellQuote(join(root, path.slice(1)))
    },
  )
}

async function diskFiles(root: string): Promise<Record<string, string>> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const files = await Promise.all(
    entries
      .filter((entry) => !entry.isDirectory())
      .map(async (entry) => {
        const path = join(entry.parentPath, entry.name)
        const content = entry.isSymbolicLink()
          ? await readlink(path)
          : await readFile(path, 'utf8')
        return [relative(root, path), content]
      }),
  )
  return Object.fromEntries(files)
}

/** Install the real launcher and helper under this test's isolated root. */
export async function credentialLauncher(
  preload: string,
  savedEnvironment: Readonly<Record<string, string>>,
) {
  const evidence = resolve(
    import.meta.dirname,
    '../../.context/boat-native-remote-workspaces/milestone-5/orchestrator-round-2/credential-launcher',
  )
  await mkdir(evidence, { recursive: true })
  const root = await realpath(await mkdtemp(join(evidence, "case launcher's ")))
  const installation = join(root, 'opt/conducting')
  const secrets = join(root, 'run/ascii-secrets')
  const launcher = join(root, 'conducting-git-credential')
  const node = join(installation, 'software/node/bin/node')
  try {
    const source = await readFile(
      new URL('../../image/git-credential-helper.sh', import.meta.url),
      'utf8',
    )
    const mapped = mappedLauncher(source, root)
    await mkdir(dirname(node), { recursive: true })
    await mkdir(secrets, { recursive: true })
    await writeFile(launcher, mapped)
    await copyFile(
      new URL('../../image/git-credential-helper.mjs', import.meta.url),
      join(installation, 'git-credential-helper.mjs'),
    )
    await symlink(process.execPath, node)
    await writeFile(
      join(secrets, 'env.sh'),
      Object.entries(savedEnvironment)
        .map(([name, value]) => `${name}=${shellQuote(value)}\n`)
        .join(''),
      { mode: 0o600 },
    )
    return {
      files: () => diskFiles(root),
      run: (turnId: string, input: string): Promise<CommandResult> =>
        new Promise((resolve) => {
          const child = execFile(
            '/bin/sh',
            [launcher, 'get'],
            {
              cwd: root,
              env: {
                PATH: '/usr/bin:/bin',
                HOME: root,
                TMPDIR: root,
                LC_ALL: 'C',
                TZ: 'UTC',
                GIT_CEILING_DIRECTORIES: root,
                NODE_OPTIONS: `--import=data:text/javascript;base64,${Buffer.from(preload).toString('base64')}`,
                CONDUCTING_TURN_ID: turnId,
              },
            },
            (error, stdout, stderr) => {
              resolve({
                exitCode: error
                  ? typeof error.code === 'number'
                    ? error.code
                    : null
                  : 0,
                stdout,
                stderr: stderr || error?.message || '',
                timedOut: false,
              })
            },
          )
          child.stdin?.end(input)
        }),
      dispose: () => rm(root, { recursive: true, force: true }),
    }
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}
