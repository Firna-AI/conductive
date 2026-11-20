import { expect, it } from 'vitest'

import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { TEST_TIME } from '../test-support/harness'
import { heldOperation } from '../test-support/held-operation'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { readImageSchedule } from './image-schedule'
import { runImageAlarm } from './image-timers'

const fixtureForTest = setupBackendTests()

it('deletes the build computer when the first schedule fails during allocation', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, boat, scheduled } = fixture
  const db = images.env.DB
  const firstSchedule = heldOperation()
  const allocation = heldOperation()
  const schedule = images.scheduler.schedule
  let first = true
  images.scheduler.schedule = async (...args) => {
    await schedule(...args)
    if (first) {
      first = false
      await firstSchedule.wait()
      throw new Error('schedule reply lost')
    }
  }
  boat.afterCreate = async () => {
    await allocation.wait()
  }
  const starting = expect(
    startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    }),
  ).rejects.toThrow('schedule reply lost')
  let allocating: Promise<void> | undefined
  try {
    await firstSchedule.entered
    const state = scheduled[0]
    const buildId = state?.buildId
    if (!state || !buildId) throw new Error('Missing scheduled build')
    allocating = runImageAlarm(images, state)
    await allocation.entered
    expect(await readBuildJob(db, org.id, buildId)).toMatchObject({
      state: 'running',
      phase: 'allocating',
      sandboxId: null,
    })

    await fixture.setTime(TEST_TIME + 1_000)
    firstSchedule.release()
    await starting
    const failed = await readBuild(db, org.id, buildId)
    expect(failed.build).toMatchObject({
      state: 'failed',
      completedAt: TEST_TIME + 1_000,
      durationMs: 1_000,
      error: 'The cloud computer build could not start. Try again.',
    })
    expect(failed.log).toEqual([
      {
        eventNumber: 1,
        occurredAt: TEST_TIME + 1_000,
        text: 'The cloud computer build could not start. Try again.',
      },
    ])
    expect(await readBuildJob(db, org.id, buildId)).toMatchObject({
      state: 'failed',
      phase: 'allocating',
      sandboxId: null,
    })

    await fixture.setTime(TEST_TIME + 2_000)
    allocation.release()
    await allocating
    expect(await readBuildJob(db, org.id, buildId)).toMatchObject({
      state: 'failed',
      phase: 'sources',
      sandboxId: 'bx_1',
    })
    const cleanup = scheduled.at(-1)
    if (!cleanup) throw new Error('Missing cleanup alarm')
    expect(
      await readImageSchedule(
        db,
        org.id,
        TEST_TIME + 2_000,
        cleanup,
        DEFAULT_PROVIDER_ACCOUNT,
      ),
    ).toMatchObject({ buildId })

    await fixture.setTime(cleanup.nextAt)
    await runImageAlarm(images, cleanup)
    expect(boat.deletedIds).toEqual(['bx_1'])
    expect(boat.states.size).toBe(0)
    expect(await readBuildJob(db, org.id, buildId)).toMatchObject({
      state: 'failed',
      phase: 'done',
      sandboxId: null,
    })
    expect(await readBuild(db, org.id, buildId)).toEqual(failed)
    expect(scheduled.at(-1)).toMatchObject({ buildId: null })
  } finally {
    firstSchedule.release()
    allocation.release()
    await Promise.allSettled([starting, allocating])
  }
})
