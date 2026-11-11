import { afterEach, expect, it, vi } from 'vitest'
import { runPreviewCommand } from './cli.ts'
import { fakeContext } from './operations.test-support.ts'

const files = vi.hoisted(() => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  appendFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}))
vi.mock('node:fs/promises', () => files)
afterEach(() => vi.resetAllMocks())

it('skips infrastructure commands with absent setup and reports partial setup before work', async () => {
  const { ctx, command, http } = fakeContext()
  for (const name of ['deploy', 'delete', 'sweep']) {
    await expect(runPreviewCommand([name], {}, ctx.io)).resolves.toEqual({
      kind: 'skip',
      warning: 'Preview settings are absent. Skipping preview configuration.',
    })
  }
  await expect(
    runPreviewCommand(
      ['deploy'],
      { ...ctx.environment, BOAT_API_KEY: undefined },
      ctx.io,
    ),
  ).rejects.toThrowError('Missing preview settings: BOAT_API_KEY.')
  expect(command).not.toHaveBeenCalled()
  expect(http).not.toHaveBeenCalled()
  expect(files.mkdtemp).not.toHaveBeenCalled()
})

it('rejects invalid PR numbers and comment states before external work', async () => {
  const { ctx, http, command } = fakeContext()
  await expect(
    runPreviewCommand(
      ['delete', '--pr', '0', '--wrangler', '/trusted/wrangler'],
      ctx.environment,
      ctx.io,
    ),
  ).rejects.toThrowError('Pull request number must be a positive safe integer.')
  await expect(
    runPreviewCommand(
      ['comment', '--pr', '123', '--state', 'unknown', '--sha', 'a'.repeat(40)],
      ctx.environment,
      ctx.io,
    ),
  ).rejects.toThrowError('--state must be deploying, live, failed, or deleted.')
  expect(command).not.toHaveBeenCalled()
  expect(http).not.toHaveBeenCalled()
})
