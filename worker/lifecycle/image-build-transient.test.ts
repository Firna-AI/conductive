import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildJob } from './build-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { IMAGE_POLL_MS, runImageAlarm } from './image-timers'

const backendFixture = setupBackendTests()

it('resumes saved build progress on the next alarm after a transient provider error', async () => {
  const fixture = await backendFixture()
  const { images, org, user, boat, runtime } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  for (let step = 0; step < 3; step++)
    await advanceImageBuild(images, org.id, id)
  boat.commandRunning = true
  boat.commandOutput = 'saved software output\n'
  await advanceImageBuild(images, org.id, id)
  const checkpoint = await readBuildJob(runtime.env.DB, org.id, id)
  expect(checkpoint).toMatchObject({
    state: 'running',
    phase: 'software',
    processId: 1,
    stdoutOffset: 22,
    stderrOffset: 0,
  })
  boat.beforeStatus = async () => {
    throw new Error('Temporary provider connection failure')
  }
  await runImageAlarm(images, {
    orgId: org.id,
    software: SOFTWARE,
    buildId: id,
    nextAt: TEST_TIME,
  })
  expect(await readBuildJob(runtime.env.DB, org.id, id)).toEqual({
    ...checkpoint,
    providerRetry: {
      openedAt: TEST_TIME,
      failures: 1,
      retryAt: TEST_TIME + 1_000,
    },
  })
  expect(fixture.scheduled.at(-1)).toMatchObject({
    buildId: id,
    nextAt: TEST_TIME + IMAGE_POLL_MS,
  })
  expect(boat.deletedIds).toEqual([])
  boat.beforeStatus = undefined
  boat.commandRunning = false
  const restarted = {
    ...fixture,
    images: { ...images, dependencies: { ...images.dependencies } },
  }
  await finishImageBuild(restarted, id)
  expect((await readBuild(runtime.env.DB, org.id, id)).build.state).toBe(
    'succeeded',
  )
  expect(boat.starts).toHaveLength(1)
  expect(fixture.sourceCalls).toHaveLength(1)
  expect(
    boat.commandRequests.filter((request) => request.detached),
  ).toHaveLength(2)
})
