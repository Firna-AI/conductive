import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { encrypt } from '../security/crypto'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild } from './build-data'
import { imageRetryFixture, statusFault } from './retry-test-support'
import { readImageSettings } from './settings-data'
import {
  insertSourceJob,
  readSourceJob,
  setSourcePhase,
  sourceTokenContext,
  storeSourceGrant,
} from './image-sources/source-data'

const backendFixture = setupBackendTests()
const FAILURE =
  'The cloud computer image did not build within the 60-minute limit. Check the log and try again.'

it('ends an install that never exits at the original build deadline after phase changes and reconstruction', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture)
  await image.tick(TEST_TIME + 3_000_000)
  await image.tick(TEST_TIME + 3_001_000)
  fixture.boat.commandRunning = true
  await image.restart()
  await image.tick(TEST_TIME + 3_599_999)
  const before = await image.job()
  const alarm = await image.storage.getAlarm()
  await image.tick(TEST_TIME + 3_600_000)

  expect(await image.job()).toMatchObject({
    state: 'failed',
    phase: 'done',
    sandboxId: null,
  })
  expect(before).toMatchObject({ state: 'running', phase: 'install' })
  expect(alarm).toBe(TEST_TIME + 3_600_000)
  expect(
    (await readBuild(fixture.runtime.env.DB, fixture.org.id, image.id)).build,
  ).toMatchObject({ error: FAILURE, completedAt: TEST_TIME + 3_600_000 })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    await readImageSettings(fixture.runtime.env.DB, fixture.org.id),
  ).toMatchObject({ imageName: 'last-good-image' })
})

it('ends a refresh whose computer never becomes ready after reconstruction', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture, { kind: 'refresh', steps: 1 })
  fixture.boat.states.set('bx_1', 'provisioning')
  await image.tick(TEST_TIME + 3_599_999)
  const before = await image.job()
  await image.restart()
  await image.tick(TEST_TIME + 3_600_000)

  expect(await image.job()).toMatchObject({
    kind: 'refresh',
    state: 'failed',
    phase: 'done',
  })
  expect(before).toMatchObject({ state: 'running', phase: 'sources' })
  expect(
    (await readBuild(fixture.runtime.env.DB, fixture.org.id, image.id)).build,
  ).toMatchObject({ error: FAILURE })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    await readImageSettings(fixture.runtime.env.DB, fixture.org.id),
  ).toMatchObject({ imageName: 'last-good-image' })
})

it('schedules and enforces the build deadline before a later provider retry', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture)
  const fault = statusFault(fixture)
  fault.fail('60')
  await image.tick(TEST_TIME + 3_599_000)
  const alarm = await image.storage.getAlarm()
  const polls = fixture.boat.statusRequests.length
  await image.restart()
  await image.tick(TEST_TIME + 3_600_000)

  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'done' })
  expect(alarm).toBe(TEST_TIME + 3_600_000)
  expect(fixture.boat.statusRequests).toHaveLength(polls)
  expect(
    (await readBuild(fixture.runtime.env.DB, fixture.org.id, image.id)).build,
  ).toMatchObject({ error: FAILURE })
})

it('fails a build when its final provider read returns at the deadline before publication', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture)
  for (let step = 0; step < 8; step++) {
    if ((await image.job()).phase === 'publish') break
    await image.tick(TEST_TIME + 3_000_000 + step * 1_000)
  }
  const publishing = await image.job()
  expect(publishing).toMatchObject({ phase: 'publish' })
  fixture.boat.beforeSandboxRead = async () => {
    await fixture.setTime(TEST_TIME + 3_600_000)
  }
  await image.tick(TEST_TIME + 3_599_999)

  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'done' })
  expect(
    (await readBuild(fixture.runtime.env.DB, fixture.org.id, image.id)).build,
  ).toMatchObject({ error: FAILURE })
  expect(
    await readImageSettings(fixture.runtime.env.DB, fixture.org.id),
  ).toMatchObject({ imageName: 'last-good-image' })
  expect(fixture.boat.deletedSnapshots).toEqual([publishing.snapshotName])
})

it('publishes the build limit while retaining source cleanup until its encrypted token is revoked', async () => {
  const fixture = await backendFixture()
  const image = await imageRetryFixture(fixture, { steps: 1 })
  const { env, dependencies } = fixture.runtime
  const source = await insertSourceJob(env.DB, fixture.org.id, image.id, 'bx_1')
  await setSourcePhase(env.DB, image.id, 'ready')
  await storeSourceGrant(
    env.DB,
    source,
    fixture.repositoryId,
    'pending-source-grant',
    await encrypt(
      'ghs_time_limit_source_token',
      sourceTokenContext({ ...source, repositoryId: fixture.repositoryId }),
      env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  let revocations = 0
  const fetch = dependencies.fetch
  dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname !== 'api.github.com')
      return fetch(request)
    revocations++
    return new Response(null, { status: revocations === 1 ? 503 : 204 })
  }
  await image.tick(TEST_TIME + 3_600_000)

  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'cleanup' })
  expect((await readBuild(env.DB, fixture.org.id, image.id)).build.error).toBe(
    FAILURE,
  )
  expect(await readSourceJob(env.DB, image.id)).toMatchObject({
    grantHash: null,
    tokenCiphertext: expect.stringMatching(/^v1\./u),
  })
  expect(fixture.boat.deletedIds).toEqual([])
  await image.restart()
  await image.tick(TEST_TIME + 3_601_000)
  expect(await image.job()).toMatchObject({ state: 'failed', phase: 'done' })
  expect(await readSourceJob(env.DB, image.id)).toBeNull()
  expect(revocations).toBe(2)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(fixture.boat.commands).toEqual([])
})
