import { expect, it } from 'vitest'

import {
  buildMachineOwner,
  issueMachineToken,
  machineClient,
} from '../machines/client'
import { revokeComputerMachineToken } from '../machines/revoke'
import { boatRoute } from '../sandbox/routes'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { failBuild, updateBuildJob } from './build-data'
import { advanceImageBuild } from './image-builds'
import { pendingImageCleanup } from './image-maintenance-data'
import { imageRetryFixture } from './retry-test-support'

const fixtureForTest = setupBackendTests()

async function failedBuild(fixture: ReturnType<typeof fixtureForTest>) {
  const image = await imageRetryFixture(fixture, { steps: 1 })
  const { DB } = fixture.images.env
  await failBuild(DB, image.id, 'Build failed', TEST_TIME)
  await updateBuildJob(DB, image.id, 'cleanup')
  return image
}

it('revokes the build machine before deleting its computer', async () => {
  const fixture = fixtureForTest()
  const { images, org, boat, host } = fixture
  const image = await failedBuild(fixture)
  const client = machineClient(images.env, buildMachineOwner(org.id, image.id))
  expect(await client.connection()).toMatchObject({ connected: true })
  const deletion = boatRoute({ operation: 'delete', sandboxId: 'bx_1' })
  const fetch = images.dependencies.fetch
  const connectedAtDelete: boolean[] = []
  images.dependencies.fetch = async (request) => {
    if (
      request.method === deletion.method &&
      new URL(request.url).pathname.endsWith(deletion.path)
    )
      connectedAtDelete.push((await client.connection()).connected)
    return fetch(request)
  }
  expect(await advanceImageBuild(images, org.id, image.id)).toBe(true)
  expect(connectedAtDelete).toEqual([false])
  expect(boat.deletedIds).toEqual(['bx_1'])
  await host.disconnect('bx_1')
  await expect(host.connect('bx_1')).rejects.toThrow(
    'Host upgrade returned 401',
  )
})

it('keeps cleanup scheduled after failed revocation and still deletes the computer', async () => {
  const fixture = fixtureForTest()
  const { images, org, boat } = fixture
  const image = await failedBuild(fixture)
  const machines = images.env.MACHINES
  if (!machines) throw new Error('Missing test machine binding')
  const unavailable = new Proxy(machines, {
    get(target, key) {
      if (key === 'get') throw new Error('Machine revocation unavailable')
      return Reflect.get(target, key, target)
    },
  })
  await expect(
    advanceImageBuild(
      { ...images, env: { ...images.env, MACHINES: unavailable } },
      org.id,
      image.id,
    ),
  ).rejects.toThrow('Machine revocation unavailable')
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(await pendingImageCleanup(images.env.DB, org.id)).toBe(image.id)
  expect(await image.job()).toMatchObject({ phase: 'cleanup' })
  await image.restart()
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({ phase: 'done' })
  expect(boat.deletedIds).toEqual(['bx_1'])
})

it('finds and revokes a build machine through the computer ledger', async () => {
  const fixture = fixtureForTest()
  const { images, org, host } = fixture
  const image = await imageRetryFixture(fixture, { steps: 1 })
  const client = machineClient(images.env, buildMachineOwner(org.id, image.id))
  expect(await client.connection()).toMatchObject({ connected: true })
  await revokeComputerMachineToken(
    images.env,
    org.id,
    { providerAccount: 'boat', sandboxId: 'bx_1' },
    'retry',
  )
  expect(await client.connection()).toMatchObject({ connected: false })
  await host.disconnect('bx_1')
  await expect(host.connect('bx_1')).rejects.toThrow(
    'Host upgrade returned 401',
  )
})

it('revokes the build token when a failed job can end without a provider', async () => {
  const fixture = fixtureForTest()
  const { images, org, host, boat } = fixture
  const image = await imageRetryFixture(fixture, { steps: 0 })
  await images.env.DB.prepare(
    'UPDATE image_builds SET provider_account = ? WHERE id = ?',
  )
    .bind('missing-account', image.id)
    .run()
  const owner = buildMachineOwner(org.id, image.id)
  await host.computerStarted('build-token', {
    CONDUCTIVE_MACHINE_TOKEN: await issueMachineToken(images.env, owner),
  })

  expect(await advanceImageBuild(images, org.id, image.id)).toBe(true)

  expect(await image.job()).toMatchObject({ phase: 'done', state: 'failed' })
  expect(boat.deletedIds).toEqual([])
  await host.disconnect('build-token')
  await expect(host.connect('build-token')).rejects.toThrow(
    'Host upgrade returned 401',
  )
})
