import { generateKeyPairSync } from 'node:crypto'

import { beforeAll, expect, it } from 'vitest'

import { createGitHubActions } from '../../src/github/githubActions'
import { workspaceEventsPath } from '../../src/shared/events'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { HEAD_SHA } from '../github/fake-pull'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import { featureFixture } from './fixture.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

it('routes member merges through the real Worker, retains poll jobs after eviction, and publishes the merged head', async () => {
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
        accessToken: 'member-merge-token',
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
      {
        orgId: OUTER_ORG,
        workspaceId: OUTER_WORKSPACE,
      },
    )
    await expect(actions.capabilities()).resolves.toEqual({
      canWrite: true,
      mergeMethod: 'squash',
    })
    const started = await actions.merge({ headSha: HEAD_SHA, method: 'squash' })
    expect(started).toMatchObject({ state: 'pending' })
    if (started.state !== 'pending')
      throw new Error('Expected a pending merge.')
    await fixture.runtime.unsafeEvictDurableObject(
      'outer-chat-tests',
      'Workspace',
      { name: OUTER_WORKSPACE },
    )
    expect(await actions.mergeResult(started.mergeId)).toEqual(started)
    const stream = await fixture.request(
      workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE),
      { headers: { Upgrade: 'websocket' } },
    )
    expect(stream.status).toBe(101)
    const socket = stream.webSocket
    if (!socket) throw new Error('Missing workspace socket.')
    const inbox = new SocketInbox(socket)
    socket.accept()
    try {
      expect(record(record(await inbox.next()).history).events).toEqual([])
      const job = api.merges.jobs.values().next().value
      if (!job) throw new Error('Missing fake merge job.')
      job.state = 'merged'
      expect(await actions.mergeResult(started.mergeId)).toEqual({
        state: 'merged',
      })
      expect(await inbox.next()).toMatchObject({
        type: 'event',
        envelope: {
          event: {
            type: 'github.updated',
            banner: { state: 'merged', pullRequest: { headSha: HEAD_SHA } },
          },
        },
      })
      expect(
        api.requests
          .filter((request) =>
            new URL(request.url).pathname.includes('merge-async'),
          )
          .map((request) => request.headers.get('Authorization')),
      ).toEqual([
        'Bearer member-merge-token',
        'Bearer member-merge-token',
        'Bearer member-merge-token',
      ])
      expect(
        api.requests
          .filter((request) =>
            new URL(request.url).pathname.includes('merge-async'),
          )
          .map((request) => request.method),
      ).toEqual(['PUT', 'GET', 'GET'])
    } finally {
      await closeSockets(socket)
    }
  } finally {
    await fixture.dispose()
  }
})
