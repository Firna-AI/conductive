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

it('skips a stale deploy before settings, resources, or comments', async () => {
  const { ctx, http, environment } = event('open', 'b'.repeat(40))
  await expect(
    runPreviewCommand(
      ['event', ...inputs],
      { ...environment, BOAT_API_KEY: undefined },
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'skip',
    warning: '::notice::Preview run for PR 123 is stale. No changes made.',
  })
  expect(
    http.mock.calls.map(([request]) => [request.method, request.url]),
  ).toEqual([
    ['GET', 'https://api.github.com/repos/owner/repository/pulls/123'],
  ])
  expect(files.appendFile).toHaveBeenCalledExactlyOnceWith(
    '/runner-output',
    'event_action=stale\n',
    'utf8',
  )
  noChanges()
})

it('deploys the current head and posts deploying then live with the reset note', async () => {
  const { ctx, environment } = event('open')
  const order: string[] = []
  vi.mocked(commentPreview).mockImplementation(async ({ state }) => {
    order.push(state)
    return 'updated'
  })
  vi.mocked(deployPreview).mockImplementation(async () => {
    order.push('deploy')
    return output
  })
  await expect(
    runPreviewCommand(['event', ...inputs], environment, ctx.io),
  ).resolves.toEqual({
    kind: 'complete',
    lines: [
      'Marketing: https://pr-123.preview.example',
      'App: https://pr-123-app.preview.example',
      'Data reset: true',
    ],
  })
  expect(order).toEqual(['deploying', 'deploy', 'live'])
  expect(deployPreview).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      cwd: '/artifact',
      wrangler: '/trusted/wrangler',
      io: ctx.io,
    }),
    {
      number: 123,
      buildFolder: '/artifact',
      sha,
      runner: {
        url: 'https://runner.preview.example/runner.tar.gz',
        sha256: 'b'.repeat(64),
      },
    },
  )
  expect(commentPreview).toHaveBeenLastCalledWith(
    { number: 123, sha, state: 'live', dataReset: true },
    environment,
    ctx.io,
  )
  expect(files.appendFile.mock.calls.map(([, body]) => body)).toEqual([
    'event_action=deploy\n',
    'setup=ready\n',
    'marketing_url=https://pr-123.preview.example\napp_url=https://pr-123-app.preview.example\ndata_reset=true\n',
  ])
  expect(deletePreview).not.toHaveBeenCalled()
})

it('skips an old close after a reopen even when its commit is still the head', async () => {
  const { ctx, environment } = event('open')
  await expect(
    runPreviewCommand(
      ['event', '--pr', '123', '--action', 'closed', '--sha', sha],
      environment,
      ctx.io,
    ),
  ).resolves.toEqual({
    kind: 'skip',
    warning: '::notice::Preview run for PR 123 is stale. No changes made.',
  })
  noChanges()
})

it('deletes a currently closed pull request before posting deleted', async () => {
  const { ctx, environment } = event('closed', 'b'.repeat(40))
  const order: string[] = []
  vi.mocked(deletePreview).mockImplementation(async () => {
    order.push('delete')
  })
  vi.mocked(commentPreview).mockImplementation(async ({ state }) => {
    order.push(state)
    return 'updated'
  })
  await expect(
    runPreviewCommand(
      [
        'event',
        '--pr',
        '123',
        '--action',
        'closed',
        '--sha',
        sha,
        '--wrangler',
        '/trusted/wrangler',
      ],
      environment,
      ctx.io,
    ),
  ).resolves.toEqual({ kind: 'complete', lines: ['Deleted preview 123.'] })
  expect(order).toEqual(['delete', 'deleted'])
  expect(deletePreview).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      cwd: '/runner-temp/event-delete',
      wrangler: '/trusted/wrangler',
      io: ctx.io,
    }),
    123,
  )
  expect(files.rm).toHaveBeenCalledExactlyOnceWith(
    '/runner-temp/event-delete',
    { recursive: true, force: true },
  )
  expect(deployPreview).not.toHaveBeenCalled()
})

it('fails a GitHub error before any resource change or comment', async () => {
  const { ctx, http, environment } = event('closed')
  http.mockResolvedValue(new Response('fake-sensitive-body', { status: 503 }))
  await expect(
    runPreviewCommand(['event', ...inputs], environment, ctx.io),
  ).rejects.toThrowError('GitHub request failed with HTTP 503.')
  noChanges()
  expect(files.appendFile).not.toHaveBeenCalled()
})

it('checks current intent before a build without cloud settings or resource inputs', async () => {
  const { ctx, environment } = event('open')
  await expect(
    runPreviewCommand(
      ['event', '--check', '--pr', '123', '--action', 'opened', '--sha', sha],
      {
        GITHUB_REPOSITORY: environment.GITHUB_REPOSITORY,
        GITHUB_TOKEN: environment.GITHUB_TOKEN,
        GITHUB_OUTPUT: '/runner-output',
      },
      ctx.io,
    ),
  ).resolves.toEqual({ kind: 'complete', lines: ['Preview event: deploy.'] })
  expect(files.appendFile).toHaveBeenCalledExactlyOnceWith(
    '/runner-output',
    'event_action=deploy\n',
    'utf8',
  )
  noChanges()
})
