import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild as finish } from './image-test-support'
import { refreshImagesForPush } from './image-timers'

const backendFixture = setupBackendTests()

it('keeps the good image across build and provider failures and publishes a successful retry', async () => {
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
    const providerFetch = images.dependencies.fetch
    images.dependencies.fetch = async () =>
      Response.json({ ok: false, code: 'unauthorized' }, { status: 401 })
    const refusedBuild = await startImageBuild(images, {
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
    await finish(fixture, refusedBuild)
    expect(fixture.scheduled.at(-1)).toMatchObject({
      buildId: null,
      nextAt: TEST_TIME + 50,
    })
    expect(
      (await readBuild(runtime.env.DB, org.id, refusedBuild)).build,
    ).toMatchObject({
      state: 'failed',
      error:
        'The cloud computer image could not build. Check the log and try again.',
    })
    expect(boat.starts).toHaveLength(allocated)
    images.dependencies.fetch = providerFetch
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
