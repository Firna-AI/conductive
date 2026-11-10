import { expect, it } from 'vitest'

import { suspendUser } from '../operator/suspend-user'
import { suspendOrg } from '../operator/suspend-org'
import { boatRoute } from '../sandbox/routes'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { assignBuildSandbox } from './build-data'
import { computerRecords } from './computer-ledger.test-support'
import { imageRetryFixture } from './retry-test-support'

const fixtureForTest = setupBackendTests()

it('retries cleanup of every live computer of its build and leaves other builds and orgs alone', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, harness, session } = fixture
  const image = await imageRetryFixture(fixture, { steps: 1 })
  const outside = await harness.createOrg(session, 'Other org')
  await assignBuildSandbox(runtime.env.DB, image.id, 'current-computer', 'boat')
  for (const [id, orgId, buildId, deletedAt] of [
    ['other-build-computer', org.id, 'other-build', null],
    ['outside-computer', outside.id, image.id, null],
    ['deleted-build-computer', org.id, image.id, TEST_TIME],
    ['missing-build-computer', org.id, image.id, null],
  ] as const)
    await runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, org_id, purpose, purpose_id, deleted_at)
       VALUES (?, ?, 'build', ?, ?)`,
    )
      .bind(id, orgId, buildId, deletedAt)
      .run()
  for (const id of [
    'current-computer',
    'other-build-computer',
    'outside-computer',
  ])
    boat.states.set(id, 'ready')
  const fetch = runtime.dependencies.fetch
  const attempts: string[] = []
  const routes = ['bx_1', 'current-computer', 'missing-build-computer'].map(
    (id) => ({ id, ...boatRoute({ operation: 'delete', sandboxId: id }) }),
  )
  let refuseOlder = true
  runtime.dependencies.fetch = async (request) => {
    const route = routes.find(
      (route) =>
        request.method === route.method &&
        new URL(request.url).pathname.endsWith(route.path),
    )
    if (route) attempts.push(route.id)
    if (route?.id === 'bx_1' && refuseOlder)
      return Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
    if (route?.id === 'missing-build-computer')
      return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
    return fetch(request)
  }
  expect(await suspendUser(runtime, user.githubId, user.id)).toMatchObject({
    pendingBuildIds: [image.id],
  })
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'cleanup' })
  expect(boat.deletedIds).toEqual(['current-computer'])
  expect([...attempts].sort()).toEqual([
    'bx_1',
    'current-computer',
    'missing-build-computer',
  ])
  expect(
    (await computerRecords(runtime.env.DB))
      .filter((row) => row.orgId === org.id && row.purposeId === image.id)
      .map((row) => ({ id: row.sandboxId, deleted: row.deletedAt !== null })),
  ).toEqual([
    { id: 'bx_1', deleted: false },
    { id: 'current-computer', deleted: true },
    { id: 'deleted-build-computer', deleted: true },
    { id: 'missing-build-computer', deleted: true },
  ])
  const earlierAttempts = attempts.length
  await image.restart()
  refuseOlder = false
  await image.tick(TEST_TIME + 30_000)
  expect(await image.job()).toMatchObject({
    state: 'failed',
    phase: 'done',
    sandboxId: null,
  })
  expect([...boat.deletedIds].sort()).toEqual(['bx_1', 'current-computer'])
  expect(attempts.slice(earlierAttempts)).toEqual(['bx_1'])
  expect(
    (await computerRecords(runtime.env.DB))
      .filter((row) => row.orgId === org.id && row.purposeId === image.id)
      .map((row) => ({ id: row.sandboxId, deleted: row.deletedAt !== null })),
  ).toEqual([
    { id: 'bx_1', deleted: true },
    { id: 'current-computer', deleted: true },
    { id: 'deleted-build-computer', deleted: true },
    { id: 'missing-build-computer', deleted: true },
  ])
  expect(boat.states.get('other-build-computer')).toBe('ready')
  expect(boat.states.get('outside-computer')).toBe('ready')
  expect(boat.resumeIds).toEqual([])
})

it('keeps build cleanup scheduled when suspension blocks provider setup after its current pointer is cleared', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat } = fixture
  const image = await imageRetryFixture(fixture, { steps: 1 })
  await runtime.env.DB.prepare(
    'UPDATE image_builds SET sandbox_id = NULL WHERE id = ?',
  )
    .bind(image.id)
    .run()
  expect(await suspendOrg(runtime, org.id, user.id)).toMatchObject({
    pendingBuildIds: [image.id],
  })
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({
    state: 'failed',
    phase: 'cleanup',
    sandboxId: null,
  })
  expect(await image.storage.getAlarm()).not.toBeNull()
  await image.restart()
  await image.tick(TEST_TIME + 1_000)
  expect(await image.job()).toMatchObject({
    state: 'failed',
    phase: 'done',
    sandboxId: null,
  })
  expect(boat.deletedIds).toEqual(['bx_1'])
})
