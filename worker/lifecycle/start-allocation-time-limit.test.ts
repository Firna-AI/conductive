import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { START_ALLOCATION_CLEANUP_KEY } from './start-allocation-cleanup'
import { readWorkspaceToken } from './tokens'
import { createWorkspace } from './workspaces'

const backendFixture = setupBackendTests()

it('ends endless allocation retries and preserves encrypted cleanup ownership across reconstruction', async () => {
  const fixture = await backendFixture()
  fixture.boat.lostCreateReplies = Infinity
  const created = await fixture.run(() =>
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const start = fixture.starts.get(id)
  const actor = fixture.actors.get(id)
  if (!start || !actor) throw new Error('Missing start actor')
  const token = await readWorkspaceToken(fixture.runtime.env, id)
  await start.advance()
  fixture.setTime(TEST_TIME + 1_199_999)
  await start.advance()
  const before = await start.job()
  start.restart()
  fixture.setTime(TEST_TIME + 1_200_000)
  await start.advance()

  expect(await start.job()).toBeUndefined()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(before).toMatchObject({ phase: 'machine' })
  expect(fixture.boat.deletedIds).toEqual([])
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(0)
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_tokens',
    ).first('count'),
  ).toBe(0)
  expect((await fixture.failedCreation(id))?.request).toEqual(FIRST_MESSAGE)
  expect(JSON.stringify([...(await actor.storage.list('job'))])).not.toContain(
    token,
  )

  start.restart()
  fixture.boat.lostCreateReplies = 0
  fixture.boat.deleteFailures = 1
  fixture.setTime(TEST_TIME + 1_205_000)
  await start.advance()
  const allocations = fixture.boat.starts.length
  expect(fixture.boat.deletedIds).toEqual([])
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT sandbox_id AS sandboxId FROM lifecycle_sandbox_cleanup WHERE workspace_id = ?',
    )
      .bind(id)
      .first('sandboxId'),
  ).toBe('bx_1')
  start.restart()
  fixture.setTime(TEST_TIME + 1_235_000)
  await start.advance()
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(fixture.boat.starts).toHaveLength(allocations)
  expect(fixture.boat.starts).toEqual(
    Array.from(
      { length: fixture.boat.starts.length },
      () => fixture.boat.starts[0],
    ),
  )
  expect(await actor.storage.list('job')).toEqual(new Map())
  expect(
    await fixture.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM lifecycle_sandbox_cleanup',
    ).first('count'),
  ).toBe(0)
})

it.each([
  {
    reason: 'failure',
    saved: {
      failure: {
        code: 'workspace_start_failed',
        message: 'The cloud computer could not start. Try again.',
        status: 502,
        timeLimit: false,
      },
    },
    code: 'workspace_start_failed',
    message: 'The cloud computer could not start. Try again.',
  },
  {
    reason: 'cancellation',
    saved: { cancelled: true },
    code: 'workspace_start_stopped',
    message: 'The cloud computer stopped.',
  },
] as const)(
  'ends allocation recovery by the original deadline after saved $reason and retains its cause and encrypted cleanup',
  async ({ reason, saved, code, message }) => {
    const fixture = await backendFixture()
    const route = boatRoute({ operation: 'create' })
    const fetch = fixture.runtime.dependencies.fetch
    const keys: (string | null)[] = []
    let unavailable = true
    fixture.runtime.dependencies.fetch = async (request) => {
      if (
        request.method !== route.method ||
        !new URL(request.url).pathname.endsWith(route.path)
      )
        return fetch(request)
      keys.push(request.headers.get('Idempotency-Key'))
      if (reason === 'failure' && keys.length === 1)
        return Response.json(
          { ok: false, code: 'unauthorized' },
          { status: 401 },
        )
      const response = await fetch(request)
      return unavailable
        ? Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
        : response
    }
    const created = await fixture.run(() =>
      createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const id = created.workspace.id
    const start = fixture.starts.get(id)
    const actor = fixture.actors.get(id)
    if (!start || !actor) throw new Error('Missing start actor')
    const token = await readWorkspaceToken(fixture.runtime.env, id)
    await start.advance()
    if (reason === 'cancellation') {
      await actor.endpoint().lifecycleStopped()
      await start.advance()
    }
    const earlier = await start.job()
    expect(earlier).toMatchObject({
      ...saved,
      phase: 'machine',
      deadlineAt: TEST_TIME + 1_200_000,
    })
    start.restart()
    fixture.setTime(TEST_TIME + 1_199_999)
    await start.advance()
    expect(await start.job()).toMatchObject({
      ...saved,
      phase: 'machine',
      deadlineAt: TEST_TIME + 1_200_000,
    })
    const beforeDeadlineAlarm = actor.storage.alarmAt
    const requests = keys.length
    start.restart()
    fixture.setTime(TEST_TIME + 1_200_000)
    await start.advance()

    expect(await start.job()).toBeUndefined()
    expect(beforeDeadlineAlarm).toBe(TEST_TIME + 1_200_000)
    expect(await start.wait()).toMatchObject({
      ok: false,
      error: { code, message },
    })
    expect(keys).toHaveLength(requests)
    expect(new Set(keys)).toEqual(new Set([earlier?.attempt]))
    expect(
      await actor.storage.get('job', START_ALLOCATION_CLEANUP_KEY),
    ).toMatchObject({
      ...saved,
      workspaceId: id,
      deadlineAt: TEST_TIME + 1_200_000,
    })
    expect(
      JSON.stringify([...(await actor.storage.list('job'))]),
    ).not.toContain(token)
    expect(
      await fixture.runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces',
      ).first('count'),
    ).toBe(0)
    expect(
      await fixture.runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspace_tokens',
      ).first('count'),
    ).toBe(0)
    expect((await fixture.failedCreation(id))?.error).toMatchObject({
      code,
      message,
    })

    unavailable = false
    start.restart()
    fixture.setTime(TEST_TIME + 1_230_000)
    await start.advance()
    expect(fixture.boat.deletedIds).toEqual(['bx_1'])
    expect(new Set(keys)).toEqual(new Set([earlier?.attempt]))
    expect(await actor.storage.list('job')).toEqual(new Map())
  },
)
