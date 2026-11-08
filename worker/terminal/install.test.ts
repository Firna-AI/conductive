import { readFile } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { installationFixture } from './install.test-support'
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
