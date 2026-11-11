import { generateKeyPairSync } from 'node:crypto'

import type { WebSocket } from 'miniflare'
import { beforeAll, expect, it } from 'vitest'

import { createGitHubActions } from '../../src/github/githubActions'
import { workspaceEventsPath } from '../../src/shared/events'
import { githubPaths } from '../../src/shared/github'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { HEAD_SHA } from '../github/fake-pull'
import { RepositoryGitHub } from '../github/fake-repository'
import { saveGitHubTokens } from '../security/github-tokens'
import { featureFixture, featureState } from './fixture.test-support'

let bundle: string
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})

interface FakeGitHubState {
  api: RepositoryGitHub | undefined
  /** GitHub refuses each installation token, as at the App's rate limit. */
  tokensFail: boolean
}

type MergeFixture = Awaited<ReturnType<typeof featureFixture>>

function mergeFixture(github: FakeGitHubState): Promise<MergeFixture> {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return featureFixture(bundle, {
    configuration: {
      GITHUB_APP_PRIVATE_KEY: privateKey
        .export({ type: 'pkcs1', format: 'pem' })
        .toString(),
    },
    outbound: (request, fallback) => {
      const path = new URL(request.url).pathname
      if (path === '/app/installations/1/access_tokens')
        return Promise.resolve(
          github.tokensFail
            ? Response.json(
                { message: 'API rate limit exceeded' },
                { status: 403 },
              )
            : Response.json({ token: 'server-read-token' }),
        )
      return github.api && (path === '/graphql' || path.startsWith('/repos/'))
        ? github.api.fetch(request)
        : fallback(request)
    },
  })
}

async function seedMerge(fixture: MergeFixture, github: FakeGitHubState) {
  const api = new RepositoryGitHub(fixture.github)
  github.api = api
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
  return { api, actions }
}

it('routes member merges through the real Worker, retains poll jobs after eviction and socket wake, and publishes the merged head', async () => {
  const github: FakeGitHubState = { api: undefined, tokensFail: false }
  let socket: WebSocket | undefined
  const fixture = await mergeFixture(github)
  try {
    const { api, actions } = await seedMerge(fixture, github)
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
    socket = stream.webSocket ?? undefined
    if (!socket) throw new Error('Missing workspace socket.')
    const inbox = new SocketInbox(socket)
    socket.accept()
    expect(record(record(await inbox.next()).history).events).toEqual([])
    const woke = await fixture.hibernate()
    expect(woke.after.instance).not.toBe(woke.before.instance)
    expect(woke.before.sockets).toEqual([1])
    expect(woke.after.sockets).toEqual([1])
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
    await Promise.all([
      socket ? closeSockets(socket) : Promise.resolve(),
      fixture.dispose(),
    ])
  }
})

it('publishes a reported merge while GitHub reads fail, then the alarm reads again', async () => {
  const github: FakeGitHubState = { api: undefined, tokensFail: false }
  let socket: WebSocket | undefined
  let later: WebSocket | undefined
  const fixture = await mergeFixture(github)
  try {
    const { api, actions } = await seedMerge(fixture, github)
    const shown = await fixture.request(
      githubPaths.banner(OUTER_ORG, OUTER_WORKSPACE),
    )
    expect(await shown.json()).toMatchObject({
      banner: { state: 'ready-to-merge' },
    })
    const stream = await fixture.request(
      workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE),
      { headers: { Upgrade: 'websocket' } },
    )
    socket = stream.webSocket ?? undefined
    if (!socket) throw new Error('Missing workspace socket.')
    const inbox = new SocketInbox(socket)
    socket.accept()
    expect(record(record(await inbox.next()).history).events).toMatchObject([
      { event: { banner: { state: 'ready-to-merge' } } },
    ])
    api.pulls[2].state = 'MERGED'
    api.pulls[2].mergedAt = '2026-11-09T22:00:00Z'
    github.tokensFail = true
    await expect(
      actions.merge({ headSha: HEAD_SHA, method: 'squash' }),
    ).resolves.toEqual({ state: 'merged' })
    expect(await inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        event: {
          type: 'github.updated',
          banner: { state: 'merged', pullRequest: { headSha: HEAD_SHA } },
        },
      },
    })
    // The alarm reads again. Its first read fails while GitHub refuses.
    await fixture.actor().advanceStartAlarm()
    github.tokensFail = false
    const retryAt = featureState(
      await fixture.actor().inspectFeatureState(),
    ).get('alarm:github')
    expect(retryAt).toBe(DEVICE_TEST_NOW + 30_000)
    if (typeof retryAt !== 'number')
      throw new Error('Missing GitHub retry alarm.')
    await fixture.actor().advanceStartAlarm(retryAt)
    // A tab that opens now replays the read of the alarm from the stream.
    const reopened = await fixture.request(
      workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE),
      { headers: { Upgrade: 'websocket' } },
    )
    later = reopened.webSocket ?? undefined
    if (!later) throw new Error('Missing second workspace socket.')
    const replay = new SocketInbox(later)
    later.accept()
    expect(record(record(await replay.next()).history).events).toMatchObject([
      { event: { banner: { state: 'ready-to-merge' } } },
      { event: { banner: { state: 'merged', mergedAt: DEVICE_TEST_NOW } } },
      {
        event: {
          banner: {
            state: 'merged',
            mergedAt: Date.parse('2026-11-09T22:00:00Z'),
          },
        },
      },
    ])
  } finally {
    await Promise.all([
      closeSockets(...[socket, later].filter((open) => open !== undefined)),
      fixture.dispose(),
    ])
  }
})
