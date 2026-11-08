import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { readBuildJob } from '../lifecycle/build-data'
import { advanceImageBuild, startImageBuild } from '../lifecycle/image-builds'
import { SOFTWARE } from '../lifecycle/backend-test-support'
import { suspendUser } from './suspend-user'

const backendFixture = setupBackendTests()

it('cancels an active image build and prevents a suspended user from starting another', async () => {
  const fixture = backendFixture()
  const input = {
    orgId: fixture.org.id,
    userId: fixture.user.id,
    kind: 'build' as const,
    software: SOFTWARE,
  }
  const buildId = await startImageBuild(fixture.images, input)
  await advanceImageBuild(fixture.images, fixture.org.id, buildId)
  expect(fixture.boat.starts).toHaveLength(1)
  const suspended = await suspendUser(
    fixture.runtime,
    fixture.user.githubId,
    fixture.user.id,
  )
  expect(suspended.pendingBuildIds).toEqual([buildId])
  expect(await advanceImageBuild(fixture.images, fixture.org.id, buildId)).toBe(
    true,
  )
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    await readBuildJob(fixture.runtime.env.DB, fixture.org.id, buildId),
  ).toMatchObject({
    state: 'failed',
    phase: 'done',
    sandboxId: null,
  })
  await expect(startImageBuild(fixture.images, input)).rejects.toMatchObject({
    status: 403,
    code: 'user_suspended',
  })
  expect(fixture.boat.starts).toHaveLength(1)
})

it('finishes a suspended queued image build without allocating a computer', async () => {
  const fixture = backendFixture()
  const buildId = await startImageBuild(fixture.images, {
    orgId: fixture.org.id,
    userId: fixture.user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await suspendUser(fixture.runtime, fixture.user.githubId, fixture.user.id)
  expect(await advanceImageBuild(fixture.images, fixture.org.id, buildId)).toBe(
    true,
  )
  expect(
    await readBuildJob(fixture.runtime.env.DB, fixture.org.id, buildId),
  ).toMatchObject({
    state: 'failed',
    phase: 'done',
    sandboxId: null,
  })
  expect(fixture.boat.starts).toEqual([])
})

it('recovers an uncertain image allocation after suspension and removes the computer', async () => {
  const fixture = backendFixture()
  fixture.boat.lostCreateReplies = 1
  const buildId = await startImageBuild(fixture.images, {
    orgId: fixture.org.id,
    userId: fixture.user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  expect(await advanceImageBuild(fixture.images, fixture.org.id, buildId)).toBe(
    false,
  )
  expect(fixture.boat.states.size).toBe(1)
  await suspendUser(fixture.runtime, fixture.user.githubId, fixture.user.id)
  const retryAt = (
    await readBuildJob(fixture.runtime.env.DB, fixture.org.id, buildId)
  ).providerRetry?.retryAt
  if (typeof retryAt !== 'number')
    throw new Error('Missing allocation retry deadline')
  fixture.setTime(retryAt)
  let complete = false
  for (let step = 0; step < 5 && !complete; step++)
    complete = await advanceImageBuild(fixture.images, fixture.org.id, buildId)
  expect(complete).toBe(true)
  expect(fixture.boat.states.size).toBe(0)
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(fixture.boat.starts).toHaveLength(2)
  expect(fixture.boat.starts[1]).toEqual(fixture.boat.starts[0])
})
