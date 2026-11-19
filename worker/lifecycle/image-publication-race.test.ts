import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { heldOperation } from '../test-support/held-operation'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { runImageAlarm } from './image-timers'
import { readOrgImage } from './org-image-data'

const fixtureForTest = setupBackendTests()

it('keeps the failure and previous image when the first schedule fails during publication', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, boat, scheduled } = fixture
  const db = images.env.DB
  const firstSchedule = heldOperation()
  const publication = heldOperation()
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
  const starting = expect(
    startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    }),
  ).rejects.toThrow('schedule reply lost')
  let publishing: Promise<void> | undefined
  try {
    await firstSchedule.entered
    const buildId = scheduled[0]?.buildId
    if (!buildId) throw new Error('Missing scheduled build')
    for (const phase of [
      'sources',
      'software',
      'software',
      'install',
      'install',
      'snapshot',
      'publish',
    ]) {
      const state = scheduled.at(-1)
      if (!state) throw new Error('Missing image alarm')
      await fixture.setTime(state.nextAt)
      await runImageAlarm(images, state)
      expect(await readBuildJob(db, org.id, buildId)).toMatchObject({
        state: 'running',
        phase,
      })
    }
    const state = scheduled.at(-1)
    if (!state) throw new Error('Missing publication alarm')
    const snapshotName = (await readBuildJob(db, org.id, buildId)).snapshotName
    if (!snapshotName) throw new Error('Missing unpublished snapshot')
    boat.beforeSandboxRead = async () => {
      boat.beforeSandboxRead = undefined
      await publication.wait()
    }
    await fixture.setTime(TEST_TIME + 10_000)
    publishing = runImageAlarm(images, state)
    await publication.entered
    firstSchedule.release()
    await starting

    const failed = await readBuild(db, org.id, buildId)
    expect(failed.build).toMatchObject({
      state: 'failed',
      completedAt: TEST_TIME + 10_000,
      error: 'The cloud computer build could not start. Try again.',
    })
    expect(failed.log.at(-1)).toEqual({
      eventNumber: 7,
      occurredAt: TEST_TIME + 10_000,
      text: 'The cloud computer build could not start. Try again.',
    })
    expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
      imageName: 'last-good-image',
      imageBuildId: 'published-image',
    })

    await fixture.setTime(TEST_TIME + 11_000)
    publication.release()
    await publishing

    const afterPublication = await readBuild(db, org.id, buildId)
    expect.soft(afterPublication.build).toMatchObject({
      state: 'failed',
      completedAt: TEST_TIME + 10_000,
      error: 'The cloud computer build could not start. Try again.',
    })
    expect.soft(afterPublication.log.at(-1)).toEqual({
      eventNumber: 7,
      occurredAt: TEST_TIME + 10_000,
      text: 'The cloud computer build could not start. Try again.',
    })
    expect.soft(await readOrgImage(db, org.id, 'boat')).toMatchObject({
      imageName: 'last-good-image',
      imageBuildId: 'published-image',
    })
    expect.soft(boat.deletedSnapshots).toEqual([snapshotName])
  } finally {
    firstSchedule.release()
    publication.release()
    await Promise.allSettled([starting, publishing])
  }
})
