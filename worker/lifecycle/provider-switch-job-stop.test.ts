import { expect, it } from 'vitest'

import { SOFTWARE } from './backend-test-support'
import { readBuild, readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { progressProviderSwitch } from './provider-switch-builds'
import { setupSwitchTests, requestSwitch } from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it.each(['build', 'refresh'] as const)(
  'ends a running %s only when the operator selects that choice',
  async (kind) => {
    const fixture = await fixtureForTest()
    const { images, org, user } = fixture
    const job = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind,
      software: SOFTWARE,
    })
    const record = await requestSwitch(fixture, true)
    await progressProviderSwitch(images, org.id)
    expect((await readBuild(images.env.DB, org.id, job)).build).toMatchObject({
      kind,
      state: 'failed',
      error:
        'Another update of the cloud computer stopped this build. Try again.',
    })
    expect(await readBuildJob(images.env.DB, org.id, job)).toMatchObject({
      phase: 'done',
    })
    expect(await record.read()).toMatchObject({
      state: 'building',
      endRunningJob: true,
      endRunningJobId: job,
    })
  },
)
