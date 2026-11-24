import { expect, it } from 'vitest'

import { MACHINE_TOKEN_PATTERN } from '../machines/authorization'
import { productionMembersHooks } from '../members/composition'
import { deleteOrg } from '../members/deletion'
import { restoreOrg } from '../members/restore'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { updateBuildJob } from './build-data'
import { imageRetryFixture } from './retry-test-support'

const fixtureForTest = setupBackendTests()

it('replays the original build create with the same machine token', async () => {
  const fixture = fixtureForTest()
  const { boat, images } = fixture
  const image = await imageRetryFixture(fixture, { steps: 0 })
  boat.lostCreateReplies = 1
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({
    phase: 'allocating',
    machineTokenCiphertext: expect.stringMatching(/^v1\./u),
    sandboxId: null,
  })
  const initial = boat.starts[0]
  expect(initial.env).toMatchObject({
    CONDUCTIVE_MACHINE_ORIGIN: images.env.MACHINE_ORIGIN,
    CONDUCTIVE_MACHINE_TOKEN: expect.stringMatching(
      new RegExp(`^${MACHINE_TOKEN_PATTERN}$`),
    ),
  })
  await image.restart()
  await image.tick(TEST_TIME + 1_000)
  expect(boat.starts).toEqual([initial, initial])
  expect(await image.job()).toMatchObject({
    phase: 'sources',
    sandboxId: 'bx_1',
    machineTokenCiphertext: null,
  })
})

it('replays a build allocation from the previous Worker without machine environment', async () => {
  const fixture = fixtureForTest()
  const { boat, images } = fixture
  const image = await imageRetryFixture(fixture, { steps: 0 })
  await updateBuildJob(images.env.DB, image.id, 'allocating')
  await image.tick(TEST_TIME)
  expect(boat.starts).toHaveLength(1)
  expect(boat.starts[0].env).not.toHaveProperty('CONDUCTIVE_MACHINE_ORIGIN')
  expect(boat.starts[0].env).not.toHaveProperty('CONDUCTIVE_MACHINE_TOKEN')
  expect(await image.job()).toMatchObject({
    phase: 'sources',
    sandboxId: 'bx_1',
  })
})

it('advances a recorded allocation without replaying its cleared token', async () => {
  const fixture = fixtureForTest()
  const image = await imageRetryFixture(fixture, { steps: 1 })
  await updateBuildJob(fixture.images.env.DB, image.id, 'allocating')

  await image.tick(TEST_TIME)

  expect(fixture.boat.starts).toHaveLength(1)
  expect(await image.job()).toMatchObject({
    phase: 'sources',
    sandboxId: 'bx_1',
    machineTokenCiphertext: null,
  })
})

it('clears the saved allocation token when Delete org ends a build before Restore', async () => {
  const fixture = fixtureForTest()
  const { boat, runtime, org, user } = fixture
  const image = await imageRetryFixture(fixture, { steps: 0 })
  boat.lostCreateReplies = 1
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({
    state: 'running',
    phase: 'allocating',
    machineTokenCiphertext: expect.stringMatching(/^v1\./u),
    sandboxId: null,
  })

  const { env, dependencies } = runtime
  const hooks = productionMembersHooks(env, dependencies)
  const deleted = await deleteOrg(
    env,
    org.id,
    user.id,
    org.name,
    dependencies,
    hooks,
  )
  expect(deleted.deletion).toMatchObject({ deletedAt: TEST_TIME })
  const ended = { state: 'failed', phase: 'done', machineTokenCiphertext: null }
  expect(await image.job()).toMatchObject(ended)

  const restored = await restoreOrg(env, org.id, user.id, dependencies, hooks)
  expect(restored.deletion).toBeUndefined()
  expect(await image.job()).toMatchObject(ended)
})
