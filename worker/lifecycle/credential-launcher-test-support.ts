import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import {
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
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'

import type { CommandResult } from '../sandbox/provider'
import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { shellQuote } from './commands'
import { imageNodeExecutable } from './image-runtime'
import { stagedImageSoftware } from './image-software-staging-test-support'

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
  const installation = join(root, 'opt/conductive')
  const secrets = join(root, 'run/ascii-secrets')
  const launcher = join(root, 'conductive-git-credential')
  const commands = join(root, 'caller-bin')
  const node = imageNodeExecutable(root)
  try {
    const files = stagedImageSoftware(root)
    const source = files.get('git-credential-helper.sh')
    const program = files.get('git-credential-helper.mjs')
    if (source === undefined || program === undefined)
      throw new Error('The staged credential helper is missing.')
    await mkdir(dirname(node), { recursive: true })
    await mkdir(secrets, { recursive: true })
    await mkdir(commands, { recursive: true })
    await writeFile(join(commands, 'node'), '#!/bin/sh\nexit 73\n', {
      mode: 0o755,
    })
    await writeFile(launcher, source)
    await writeFile(join(installation, 'git-credential-helper.mjs'), program)
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
          let stdinFailure = ''
          const child = execFile(
            '/bin/sh',
            [launcher, 'get'],
            {
              cwd: root,
              env: isolatedProcessEnvironment({
                PATH: `${commands}:/usr/bin:/bin`,
                HOME: root,
                TMPDIR: root,
                LC_ALL: 'C',
                TZ: 'UTC',
                GIT_CEILING_DIRECTORIES: root,
                NODE_OPTIONS: `--import=data:text/javascript;base64,${Buffer.from(preload).toString('base64')}`,
                CONDUCTIVE_TURN_ID: turnId,
              }),
            },
            (error, stdout, stderr) => {
              resolve({
                exitCode: error
                  ? typeof error.code === 'number'
                    ? error.code
                    : null
                  : 0,
                stdout,
                stderr: stderr || error?.message || stdinFailure,
                timedOut: false,
              })
            },
          )
          child.stdin?.on('error', (error: Error) => {
            stdinFailure = error.message
          })
          child.stdin?.end(input)
        }),
      dispose: () => rm(root, { recursive: true, force: true }),
    }
  } catch (error) {
    await rm(root, { recursive: true, force: true })
    throw error
  }
}
