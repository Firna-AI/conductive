import { execFile } from 'node:child_process'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import { expect, it, onTestFinished } from 'vitest'

import { isolatedProcessEnvironment } from '../test-support/process-environment'
import { WORKSPACE_TOOLS_COMMAND } from '../tools/image'
import { shellQuote } from './commands'
import { imageNodeExecutable } from './image-runtime'
import { imageToolsCommand, migrateImageToolsCommand } from './image-tools'

const execute = promisify(execFile)

it('keeps legacy tools and updater commands working without overwriting a release', async () => {
  const root = await mkdtemp(join(tmpdir(), 'conductive-image-tools-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const software = join(root, 'software')
  const program = join(software, 'current/conductive')
  const legacy = join(software, 'agent-tools/conductive')
  const commandPath = join(root, 'conductive')
  const bin = join(root, 'bin')
  await mkdir(bin)
  await mkdir(join(software, 'current/node/bin'), { recursive: true })
  await mkdir(join(software, 'agent-tools'))
  const releaseProgram = '#!/bin/sh\nprintf "release:%s\\n" "$*"\n'
  await writeFile(program, releaseProgram, { mode: 0o755 })
  await writeFile(
    join(software, 'current/node/bin/node'),
    '#!/bin/sh\nprintf "tools:%s\\n" "$*"\n',
    { mode: 0o755 },
  )
  await symlink(program, commandPath)
  await writeFile(
    join(bin, 'sudo'),
    '#!/bin/sh\n[ "$1" != -n ] || shift\n[ "$1" != -- ] || shift\nexec "$@"\n',
    { mode: 0o755 },
  )
  const options = {
    env: isolatedProcessEnvironment({
      PATH: `${bin}:/usr/bin:/bin`,
      TZ: 'UTC',
      LC_ALL: 'C',
    }),
  }
  const launcher = `#!/bin/sh\nexec ${shellQuote(imageNodeExecutable())} tools/main.ts "$@"\n`
  function mapPaths(command: string): string {
    const mapped = command
      .replaceAll('/opt/conductive', software)
      .replaceAll(WORKSPACE_TOOLS_COMMAND, commandPath)
    expect(mapped).not.toContain('/opt/conductive')
    expect(mapped).not.toContain(WORKSPACE_TOOLS_COMMAND)
    return mapped
  }
  const command = imageToolsCommand(
    `printf %s ${shellQuote(launcher)} > ${shellQuote(WORKSPACE_TOOLS_COMMAND)}\nchmod 0755 ${shellQuote(WORKSPACE_TOOLS_COMMAND)}`,
  )
  await execute('/bin/sh', ['-c', mapPaths(command)], options)
  expect(await readFile(program, 'utf8')).toBe(releaseProgram)
  expect((await lstat(commandPath)).isSymbolicLink()).toBe(true)
  const dispatcher = join(root, 'dispatcher')
  await writeFile(
    dispatcher,
    mapPaths(await readFile(resolve('image/conductive.sh'), 'utf8')),
    { mode: 0o755 },
  )
  expect((await execute(dispatcher, ['update', 'check'], options)).stdout).toBe(
    'release:update check\n',
  )
  expect((await execute(dispatcher, ['mcp'], options)).stdout).toBe(
    'tools:tools/main.ts mcp\n',
  )
  await unlink(commandPath)
  const installedLauncher = await readFile(legacy, 'utf8')
  await writeFile(commandPath, '#!/bin/sh\nexit 91\n', { mode: 0o755 })
  await execute(
    '/bin/sh',
    ['-c', mapPaths(migrateImageToolsCommand())],
    options,
  )
  expect(await readFile(legacy, 'utf8')).toBe(installedLauncher)
  await unlink(legacy)
  await writeFile(commandPath, mapPaths(launcher), { mode: 0o755 })
  await execute(
    '/bin/sh',
    ['-c', mapPaths(migrateImageToolsCommand())],
    options,
  )
  expect(
    (await execute(dispatcher, ['workspaces', 'list'], options)).stdout,
  ).toBe('tools:tools/main.ts workspaces list\n')
})
