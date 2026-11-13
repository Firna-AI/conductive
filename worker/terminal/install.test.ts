import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { BRIDGE_FILES } from './bridge-files'
import { installationFixture } from './install.test-support'
import { terminalPromptCommand } from './scripts'
import { runScript } from './scripts.test-support'

it('installs the workspace shell server and starts it with the repository environment and private socket', async () => {
  const fixture = await installationFixture()
  expect(await fixture.install()).toEqual({ code: 0, stdout: '', stderr: '' })
  expect(await readFile(fixture.packages, 'utf8')).toBe(
    'update\ninstall -y ttyd tmux\n',
  )
  const result = await runScript(
    await readFile(`${fixture.installed}/terminal-sessions`, 'utf8'),
  )
  expect(result.code).toBe(0)
  expect(result.stderr).toBe('')
  expect(result.stdout).toContain(fixture.options.restoreMarker)
  expect(result.stdout.split('\0').slice(0, -1)).toEqual([
    fixture.repository,
    'workspace environment',
    '-S',
    fixture.sessionSocket,
    '-f',
    '/dev/null',
    'start-server',
    ';',
    'set-option',
    '-s',
    'exit-empty',
    'off',
    ';',
    'set-option',
    '-g',
    'mouse',
    'on',
    ';',
    'set-option',
    '-g',
    'history-limit',
    '2000',
    ';',
    'set-environment',
    '-g',
    'PROMPT_COMMAND',
    terminalPromptCommand(fixture.options.restoreMarker),
  ])
})

it('stops and masks the ttyd service of the package, which holds the terminal port', async () => {
  const fixture = await installationFixture()
  expect(await fixture.install()).toEqual({ code: 0, stdout: '', stderr: '' })
  const calls = (
    await readFile(`${fixture.units}/systemctl.log`, 'utf8')
  ).split('\n')
  expect(calls).toContain('disable --now ttyd.service')
  expect(calls.indexOf('mask ttyd.service')).toBeGreaterThan(-1)
  expect(calls.indexOf('mask ttyd.service')).toBeLessThan(
    calls.indexOf('enable conductive-terminal.service'),
  )
})

it('installs each bridge file at its repository path, so the bridge loads its modules', async () => {
  const fixture = await installationFixture()
  expect(await fixture.install()).toEqual({ code: 0, stdout: '', stderr: '' })
  const root = `${fixture.installed}/terminal-bridge`
  for (const [path, text] of Object.entries(BRIDGE_FILES))
    expect(await readFile(`${root}/${path}`, 'utf8')).toBe(text)
  // Without arguments, the bridge loads all its modules, then shows its use.
  const run = spawnSync(
    process.execPath,
    [`${root}/worker/terminal/bridge/main.ts`],
    { encoding: 'utf8' },
  )
  expect(run.status).toBe(2)
  expect(run.stderr).toBe(
    'Usage: main.ts <tmux> <socket> <repository> [session]\n',
  )
})

it('lists every module that the bridge imports, and no package', () => {
  for (const [path, text] of Object.entries(BRIDGE_FILES)) {
    const folder = path.split('/').slice(0, -1)
    for (const [, target = ''] of text.matchAll(/from '([^']+)'/g)) {
      if (target.startsWith('node:')) continue
      const parts = [...folder]
      for (const part of target.split('/')) {
        if (part === '..') parts.pop()
        else if (part !== '.') parts.push(part)
      }
      expect(Object.keys(BRIDGE_FILES), `${path} imports ${target}`).toContain(
        parts.join('/'),
      )
    }
  }
})
