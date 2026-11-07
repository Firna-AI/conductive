import { expect, it, vi } from 'vitest'

import {
  DEVICE_FRAME_LIMIT_BYTES,
  DEVICE_OUTPUT_LIMIT_BYTES,
} from '../../../src/shared/device.ts'
import { runCommand } from './runner.js'
import type { ProcessEvents } from './process.js'
import { command, fakeClock } from '../../tests/device-support.js'

function setup() {
  const time = fakeClock()
  let events: ProcessEvents | undefined
  const kill = vi.fn()
  const dispose = vi.fn()
  const launch = vi.fn(
    (_command: string, _folder: string, callbacks: ProcessEvents) => {
      events = callbacks
      return { kill, dispose }
    },
  )
  const output = () => {
    if (!events) throw new Error('No process was launched')
    return events
  }
  return { ...time, launch, kill, dispose, output }
}

it('uses the exact command and folder and returns split UTF-8 and exit status', async () => {
  const test = setup()
  const input = command({
    command: ' printf "hi"\n',
    folder: '/Users/cal/with spaces',
  })
  const run = runCommand(input, test)
  expect(test.launch.mock.calls[0].slice(0, 2)).toEqual([
    ' printf "hi"\n',
    '/Users/cal/with spaces',
  ])
  test.output().stdout(Buffer.from([0xf0, 0x9f]))
  test.output().stdout(Buffer.from([0x98, 0x80]))
  test.output().stderr(Buffer.from('warning'))
  test.output().close(7)
  expect(await run.result).toEqual({
    type: 'result',
    result: {
      stdout: '😀',
      stderr: 'warning',
      exitCode: 7,
      timedOut: false,
      truncated: false,
    },
  })
  expect(test.kill).toHaveBeenCalledOnce()
  expect(test.dispose).toHaveBeenCalledOnce()
})

it('caps combined output and JSON escapes without cutting a UTF-8 character', async () => {
  const test = setup()
  const run = runCommand(command(), test)
  test
    .output()
    .stderr(Buffer.from('\u0000'.repeat(DEVICE_OUTPUT_LIMIT_BYTES - 2)))
  test
    .output()
    .stdout(Buffer.from('😀' + 'x'.repeat(DEVICE_OUTPUT_LIMIT_BYTES)))
  test.output().close(0)
  const outcome = await run.result
  expect(outcome).toEqual({
    type: 'result',
    result: {
      stdout: '',
      stderr: '\u0000'.repeat(DEVICE_OUTPUT_LIMIT_BYTES - 2),
      exitCode: 0,
      timedOut: false,
      truncated: true,
    },
  })
  expect(Buffer.byteLength(JSON.stringify(outcome))).toBeLessThanOrEqual(
    DEVICE_FRAME_LIMIT_BYTES,
  )
})

it('kills the process group at the default deadline and cancels an explicit timeout', async () => {
  const test = setup()
  const run = runCommand({ ...command(), timeoutSeconds: undefined }, test)
  test.advance(59_999)
  expect(test.kill).not.toHaveBeenCalled()
  test.advance(1)
  expect(test.kill).toHaveBeenCalledOnce()
  expect(await run.result).toEqual({
    type: 'result',
    result: {
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: true,
      truncated: false,
    },
  })
  const second = runCommand(
    command({
      timeoutSeconds: 1800,
      longerTimeoutReason: 'Wait for a local export.',
    }),
    test,
  )
  test.advance(1_799_999)
  expect(test.kill).toHaveBeenCalledTimes(1)
  second.cancel()
  expect(test.kill).toHaveBeenCalledTimes(2)
  test.advance(1)
  expect(test.kill).toHaveBeenCalledTimes(2)
  expect((await second.result).type).toBe('cancelled')
})

it('validates time limits and command input again before starting a local process', async () => {
  const test = setup()
  for (const changes of [
    { timeoutSeconds: 0 },
    { timeoutSeconds: 120.5 },
    { timeoutSeconds: 1801, longerTimeoutReason: 'long' },
    { timeoutSeconds: 121 },
    { timeoutSeconds: 121, longerTimeoutReason: '  ' },
    { command: '' },
    { command: 'echo\u0000secret' },
    { folder: '' },
    { folder: '/tmp\u0000' },
    { reason: ' ' },
  ]) {
    expect(await runCommand(command(changes), test).result).toEqual({
      type: 'failed',
      message: 'The Mac command request is invalid.',
    })
  }
  expect(test.launch).not.toHaveBeenCalled()
  const valid = runCommand(command({ timeoutSeconds: 120 }), test)
  test.output().close(0)
  expect((await valid.result).type).toBe('result')
})

it('returns a safe launch failure for both thrown and emitted process errors', async () => {
  const test = setup()
  const first = runCommand(command(), {
    ...test,
    launch: () => {
      throw new Error('/Users/cal/secret')
    },
  })
  expect(await first.result).toEqual({
    type: 'failed',
    message:
      'The Mac could not start the command. Check the folder and try again.',
  })
  const second = runCommand(command(), test)
  test.output().error()
  expect(await second.result).toEqual(await first.result)
  expect(test.timers.size).toBe(0)
})
