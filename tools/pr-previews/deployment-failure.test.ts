import { afterEach, expect, it, vi } from 'vitest'
import { runPreviewCommand } from './cli.ts'
import { deployPreview } from './deploy.ts'
import { DeploymentFailure } from './deployment-output.ts'
import { fakeContext } from './operations.test-support.ts'

const files = vi.hoisted(() => ({
  appendFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
}))
vi.mock('node:fs/promises', () => files)
vi.mock('./deploy.ts', () => ({ deployPreview: vi.fn() }))
afterEach(() => vi.resetAllMocks())

it('writes reset status for the comment job even when deployment fails after a reset', async () => {
  const { ctx } = fakeContext()
  vi.mocked(deployPreview).mockRejectedValue(
    new DeploymentFailure(new Error('Fake deployment failure.'), {
      marketingUrl: 'https://pr-123.preview.example',
      appUrl: 'https://pr-123-app.preview.example',
      dataReset: true,
    }),
  )
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
        '--sha',
        'a'.repeat(40),
        '--runner-url',
        'https://runner.preview.example/runner.tar.gz',
        '--runner-sha256',
        'b'.repeat(64),
      ],
      { ...ctx.environment, GITHUB_OUTPUT: '/runner-output' },
      ctx.io,
    ),
  ).rejects.toThrowError('Fake deployment failure.')
  expect(files.appendFile).toHaveBeenCalledExactlyOnceWith(
    '/runner-output',
    'marketing_url=https://pr-123.preview.example\napp_url=https://pr-123-app.preview.example\ndata_reset=true\n',
    'utf8',
  )
})
