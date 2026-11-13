import { chmod, writeFile } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { credentialScript, launcherScript } from './scripts'
import { runScript, scriptFixture } from './scripts.test-support'

/** A fake ttyd that runs the command after its own seven arguments. */
const runningTerminal = `#!/bin/sh
shift 7
exec "$@"
`

async function launch(node?: string) {
  const fixture = await scriptFixture()
  await writeFile(fixture.terminal, runningTerminal)
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

const tmuxArguments = (repository: string, socket: string) => [
  '-N',
  '-S',
  socket,
  'new-session',
  '-A',
  '-s',
  'workspace',
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
  const { fixture, result } = await launch('#!/bin/sh\nexit 3\n')
  expect(result.code).toBe(0)
  expect(result.stdout.split('\0').slice(2, -1)).toEqual(
    tmuxArguments(fixture.repository, fixture.sessionSocket),
  )
})

it('keeps any other exit code of the bridge, and runs no tmux client', async () => {
  const { result } = await launch('#!/bin/sh\nexit 1\n')
  expect(result).toEqual({ code: 1, stdout: '', stderr: '' })
})
