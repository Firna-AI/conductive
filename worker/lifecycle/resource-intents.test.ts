import { expect, it } from 'vitest'

import { deleteOrg } from '../members/deletion'
import { cleanupResources } from '../members/deletion-data'
import { membersClient } from '../members/members-test-support'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildHistory, readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const backendFixture = setupBackendTests()

it('cleans up a saved image after a lost reply and retains its name for Delete org', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user, boat, runtime, harness } = fixture
    const buildId = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    const save = boatRoute({ operation: 'saveSnapshot' })
    let intentAtSave: string | null = null
    images.dependencies = {
      ...images.dependencies,
      fetch: async (request) => {
        if (
          request.method === save.method &&
          new URL(request.url).pathname.endsWith(save.path)
        ) {
          intentAtSave = (await readBuildJob(runtime.env.DB, org.id, buildId))
            .snapshotName
          await boat.fetch(request)
          throw new Error('Lost successful snapshot reply')
        }
        return boat.fetch(request)
      },
    }

    await finishImageBuild(fixture, buildId)

    expect(boat.deletedSnapshots).toEqual([`image-${buildId}`])
    expect(intentAtSave).toBe(`image-${buildId}`)
    expect(await readBuildJob(runtime.env.DB, org.id, buildId)).toMatchObject({
      state: 'failed',
      phase: 'done',
      snapshotName: `image-${buildId}`,
      sandboxId: null,
    })
    expect(boat.deletedIds).toEqual(['bx_1'])
    expect(
      (await readBuildHistory(runtime.env.DB, org.id)).currentImageBuildId,
    ).toBe('published-image')

    await deleteOrg(
      runtime.env,
      org.id,
      user.id,
      org.name,
      runtime.dependencies,
      membersClient(harness).hooks,
    )
    expect(await cleanupResources(runtime.env.DB, org.id)).toContainEqual({
      kind: 'snapshot',
      id: `image-${buildId}`,
      stoppedAt: null,
      removedAt: null,
    })
  } finally {
    await fixture.dispose()
  }
})
