import { chmod, writeFile } from 'node:fs/promises'

import { expect, it, onTestFinished } from 'vitest'

import { shellArgument } from './privileged'
import { credentialScript, launcherScript } from './scripts'
import { runScript, scriptFixture } from './scripts.test-support'

async function launch(node?: string, ids: readonly string[] = []) {
  const fixture = await scriptFixture()
  onTestFinished(fixture.dispose)
  await writeFile(
    fixture.terminal,
    `#!/bin/sh
shift 8
exec "$@" ${ids.map(shellArgument).join(' ')}
`,
  )
  const [nodePath = '', bridgePath = ''] = fixture.options.bridgeCommand
  if (node !== undefined) {
    await writeFile(nodePath, node)
    await chmod(nodePath, 0o700)
    await writeFile(bridgePath, '')
  }
  expect((await runScript(credentialScript(fixture.options))).code).toBe(0)
  const result = await runScript(launcherScript(fixture.options), false, {
    ...process.env,
    NODE_OPTIONS: '--require ./missing.js',
    NODE_PATH: '/missing',
  })
  return { fixture, result, nodePath, bridgePath }
}

const tmuxArguments = (
  repository: string,
  socket: string,
  session = 'workspace',
) => [
  '-N',
  '-S',
  socket,
  'new-session',
  '-A',
  '-s',
  session,
  '-c',
  repository,
  '/bin/bash',
  '-l',
]

it('runs the bridge with the private Node, without the Node variables of the workspace', async () => {
  const { fixture, result, bridgePath } = await launch(`#!/bin/sh
printf '%s\\0' "\${NODE_OPTIONS-unset}" "\${NODE_PATH-unset}" "$@"
`)
  expect(result.code).toBe(0)
  expect(result.stdout.split('\0').slice(0, -1)).toEqual([
    'unset',
    'unset',
    bridgePath,
    fixture.multiplexer,
    fixture.sessionSocket,
    fixture.repository,
    'workspace',
  ])
})

it('runs the plain tmux client when the image has no bridge', async () => {
  const { fixture, result } = await launch()
  expect(result.code).toBe(0)
  expect(result.stdout.split('\0').slice(2, -1)).toEqual(
    tmuxArguments(fixture.repository, fixture.sessionSocket),
  )
})

it('runs the plain tmux client when the bridge exits with code 3 before it attached', async () => {
  const { fixture, result } = await launch('#!/bin/sh\nexit 3\n', [
    '0123456789abcdef0123456789abcdef',
  ])
  expect(result.code).toBe(0)
  expect(result.stdout.split('\0').slice(2, -1)).toEqual(
    tmuxArguments(
      fixture.repository,
      fixture.sessionSocket,
      'terminal-0123456789abcdef0123456789abcdef',
    ),
  )
})

it('keeps any other exit code of the bridge, and runs no tmux client', async () => {
  const { result } = await launch('#!/bin/sh\nexit 1\n')
  expect(result).toEqual({ code: 1, stdout: '', stderr: '' })
})

it('passes a valid terminal ID to the bridge as a separate tmux session', async () => {
  const { fixture, result, bridgePath } = await launch(
    `#!/bin/sh
printf '%s\\0' "\${NODE_OPTIONS-unset}" "\${NODE_PATH-unset}" "$@"
`,
    ['0123456789abcdef0123456789abcdef'],
  )
  expect(result.code).toBe(0)
  expect(result.stdout.split('\0').slice(0, -1)).toEqual([
    'unset',
    'unset',
    bridgePath,
    fixture.multiplexer,
    fixture.sessionSocket,
    fixture.repository,
    'terminal-0123456789abcdef0123456789abcdef',
  ])
})

it('opens no bridge or shell for invalid, empty, or multiple terminal IDs', async () => {
  for (const ids of [
    ['workspace'],
    ['invalid'],
    [''],
    ['0123456789ABCDEF0123456789ABCDEF'],
    ['0123456789abcdef0123456789abcde'],
    ['0123456789abcdef0123456789abcdef\n'],
    ['0123456789abcdef0123456789abcdef', 'fedcba9876543210fedcba9876543210'],
  ]) {
    const { result } = await launch('#!/bin/sh\nprintf bridge-started\n', ids)
    expect(result, JSON.stringify(ids)).toEqual({
      code: 2,
      stdout: '',
      stderr: '',
    })
  }
})
