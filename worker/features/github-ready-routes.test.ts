import { generateKeyPairSync } from 'node:crypto'

import { beforeAll, expect, it } from 'vitest'

import { createGitHubActions } from '../../src/github/githubActions'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import { featureFixture } from './fixture.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

it('routes Ready for review through the real Worker with the member token', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  let api: RepositoryGitHub | undefined
  const fixture = await featureFixture(bundle, {
    configuration: {
      GITHUB_APP_PRIVATE_KEY: privateKey
        .export({ type: 'pkcs1', format: 'pem' })
        .toString(),
    },
    outbound: (request, fallback) => {
      const path = new URL(request.url).pathname
      if (path === '/app/installations/1/access_tokens')
        return Promise.resolve(Response.json({ token: 'server-read-token' }))
      return api && (path === '/graphql' || path.startsWith('/repos/'))
        ? api.fetch(request)
        : fallback(request)
    },
  })
  try {
    api = new RepositoryGitHub(fixture.github)
    api.pulls[2].isDraft = true
    await fixture.env.DB.batch([
      fixture.env.DB.prepare(
        "INSERT INTO github_installations (id, account_login, account_type, created_at) VALUES (1, 'Codertocat', 'User', 1)",
      ),
      fixture.env.DB.prepare(
        "UPDATE repositories SET github_repository_id = 186853002, full_name = 'Codertocat/Hello-World', installation_id = 1 WHERE id = 'chat-repository'",
      ),
      fixture.env.DB.prepare(
        "UPDATE workspaces SET branch = 'changes' WHERE id = ?",
      ).bind(OUTER_WORKSPACE),
    ])
    await saveGitHubTokens(
      fixture.env,
      'owner',
      {
        accessToken: 'member-ready-token',
        expiresAt: null,
        refreshToken: null,
        refreshExpiresAt: null,
      },
      Date.now(),
    )
    const actions = createGitHubActions(
      async (path, init) => {
        if (init?.body != null && typeof init.body !== 'string')
          throw new Error('Expected a JSON request body.')
        const response = await fixture.request(path, {
          method: init?.method,
          headers: init?.headers,
          body: init?.body ?? undefined,
        })
        return new Response(await response.arrayBuffer(), {
          status: response.status,
          headers: [...response.headers.entries()],
        })
      },
      { orgId: OUTER_ORG, workspaceId: OUTER_WORKSPACE },
    )
    await expect(actions.ready({ pullNumber: 2 })).resolves.toEqual({
      state: 'ready',
    })
    expect(api.pulls[2].isDraft).toBe(false)
    const writes: (string | null)[] = []
    for (const request of api.requests) {
      if ((await request.clone().text()).includes('mutation MarkReady'))
        writes.push(request.headers.get('Authorization'))
    }
    expect(writes).toEqual(['Bearer member-ready-token'])
  } finally {
    await fixture.dispose()
  }
})
