import { unlink } from 'node:fs/promises'

import { expect, it } from 'vitest'

import { TERMINAL_ATTACH_NAME, TERMINAL_EXECUTABLE } from './scripts'
import { terminalStartFixture } from './start.test-support'

it('marks support from the running ttyd arguments and keeps older or rolled back software at one terminal', async () => {
  const fixture = await terminalStartFixture()
  await fixture.process(101, TERMINAL_EXECUTABLE, [TERMINAL_EXECUTABLE])
  await fixture.process(202, TERMINAL_EXECUTABLE, [
    TERMINAL_EXECUTABLE,
    '--url-arg',
    TERMINAL_ATTACH_NAME,
  ])
  for (const [pid, expected] of [
    [202, '1\n'],
    [101, '0\n'],
    [0, '0\n'],
  ] as const) {
    expect(await fixture.start([pid])).toEqual({
      code: 0,
      stdout: '',
      stderr: '',
    })
    expect(await fixture.marker()).toBe(expected)
  }
  await unlink(fixture.attach)
  expect((await fixture.start([202])).code).toBe(0)
  expect(await fixture.marker()).toBe('0\n')
})

it('waits through launcher reads and rereads MainPID before reporting ttyd support', async () => {
  const fixture = await terminalStartFixture()
  await fixture.process(101, '/bin/sh', [
    '/bin/sh',
    '/opt/conductive/current/system/terminal',
  ])
  await fixture.process(202, TERMINAL_EXECUTABLE, [
    TERMINAL_EXECUTABLE,
    '--url-arg',
    TERMINAL_ATTACH_NAME,
  ])
  expect(await fixture.start([101, 101, 202])).toEqual({
    code: 0,
    stdout: '',
    stderr: '',
  })
  expect(await fixture.marker()).toBe('1\n')
  expect(await fixture.reads()).toEqual(['101', '101', '202'])
  expect(await fixture.sleeps()).toEqual(['0.1', '0.1'])
})

it('ends the bounded poll with one terminal when the launcher never becomes ttyd', async () => {
  const fixture = await terminalStartFixture()
  for (const pid of [101, 202]) {
    await fixture.process(pid, '/bin/sh', [
      '/bin/sh',
      '--url-arg',
      TERMINAL_ATTACH_NAME,
    ])
  }
  expect(await fixture.start([101, 202])).toEqual({
    code: 0,
    stdout: '',
    stderr: '',
  })
  expect(await fixture.marker()).toBe('0\n')
  expect(await fixture.reads()).toEqual([
    '101',
    ...Array<string>(49).fill('202'),
  ])
  expect(await fixture.sleeps()).toEqual(Array<string>(49).fill('0.1'))
})
