import { spawn } from 'node:child_process'

import { expect, it, onTestFinished, vi } from 'vitest'

import { FakeChild } from '../../test-support/child'
import { deferred } from '../../test-support/runtime'
import { startProcess } from './process'

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}))

it('gives each output line whole when its JSON text holds U+2028 or U+2029 and a chunk splits a character', async () => {
  const child = new FakeChild()
  vi.mocked(spawn).mockReturnValue(child)
  const port = startProcess({ command: 'codex', args: [], cwd: '/', env: {} })
  onTestFinished(async () => {
    child.exit()
    await port.close()
  })
  const lines: string[] = []
  const received = deferred<void>()
  port.onLine((line) => {
    lines.push(line)
    if (lines.length === 2) received.resolve()
  })
  // Codex writes these two characters raw inside JSON strings.
  const output = Buffer.from(
    '{"method":"item/agentMessage/delta","params":{"delta":"a\u2028b\u2029c"}}\n{"id":7,"result":{}}\n',
  )
  const split = output.indexOf(Buffer.from('\u2028')) + 1
  child.stdout.write(output.subarray(0, split))
  child.stdout.write(output.subarray(split))
  await received.promise
  expect(lines).toEqual([
    '{"method":"item/agentMessage/delta","params":{"delta":"a\u2028b\u2029c"}}',
    '{"id":7,"result":{}}',
  ])
})
