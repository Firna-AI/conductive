import { unlink } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { TERMINAL_ATTACH_NAME, TERMINAL_EXECUTABLE } from './scripts'
import { terminalStartFixture } from './start.test-support'

it('applies the runner under the start lock before restarting ttyd and probing its new process, while keeping the shell server', async () => {
  const fixture = await terminalStartFixture()
  await fixture.process(101, '/bin/sh', ['/bin/sh'])
  await fixture.process(202, TERMINAL_EXECUTABLE, [
    TERMINAL_EXECUTABLE,
    '--url-arg',
    TERMINAL_ATTACH_NAME,
  ])
  expect((await fixture.start([202])).code).toBe(0)
  expect(await fixture.restart([101, 202])).toEqual({
    code: 0,
    stdout: '',
    stderr: '',
  })
  expect(await fixture.marker()).toBe('1\n')
  expect(await fixture.commands()).toEqual([
    'flock /run/conductive/bootstrap-activate.lock systemctl restart conductive-runner.service',
    'restart conductive-runner.service',
    'restart conductive-preview-relay.service',
    'restart conductive-terminal.service',
    'is-active --quiet conductive-terminal.service',
    'show --property=MainPID --value conductive-terminal.service',
    'show --property=MainPID --value conductive-terminal.service',
  ])
  expect(await fixture.reads()).toEqual(['101', '202'])
  expect(await fixture.sleeps()).toEqual(['0.1'])
})

it('warns and leaves no support marker when the terminal restart or probe fails, without failing Restart', async () => {
  const fixture = await terminalStartFixture()
  await fixture.process(202, TERMINAL_EXECUTABLE, [
    TERMINAL_EXECUTABLE,
    '--url-arg',
    TERMINAL_ATTACH_NAME,
  ])
  for (const [pids, failure] of [
    [[202], 'restart conductive-terminal.service'],
    [[202], 'is-active --quiet conductive-terminal.service'],
    [[0], ''],
  ] as const) {
    expect((await fixture.start([202])).code).toBe(0)
    expect(await fixture.marker()).toBe('1\n')
    expect(await fixture.restart(pids, failure)).toEqual({
      code: 0,
      stdout: '',
      stderr:
        'conductive: the terminal service did not restart or its support check failed\n',
    })
    expect(await fixture.marker()).toBeUndefined()
  }
})

it('writes one-terminal support for an older installed release without an attach program', async () => {
  const fixture = await terminalStartFixture()
  await fixture.process(202, TERMINAL_EXECUTABLE, [
    TERMINAL_EXECUTABLE,
    '--url-arg',
    TERMINAL_ATTACH_NAME,
  ])
  expect((await fixture.start([202])).code).toBe(0)
  expect(await fixture.marker()).toBe('1\n')
  await unlink(fixture.attach)
  expect(await fixture.restart([202])).toEqual({
    code: 0,
    stdout: '',
    stderr: '',
  })
  expect(await fixture.marker()).toBe('0\n')
  expect(await fixture.reads()).toEqual([])
})
