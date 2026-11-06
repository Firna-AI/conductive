import { expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { saveGitHubTokens } from '../security/github-tokens'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { handleGitCredential } from './machine'
import { readWorkspaceToken } from './tokens'
import { createWorkspace } from './workspaces'

const backendFixture = setupBackendTests()

it('returns the trusted sender token without reading a large request body', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user } = fixture
    const created = await fixture.run(() =>
      createWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing production controller')
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await saveGitHubTokens(
      runtime.env,
      user.id,
      {
        accessToken: 'trusted-sender-token',
        expiresAt: null,
        refreshToken: null,
        refreshExpiresAt: null,
      },
      TEST_TIME,
    )
    const token = await readWorkspaceToken(runtime.env, created.workspace.id)
    const request = new Request(
      `${runtime.env.MACHINE_ORIGIN}${MACHINE_PATHS.gitCredential}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          [TOOL_TURN_HEADER]: created.first.turnId,
        },
        body: 'x'.repeat(2 * 1024 * 1024),
      },
    )
    const result = await handleGitCredential(request, runtime).then(
      async (response) => ({
        status: response.status,
        body: await response.json(),
      }),
      (error: unknown) => error,
    )
    expect(result).toEqual({
      status: 200,
      body: { token: 'trusted-sender-token' },
    })
    expect(request.bodyUsed).toBe(false)
  } finally {
    await fixture.dispose()
  }
})

it('gets the trusted turn sender token afresh for concurrent sessions and rejects arbitrary identities', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user } = fixture
    await runtime.env.DB.batch([
      runtime.env.DB.prepare(
        'INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES (?, 18, ?, ?, ?)',
      ).bind('second-user', 'teammate', TEST_TIME, TEST_TIME),
      runtime.env.DB.prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
      ).bind(org.id, 'second-user', TEST_TIME),
    ])
    const sender = {
      ...user,
      id: 'second-user',
      githubId: 18,
      githubLogin: 'teammate',
    }
    const created = await fixture.run(() =>
      createWorkspace(
        runtime,
        org.id,
        user,
        { repositoryId: fixture.repositoryId, firstMessage: FIRST_MESSAGE },
        sender,
      ),
    )
    expect(created.workspace.owner.id).toBe(user.id)
    expect(created.first.sender.id).toBe('second-user')
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing production controller')
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.registerLifecycleTurn({
      turnId: 'second-turn',
      sessionId: 'second-session',
      senderUserId: user.id,
    })
    const save = (id: string, accessToken: string) =>
      saveGitHubTokens(
        runtime.env,
        id,
        {
          accessToken,
          expiresAt: null,
          refreshToken: null,
          refreshExpiresAt: null,
        },
        TEST_TIME,
      )
    await save('second-user', 'sender-token-one')
    await save(user.id, 'sender-token-two')
    const token = await readWorkspaceToken(runtime.env, created.workspace.id)
    const request = (turnId: string, extra: Record<string, string> = {}) =>
      new Request(
        `${runtime.env.MACHINE_ORIGIN}${MACHINE_PATHS.gitCredential}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            [TOOL_TURN_HEADER]: turnId,
          },
          body: JSON.stringify(extra),
        },
      )
    const [first, second] = await Promise.all([
      handleGitCredential(request(created.first.turnId), runtime),
      handleGitCredential(request('second-turn'), runtime),
    ])
    expect(await first.json()).toEqual({ token: 'sender-token-one' })
    expect(await second.json()).toEqual({ token: 'sender-token-two' })
    expect(second.headers.get('Cache-Control')).toBe('no-store')
    await save(user.id, 'new-sender-token')
    expect(
      await (await handleGitCredential(request('second-turn'), runtime)).json(),
    ).toEqual({ token: 'new-sender-token' })
    await actor.registerLifecycleTurn({
      turnId: 'replacement-turn',
      sessionId: 'second-session',
      senderUserId: user.id,
    })
    await expect(
      handleGitCredential(request('second-turn'), runtime),
    ).rejects.toMatchObject({ status: 409, code: 'current_turn_required' })
    expect(
      await (
        await handleGitCredential(request(created.first.turnId), runtime)
      ).json(),
    ).toEqual({ token: 'sender-token-one' })
    await expect(
      handleGitCredential(
        request('unknown-turn', { userId: user.id }),
        runtime,
      ),
    ).rejects.toMatchObject({ status: 409, code: 'current_turn_required' })
    await actor.finishLifecycleTurn('replacement-turn')
    await expect(
      handleGitCredential(request('replacement-turn'), runtime),
    ).rejects.toMatchObject({ status: 409, code: 'current_turn_required' })
  } finally {
    await fixture.dispose()
  }
})
