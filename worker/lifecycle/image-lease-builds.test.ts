import { expect, it } from 'vitest'

import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild } from './build-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { createWorkspace } from './workspaces'
import { FIRST_MESSAGE } from './durable-test-support'
import { readOrgImage } from './org-image-data'
import { leasedImage } from './image-leases'
import { finishImageBuild as finish } from './image-test-support'

const backendFixture = setupBackendTests()

it('keeps a leased image until its workspace starts across a replacement publication', async () => {
  const fixture = backendFixture()
  try {
    const { images, org, user, boat, runtime } = fixture
    const initial = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    await finish(fixture, initial)
    const imageA = (await readOrgImage(runtime.env.DB, org.id))?.imageName
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
    expect(await leasedImage(runtime.env.DB, org.id, workspaceId)).toEqual({
      imageName: imageA,
      providerAccount: 'boat',
    })
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
    for (let step = 0; step < 15 && (await actor.job()); step++) {
      if ((await actor.job())?.phase === 'runner')
        await fixture.actors
          .get(workspaceId)
          ?.endpoint()
          .reportRunnerLifecycle({ type: 'runner.ready' })
      await actor.advance()
    }
    expect(await actor.job()).toBeUndefined()
    expect(await actor.wait()).toEqual({ ok: true })
    expect(boat.starts.at(-1)).toMatchObject({ from: imageA })
    await finish(fixture, replacement)
    expect(boat.deletedSnapshots).toContain(imageA)
  } finally {
    await fixture.dispose()
  }
})
