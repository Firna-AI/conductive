import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { storeBoatKey } from '../sandbox/keys'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild as finish } from './image-test-support'
import { refreshImagesForPush } from './image-timers'

const backendFixture = setupBackendTests()

it('keeps the good image across build and key failures and publishes a successful retry', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user, boat, runtime } = fixture
    const replacement = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finish(fixture, replacement)
    fixture.setTime(TEST_TIME + 50)
    const failed = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    boat.commandExitCode = 1
    await finish(fixture, failed)
    expect(
      (await readBuildHistory(runtime.env.DB, org.id)).currentImageBuildId,
    ).toBe(replacement)
    expect(
      (await readBuild(runtime.env.DB, org.id, failed)).build,
    ).toMatchObject({ state: 'failed', completedAt: TEST_TIME + 50 })
    const allocated = boat.starts.length
    await runtime.env.DB.prepare('DELETE FROM boat_keys WHERE org_id = ?')
      .bind(org.id)
      .run()
    const missingKey = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    expect(
      await refreshImagesForPush(images, {
        githubRepositoryId: 1,
        ref: 'refs/heads/main',
        software: SOFTWARE,
      }),
    ).toEqual([])
    await finish(fixture, missingKey)
    expect(fixture.scheduled.at(-1)).toMatchObject({
      buildId: null,
      nextAt: TEST_TIME + 50,
    })
    expect(
      (await readBuild(runtime.env.DB, org.id, missingKey)).build,
    ).toMatchObject({
      state: 'failed',
      error: 'Ask an org admin to add the cloud computer key.',
    })
    expect(boat.starts).toHaveLength(allocated)
    await storeBoatKey(
      runtime.env,
      org.id,
      user.id,
      'boat-first',
      boat.fetch,
      runtime.dependencies.now(),
    )
    boat.commandExitCode = 0
    const retried = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finish(fixture, retried)
    expect(
      (await readBuildHistory(runtime.env.DB, org.id)).currentImageBuildId,
    ).toBe(retried)
  } finally {
    await fixture.dispose()
  }
})
