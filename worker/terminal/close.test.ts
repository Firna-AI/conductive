import { readFile, writeFile } from 'node:fs/promises'

import { expect, it, onTestFinished, vi } from 'vitest'

import { ProviderError } from '../sandbox/errors'
import { closeWorkspaceTerminal } from './close'
import { TERMINAL_RUNTIME } from './scripts'
import { runScript, scriptFixture } from './scripts.test-support'

const terminalId = '0123456789abcdef0123456789abcdef'

it('ends only the selected session as user and accepts an absent session or server', async () => {
  const fixture = await scriptFixture()
  onTestFinished(fixture.dispose)
  await writeFile(
    fixture.multiplexer,
    `#!/bin/sh
printf '%s\\0' "$@" > '${fixture.root}/arguments'
printf '%s' "$TMUX_ERROR" >&2
exit "$TMUX_EXIT"
`,
  )
  let message = ''
  const runCommand = vi.fn(async (_sandboxId: string, command: string) => {
    expect(command).toContain('sudo -n -- /bin/sh -c ')
    expect(command).toContain('/usr/sbin/runuser -u user -- /bin/sh -c ')
    const result = await runScript(
      command
        .replace('sudo -n -- ', '')
        .replace('/usr/sbin/runuser -u user -- ', '')
        .replace('/usr/bin/tmux', fixture.multiplexer),
      false,
      {
        ...process.env,
        TMUX_ERROR: message,
        TMUX_EXIT: message ? '1' : '0',
      },
    )
    return {
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      timedOut: false,
    }
  })
  for (message of [
    '',
    `can't find session: terminal-${terminalId}`,
    'no current target',
    `no server running on ${TERMINAL_RUNTIME}/tmux.sock`,
    `error connecting to ${TERMINAL_RUNTIME}/tmux.sock (No such file or directory)`,
  ]) {
    await expect(
      closeWorkspaceTerminal({ runCommand }, 'bx_one', terminalId),
    ).resolves.toBeUndefined()
  }
  message = `error connecting to ${TERMINAL_RUNTIME}/tmux.sock (Permission denied)`
  await expect(
    closeWorkspaceTerminal({ runCommand }, 'bx_one', terminalId),
  ).rejects.toEqual(new ProviderError('unavailable', 502))
  expect(runCommand).toHaveBeenCalledTimes(6)
  expect(
    (await readFile(`${fixture.root}/arguments`, 'utf8'))
      .split('\0')
      .slice(0, -1),
  ).toEqual([
    '-N',
    '-S',
    `${TERMINAL_RUNTIME}/tmux.sock`,
    'kill-session',
    '-t',
    `=terminal-${terminalId}`,
  ])
  for (message of ['', "can't find session: workspace"])
    await expect(
      closeWorkspaceTerminal({ runCommand }, 'bx_one', 'workspace'),
    ).resolves.toBeUndefined()
  expect(
    (await readFile(`${fixture.root}/arguments`, 'utf8'))
      .split('\0')
      .slice(0, -1),
  ).toEqual([
    '-N',
    '-S',
    `${TERMINAL_RUNTIME}/tmux.sock`,
    'kill-session',
    '-t',
    '=workspace',
  ])
})

it('reports a failed close or a command timeout as a provider error', async () => {
  const runCommand = vi.fn()
  for (const result of [
    { exitCode: 1, stdout: '', stderr: 'Permission denied', timedOut: false },
    { exitCode: null, stdout: '', stderr: '', timedOut: true },
    { exitCode: 0, stdout: '', stderr: '', timedOut: true },
  ]) {
    runCommand.mockResolvedValue(result)
    await expect(
      closeWorkspaceTerminal({ runCommand }, 'bx_one', terminalId),
    ).rejects.toEqual(new ProviderError('unavailable', 502))
  }
})

it('refuses invalid IDs before sending a command', async () => {
  const runCommand = vi.fn()
  for (const id of [
    '',
    'bad-id',
    `${terminalId}\n`,
    "'; exit 0",
    terminalId.toUpperCase(),
  ]) {
    await expect(
      closeWorkspaceTerminal({ runCommand }, 'bx_one', id),
    ).rejects.toEqual(new ProviderError('invalid_request', 400))
  }
  expect(runCommand).not.toHaveBeenCalled()
})
