import { expect, it } from 'vitest'

import { privateKey } from '../lifecycle/image-sources/github-app.test-support'
import { readGitHubRepository } from './repository-read'

const NOW = () => 1_800_000_000_000

function fakeGitHub(repository: unknown) {
  const calls: { method: string; path: string; body: unknown }[] = []
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const path = new URL(request.url).pathname
    const text = await request.text()
    calls.push({
      method: request.method,
      path,
      body: text ? JSON.parse(text) : null,
    })
    if (path.endsWith('/access_tokens'))
      return Response.json({ token: 'metadata-token' }, { status: 201 })
    if (path === '/installation/token')
      return new Response(null, { status: 204 })
    return Response.json(repository)
  }
  return { fetch, calls }
}

const identity = { clientId: 'client-id', privateKey }
const target = { repositoryId: 186853002, installationId: 1 }

it('reads the current name and default branch with a revoked metadata token', async () => {
  const github = fakeGitHub({
    full_name: 'Codertocat/Greetings',
    default_branch: 'trunk',
  })
  expect(
    await readGitHubRepository(
      { fetch: github.fetch, now: NOW },
      identity,
      target,
    ),
  ).toEqual({ fullName: 'Codertocat/Greetings', defaultBranch: 'trunk' })
  expect(github.calls).toEqual([
    {
      method: 'POST',
      path: '/app/installations/1/access_tokens',
      body: {
        repository_ids: [186853002],
        permissions: { metadata: 'read' },
      },
    },
    { method: 'GET', path: '/repositories/186853002', body: null },
    { method: 'DELETE', path: '/installation/token', body: null },
  ])
})

it('refuses repository values that GitHub never sends, and still revokes', async () => {
  for (const repository of [
    { full_name: 'Greetings', default_branch: 'main' },
    { full_name: 'Codertocat/Greetings', default_branch: 'two words' },
    { full_name: 'Codertocat/Greetings' },
  ]) {
    const github = fakeGitHub(repository)
    await expect(
      readGitHubRepository({ fetch: github.fetch, now: NOW }, identity, target),
      JSON.stringify(repository),
    ).rejects.toThrow('Repository metadata is not available')
    expect(github.calls.at(-1)?.method).toBe('DELETE')
  }
})
