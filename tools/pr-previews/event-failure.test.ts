import { expect, it, vi } from 'vitest'
import {
  event,
  files,
  inputs,
  noChanges,
  output,
  sha,
} from './event.test-support.ts'
import { runPreviewCommand } from './cli.ts'
import { commentPreview } from './comment.ts'
import { deletePreview } from './delete.ts'
import { deployPreview } from './deploy.ts'
import { DeploymentFailure } from './deployment-output.ts'

it('reports a deployment failure and preserves the reset note in its failed comment', async () => {
  const { ctx, environment } = event('open')
  vi.mocked(deployPreview).mockRejectedValue(
    new DeploymentFailure(new Error('Fake deploy failure.'), output),
  )
  await expect(
    runPreviewCommand(['event', ...inputs], environment, ctx.io),
  ).rejects.toThrowError('Fake deploy failure.')
  expect(
    vi
      .mocked(commentPreview)
      .mock.calls.map(([input]) => [input.state, input.dataReset]),
  ).toEqual([
    ['deploying', false],
    ['failed', true],
  ])
  expect(files.appendFile).toHaveBeenLastCalledWith(
    '/runner-output',
    'marketing_url=https://pr-123.preview.example\napp_url=https://pr-123-app.preview.example\ndata_reset=true\n',
    'utf8',
  )
})

it('posts a checked failure when prerequisites failed and skips an absent setup', async () => {
  const { ctx, environment } = event('open')
  const args = [
    'event',
    '--pr',
    '123',
    '--action',
    'reopened',
    '--sha',
    sha,
    '--failed',
  ]
  await expect(
    runPreviewCommand(args, environment, ctx.io),
  ).rejects.toThrowError('Preview prerequisites failed. See the workflow run.')
  expect(commentPreview).toHaveBeenCalledExactlyOnceWith(
    { number: 123, sha, state: 'failed', dataReset: false },
    environment,
    ctx.io,
  )
  expect(deployPreview).not.toHaveBeenCalled()
  expect(deletePreview).not.toHaveBeenCalled()
  vi.mocked(commentPreview).mockClear()
  await expect(
    runPreviewCommand(
      args,
      {
        GITHUB_REPOSITORY: environment.GITHUB_REPOSITORY,
        GITHUB_TOKEN: environment.GITHUB_TOKEN,
      },
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'skip',
    warning: 'Preview settings are absent. Skipping preview configuration.',
  })
  noChanges()
})
