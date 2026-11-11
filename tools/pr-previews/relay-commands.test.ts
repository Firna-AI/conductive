import { afterEach, expect, it, vi } from 'vitest'
import { runPreviewCommand } from './cli.ts'
import { writeManifestForm } from './manifest.ts'
import { fakeContext } from './operations.test-support.ts'
import { deployRelay } from './relay-deploy.ts'

const files = vi.hoisted(() => ({
  mkdtemp: vi.fn<() => Promise<string>>(),
  rm: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('node:fs/promises', () => files)
vi.mock('./relay-deploy.ts', () => ({ deployRelay: vi.fn() }))
vi.mock('./manifest.ts', () => ({ writeManifestForm: vi.fn() }))
afterEach(() => vi.resetAllMocks())

it('dispatches relay with the explicit zone and a trusted Wrangler in a private folder', async () => {
  const { ctx } = fakeContext()
  files.mkdtemp.mockResolvedValue('/runner-temp/relay-work')
  vi.mocked(deployRelay).mockResolvedValue('https://other.example/')
  await expect(
    runPreviewCommand(
      ['relay', '--zone', 'other.example', '--wrangler', '/trusted/wrangler'],
      ctx.environment,
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'complete',
    lines: ['Relay: https://other.example/'],
  })
  expect(deployRelay).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      cwd: '/runner-temp/relay-work',
      wrangler: '/trusted/wrangler',
      io: ctx.io,
      settings: expect.objectContaining({ zone: 'other.example' }),
    }),
  )
  expect(files.rm).toHaveBeenCalledExactlyOnceWith('/runner-temp/relay-work', {
    recursive: true,
    force: true,
  })
})

it('returns printable manifest JSON and its form path without deployment settings', async () => {
  const { ctx } = fakeContext()
  vi.mocked(writeManifestForm).mockResolvedValue({
    manifest: { name: 'demo' },
    formPath: '/workspace/register.html',
  })
  await expect(
    runPreviewCommand(
      ['manifest', '--zone', 'preview.example', '--owner', 'sample-owner'],
      {},
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'manifest',
    json: '{\n  "name": "demo"\n}',
    formPath: '/workspace/register.html',
  })
  expect(writeManifestForm).toHaveBeenCalledExactlyOnceWith(
    'preview.example',
    'sample-owner',
    ctx.io,
  )
  expect(files.mkdtemp).not.toHaveBeenCalled()
})
