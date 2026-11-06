import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory } from './build-data'
import { buildEventsResponse } from './build-stream'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { createWorkspace } from './workspaces'
import { FIRST_MESSAGE } from './durable-test-support'
import { readImageSettings } from './settings-data'
import { leasedImage } from './image-leases'
import { finishImageBuild as finish } from './image-test-support'
import { storeBoatKey } from '../sandbox/keys'
import { refreshImagesForPush } from './image-timers'

const backendFixture = setupBackendTests()

it('streams build output before completion and keeps the good image after a failed build', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user, boat, runtime } = fixture
    const schedule = images.scheduler.schedule
    let firstSchedule = true
    images.scheduler.schedule = async (...args) => {
      if (firstSchedule) {
        firstSchedule = false
        throw new Error('scheduler unavailable')
      }
      await schedule(...args)
    }
    await expect(
      startImageBuild(images, {
        orgId: org.id,
        userId: user.id,
        kind: 'build',
        software: SOFTWARE,
      }),
    ).rejects.toThrow('scheduler unavailable')
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: { ...SOFTWARE, sha256: 'b'.repeat(64) },
    })
    expect(fixture.scheduled[0]).toEqual({
      orgId: org.id,
      software: SOFTWARE,
      nextAt: TEST_TIME,
      buildId: id,
    })
    boat.lostCreateReplies = 1
    await advanceImageBuild(images, org.id, id)
    await advanceImageBuild(images, org.id, id)
    expect(boat.starts[1]).toEqual(boat.starts[0])
    expect(boat.states.size).toBe(1)
    await advanceImageBuild(images, org.id, id)
    boat.commandRunning = true
    await advanceImageBuild(images, org.id, id)
    await advanceImageBuild(images, org.id, id)
    const streaming = await buildEventsResponse({
      env: runtime.env,
      orgId: org.id,
      userId: user.id,
      buildId: id,
      after: 2,
      wait: () => new Promise(() => {}),
    })
    const reader = streaming.body!.getReader()
    const output = await reader.read()
    expect(new TextDecoder().decode(output.value)).toContain('installing...')
    expect((await readBuild(runtime.env.DB, org.id, id)).build.state).toBe(
      'running',
    )
    await reader.cancel()
    expect(boat.starts[0]).toMatchObject({
      from: 'last-good-image',
      noEnv: true,
      env: {},
    })
    boat.commandRunning = false
    await finish(fixture, id)
    const good = await readBuildHistory(runtime.env.DB, org.id)
    expect(good.currentImageBuildId).toBe(id)
    expect(good.builds[0]).toMatchObject({
      state: 'succeeded',
      kind: 'build',
      error: null,
    })
    expect(
      (await readBuild(runtime.env.DB, org.id, id)).log.filter(
        (event) => event.text === 'installing...\n',
      ),
    ).toHaveLength(2)
    const imageA = (await readImageSettings(runtime.env.DB, org.id)).imageName
    fixture.pauseStarts()
    const queued = fixture.nextQueued()
    void createWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }).catch(() => {})
    const workspaceId = await queued
    const actor = fixture.starts.get(workspaceId)
    if (!actor || !imageA) throw new Error('Missing queued image start')
    await actor.advance()
    expect(await leasedImage(runtime.env.DB, org.id, workspaceId)).toBe(imageA)
    const replacement = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    for (
      let step = 0;
      step < 20 &&
      (await readBuild(runtime.env.DB, org.id, replacement)).build.state ===
        'running';
      step++
    )
      await advanceImageBuild(images, org.id, replacement)
    expect(
      (await readBuild(runtime.env.DB, org.id, replacement)).build.state,
    ).toBe('succeeded')
    expect(boat.deletedSnapshots).not.toContain(imageA)
    for (let step = 0; step < 15 && (await actor.job()); step++)
      await actor.advance()
    expect(await actor.job()).toBeUndefined()
    expect(await actor.wait()).toEqual({ ok: true })
    expect(boat.starts.at(-1)).toMatchObject({ from: imageA })
    await finish(fixture, replacement)
    expect(boat.deletedSnapshots).toContain(imageA)
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
    await expect(
      buildEventsResponse({
        env: runtime.env,
        orgId: org.id,
        userId: user.id,
        buildId: 'unknown',
        after: 0,
      }),
    ).rejects.toMatchObject({ status: 404, code: 'build_not_found' })
  } finally {
    await fixture.dispose()
  }
})
