import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { failBuild, readBuild, writeBuildLog } from './build-data'
import { failUnscheduledBuild } from './image-build-failure'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('keeps the original failure log after a late scheduling failure and permits cleanup diagnostics', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, runtime } = fixture
  const db = runtime.env.DB
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await failBuild(
    db,
    id,
    'The cloud computer image could not build. Check the log and try again.',
    TEST_TIME + 1,
  )
  await fixture.setTime(TEST_TIME + 2)
  await failUnscheduledBuild(images, id)
  await writeBuildLog(db, id, 'Cleanup diagnostic.\n', TEST_TIME + 3)

  const failed = await readBuild(db, org.id, id)
  expect(failed.build).toMatchObject({
    state: 'failed',
    completedAt: TEST_TIME + 1,
    durationMs: 1,
    error:
      'The cloud computer image could not build. Check the log and try again.',
  })
  expect(failed.log).toEqual([
    {
      eventNumber: 1,
      occurredAt: TEST_TIME + 1,
      text: 'The cloud computer image could not build. Check the log and try again.',
    },
    {
      eventNumber: 2,
      occurredAt: TEST_TIME + 3,
      text: 'Cleanup diagnostic.\n',
    },
  ])
})
