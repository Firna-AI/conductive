import { expect, it } from 'vitest'
import { commentPreview } from './comment.ts'
import { fakeContext } from './operations.test-support.ts'

const environment = {
  PREVIEW_ZONE: 'preview.example',
  GITHUB_REPOSITORY: 'owner/repository',
  GITHUB_TOKEN: 'fake-github-token',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_RUN_ID: '99',
}

it('finds a marked bot comment across pages and updates its links, commit, run, and reset note', async () => {
  const { ctx, http } = fakeContext()
  http
    .mockResolvedValueOnce(
      Response.json(
        [
          {
            id: 1,
            user: { type: 'User' },
            body: '<!-- conductive-pr-preview -->',
          },
        ],
        {
          headers: {
            Link: '<https://api.github.com/repos/owner/repository/issues/123/comments?page=2>; rel="next"',
          },
        },
      ),
    )
    .mockResolvedValueOnce(
      Response.json([
        {
          id: 42,
          user: { type: 'Bot' },
          body: '<!-- conductive-pr-preview --> old',
        },
      ]),
    )
    .mockResolvedValueOnce(Response.json({ id: 42 }))
  await expect(
    commentPreview(
      { number: 123, sha: 'a'.repeat(40), state: 'live', dataReset: true },
      environment,
      ctx.io,
    ),
  ).resolves.toBe('updated')
  const requests = http.mock.calls.map(([request]) => request)
  expect(
    requests.map((request) => [request.method, new URL(request.url).pathname]),
  ).toEqual([
    ['GET', '/repos/owner/repository/issues/123/comments'],
    ['GET', '/repos/owner/repository/issues/123/comments'],
    ['PATCH', '/repos/owner/repository/issues/comments/42'],
  ])
  expect(new URL(requests[1].url).searchParams.get('page')).toBe('2')
  expect(await requests[2].json()).toEqual({
    body:
      '<!-- conductive-pr-preview -->\n**Preview: live**\n' +
      '[App](https://pr-123-app.preview.example) · [Marketing](https://pr-123.preview.example)\n' +
      'Commit [`aaaaaaa`](https://github.com/owner/repository/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)\n' +
      '[Workflow run](https://github.com/owner/repository/actions/runs/99)\nPreview data was reset.',
  })
})

it('creates the marked failed comment when no bot owns the marker, without cloud credentials', async () => {
  const { ctx, http } = fakeContext()
  http
    .mockResolvedValueOnce(
      Response.json([
        {
          id: 1,
          user: { type: 'User' },
          body: '<!-- conductive-pr-preview -->',
        },
      ]),
    )
    .mockResolvedValueOnce(Response.json({ id: 99 }, { status: 201 }))
  await expect(
    commentPreview(
      { number: 123, sha: 'a'.repeat(40), state: 'failed', dataReset: false },
      environment,
      ctx.io,
    ),
  ).resolves.toBe('created')
  const requests = http.mock.calls.map(([request]) => request)
  expect(requests.map((request) => request.method)).toEqual(['GET', 'POST'])
  expect(await requests[1].json()).toEqual({
    body:
      '<!-- conductive-pr-preview -->\n**Preview: failed**\n' +
      '[App](https://pr-123-app.preview.example) · [Marketing](https://pr-123.preview.example)\n' +
      'Commit [`aaaaaaa`](https://github.com/owner/repository/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)\n' +
      '[Workflow run](https://github.com/owner/repository/actions/runs/99)',
  })
  expect(requests[1].headers.get('Authorization')).toBe(
    'Bearer fake-github-token',
  )
})
