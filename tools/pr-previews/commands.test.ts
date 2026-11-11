import { afterEach, expect, it, vi } from 'vitest'
import { runPreviewCommand } from './cli.ts'
import { commentPreview } from './comment.ts'
import { deletePreview } from './delete.ts'
import { deployPreview } from './deploy.ts'
import { fakeContext } from './operations.test-support.ts'
import { sweepPreviews } from './sweep.ts'

const files = vi.hoisted(() => ({
  mkdtemp: vi.fn<() => Promise<string>>(),
  rm: vi.fn<() => Promise<void>>(),
  appendFile: vi.fn<() => Promise<void>>(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('node:fs/promises', () => files)
vi.mock('./deploy.ts', () => ({ deployPreview: vi.fn() }))
vi.mock('./delete.ts', () => ({ deletePreview: vi.fn() }))
vi.mock('./sweep.ts', () => ({ sweepPreviews: vi.fn() }))
vi.mock('./comment.ts', () => ({ commentPreview: vi.fn() }))
afterEach(() => vi.resetAllMocks())

it('dispatches deployment inputs and writes only public GitHub outputs', async () => {
  const { ctx } = fakeContext()
  const environment = { ...ctx.environment, GITHUB_OUTPUT: '/runner-output' }
  vi.mocked(deployPreview).mockResolvedValue({
    marketingUrl: 'https://pr-123.preview.example',
    appUrl: 'https://pr-123-app.preview.example',
    dataReset: true,
    registryRegistered: true,
  })
  await expect(
    runPreviewCommand(
      [
        'deploy',
        '--pr',
        '123',
        '--build-folder',
        '/artifact',
        '--wrangler',
        '/trusted/wrangler',
        '--runner-url',
        'https://runner.preview.example/runner.tar.gz',
        '--runner-sha256',
        'b'.repeat(64),
        '--runner-archive',
        '/artifact/runner.tar.gz',
        '--sha',
        'a'.repeat(40),
      ],
      environment,
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'complete',
    lines: [
      'Marketing: https://pr-123.preview.example',
      'App: https://pr-123-app.preview.example',
      'Data reset: true',
    ],
  })
  expect(deployPreview).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      cwd: '/artifact',
      wrangler: '/trusted/wrangler',
      io: ctx.io,
    }),
    {
      number: 123,
      buildFolder: '/artifact',
      sha: 'a'.repeat(40),
      runner: {
        url: 'https://runner.preview.example/runner.tar.gz',
        sha256: 'b'.repeat(64),
        path: '/artifact/runner.tar.gz',
      },
    },
  )
  expect(files.appendFile).toHaveBeenCalledExactlyOnceWith(
    '/runner-output',
    'marketing_url=https://pr-123.preview.example\napp_url=https://pr-123-app.preview.example\ndata_reset=true\n',
    'utf8',
  )
})

it('dispatches delete and sweep with a trusted Wrangler and cleans private working folders', async () => {
  const { ctx } = fakeContext()
  files.mkdtemp.mockResolvedValue('/runner-temp/conductive-preview-command-abc')
  vi.mocked(deletePreview).mockResolvedValue(undefined)
  vi.mocked(sweepPreviews).mockResolvedValue({
    deleted: [123],
    removedRegistry: [124],
  })
  const environment = { ...ctx.environment, RUNNER_TEMP: '/runner-temp' }
  await expect(
    runPreviewCommand(
      ['delete', '--pr', '123', '--wrangler', '/trusted/wrangler'],
      environment,
      ctx.io,
    ),
  ).resolves.toEqual({ kind: 'complete', lines: ['Deleted preview 123.'] })
  await expect(
    runPreviewCommand(
      ['sweep', '--wrangler', '/trusted/wrangler'],
      environment,
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'complete',
    lines: ['Deleted previews: 123.', 'Removed orphan registry entries: 124.'],
  })
  expect(deletePreview).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      cwd: '/runner-temp/conductive-preview-command-abc',
      wrangler: '/trusted/wrangler',
      io: ctx.io,
    }),
    123,
  )
  expect(sweepPreviews).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ wrangler: '/trusted/wrangler' }),
  )
  expect(files.rm.mock.calls).toEqual([
    [
      '/runner-temp/conductive-preview-command-abc',
      { recursive: true, force: true },
    ],
    [
      '/runner-temp/conductive-preview-command-abc',
      { recursive: true, force: true },
    ],
  ])
})

it('dispatches comment state and reset status without requiring cloud credentials', async () => {
  const { ctx } = fakeContext()
  const environment = {
    PREVIEW_ZONE: 'preview.example',
    GITHUB_TOKEN: 'fake-github-token',
    GITHUB_REPOSITORY: 'owner/repository',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_RUN_ID: '99',
  }
  vi.mocked(commentPreview).mockResolvedValue('updated')
  await expect(
    runPreviewCommand(
      [
        'comment',
        '--pr',
        '123',
        '--state',
        'live',
        '--sha',
        'a'.repeat(40),
        '--data-reset',
      ],
      environment,
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'complete',
    lines: ['Updated preview comment for PR 123.'],
  })
  expect(commentPreview).toHaveBeenCalledExactlyOnceWith(
    {
      number: 123,
      sha: 'a'.repeat(40),
      state: 'live',
      dataReset: true,
    },
    environment,
    ctx.io,
  )
})
