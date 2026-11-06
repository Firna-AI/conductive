import { expect, it } from 'vitest'

import { StreamedBody } from './streamed-body'
import { githubJson, githubRequest } from './transport'

it('cancels oversized GitHub JSON responses with a safe upstream error', async () => {
  const body = new StreamedBody(28 * 1024 * 1024)
  const result = githubJson(
    async () =>
      new Response(body.stream, { headers: { 'Content-Length': '1' } }),
    githubRequest('/graphql', 'server-read-token'),
  ).then(() => 'accepted')
  await expect(result).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
    message: 'GitHub is not available. Try again.',
  })
  expect(body.readBytes).toBe(27_328_512)
  expect(body.cancelled).toBe(true)
})
