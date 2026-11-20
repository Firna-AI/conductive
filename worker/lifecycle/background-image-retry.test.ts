import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  assertRetryDay,
  nativeRetryProbe,
  refuseAction,
  retryActor,
} from './background-retry.test-support'
import { failBuild, readBuildJob, updateBuildJob } from './build-data'
import { imageRetryFixture } from './retry-test-support'
import type { ImageCoordinatorState } from './image-timers'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('starts a new explicit image job at once and preserves same-job rescheduling', async () => {
  const fixture = fixtureForTest()
  const image = await imageRetryFixture(fixture, { steps: 2 })
  const job = await image.job()
  if (!job.sandboxId) throw new Error('Missing cleanup computer')
  await failBuild(
    fixture.runtime.env.DB,
    image.id,
    'The build failed.',
    fixture.runtime.dependencies.now(),
  )
  await updateBuildJob(fixture.runtime.env.DB, image.id, 'cleanup')
  const id = `org-image:${fixture.org.id}`
  const actor = retryActor(fixture, id)
  const fault = refuseAction(fixture, 'delete', job.sandboxId)
  fault.fail('3600')
  const probe = nativeRetryProbe(
    fixture,
    actor,
    id,
    'lifecycle:image',
    fault.calls,
  )
  await probe.run()
  const now = probe.now()
  await actor.endpoint().scheduleImage({
    orgId: fixture.org.id,
    software: SOFTWARE,
    buildId: image.id,
    providerAccount: 'boat',
    nextAt: now,
  })
  await probe.run()
  expect(fault.calls()).toBe(1)
  expect(await probe.alarm()).toBe(now + 3_600_000)
  const starts = fixture.boat.starts.length
  const added = await startImageBuild(fixture.images, {
    orgId: fixture.org.id,
    userId: fixture.user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await actor.endpoint().scheduleImage({
    orgId: fixture.org.id,
    software: SOFTWARE,
    buildId: added,
    providerAccount: 'boat',
    nextAt: now,
  })
  await probe.run()
  expect(fixture.boat.starts).toHaveLength(starts + 1)
  expect(
    await readBuildJob(fixture.runtime.env.DB, fixture.org.id, added),
  ).toMatchObject({
    state: 'running',
    phase: 'sources',
  })
  expect(fault.calls()).toBe(1)
})

it('honors image cleanup Retry-After before its first failure reaches the hour cap', async () => {
  const fixture = fixtureForTest()
  const image = await imageRetryFixture(fixture, { steps: 2 })
  const job = await image.job()
  if (!job.sandboxId) throw new Error('Missing cleanup computer')
  await failBuild(
    fixture.runtime.env.DB,
    image.id,
    'The build failed.',
    fixture.runtime.dependencies.now(),
  )
  await updateBuildJob(fixture.runtime.env.DB, image.id, 'cleanup')
  const id = `org-image:${fixture.org.id}`
  const actor = retryActor(fixture, id)
  const fault = refuseAction(fixture, 'delete', job.sandboxId)
  const probe = nativeRetryProbe(
    fixture,
    actor,
    id,
    'lifecycle:image',
    fault.calls,
  )
  const now = probe.now()
  fault.fail('120')
  await probe.run()
  expect(await probe.alarm()).toBe(now + 120_000)
  await probe.setTime(now + 120_000)
  fault.fail('7200')
  await probe.run()
  expect(await probe.alarm()).toBe(now + 3_720_000)
  await probe.setTime(now + 3_720_000)
  fault.fail()
  await probe.run()
  expect(await probe.alarm()).toBe(now + 3_840_000)
  expect(fault.calls()).toBe(3)
})

it('backs off image cleanup through a day and keeps its wait across rescheduling and native recovery', async () => {
  const fixture = fixtureForTest()
  const image = await imageRetryFixture(fixture, { steps: 2 })
  const job = await image.job()
  if (!job.sandboxId) throw new Error('Missing cleanup computer')
  await failBuild(
    fixture.runtime.env.DB,
    image.id,
    'The build failed.',
    fixture.runtime.dependencies.now(),
  )
  await updateBuildJob(fixture.runtime.env.DB, image.id, 'cleanup')
  const id = `org-image:${fixture.org.id}`
  const actor = retryActor(fixture, id)
  const fault = refuseAction(fixture, 'delete', job.sandboxId)
  const probe = nativeRetryProbe(
    fixture,
    actor,
    id,
    'lifecycle:image',
    fault.calls,
  )
  await assertRetryDay(probe)
  expect(fault.reads()).toBe(0)
  const before = probe.now()
  const savedAt = await probe.alarm()
  await image.requeue(before)
  await probe.run()
  expect(fault.calls()).toBe(30)
  expect(await probe.alarm()).toBe(savedAt)

  await probe.setTime(before + 210_000)
  fault.fail('7200')
  await probe.run()
  expect(await probe.alarm()).toBe(before + 3_810_000)
  await probe.setTime(before + 3_810_000)
  fault.succeed()
  await probe.run()
  expect(fault.calls()).toBe(32)
  expect(
    await readBuildJob(fixture.runtime.env.DB, fixture.org.id, image.id),
  ).toMatchObject({ state: 'failed', phase: 'done', sandboxId: null })
  expect(
    (await actor.storage.get<ImageCoordinatorState>('org-image:coordinator'))
      ?.retry,
  ).toBeUndefined()
})
