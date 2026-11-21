import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { SOFTWARE_RELEASE as SOFTWARE } from '../lifecycle/software-release-test-support'
import { readBuildJob } from '../lifecycle/build-data'
import { startImageBuild } from '../lifecycle/image-builds'
import { finishImageBuild } from '../lifecycle/image-test-support'
import { TEST_TIME } from '../test-support/harness'
import { requestSoftwareImage } from './build'
import { softwareImages } from './data'
import { softwareImagePoll } from './poll.test-support'
import { repairSoftwareImages } from './repair'
import {
  seedReadySoftwareImage,
  softwareImageReleaseFixture,
} from './test-support'

const fixtureForTest = setupBackendTests()
const newer = { ...SOFTWARE, version: '0.0.43', sha256: 'b'.repeat(64) }

it('keeps a rollback image after its first-build pin ends and Cron retires the other version', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, boat } = fixture
  await images.env.DB.prepare('DELETE FROM org_images WHERE org_id = ?')
    .bind(org.id)
    .run()
  const old = await seedReadySoftwareImage(images.env.DB, 'rollback')
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await seedReadySoftwareImage(images.env.DB, 'later', {
    version: 'b'.repeat(64),
    now: TEST_TIME + 1,
  })
  expect(
    (await readBuildJob(images.env.DB, org.id, id)).softwareImageName,
  ).toBe(old)
  expect(boat.deletedSnapshots).toEqual([])
  expect(
    await requestSoftwareImage(images, SOFTWARE, 'b'.repeat(64)),
  ).toMatchObject({
    state: 'ready',
  })
  await finishImageBuild(fixture, id)
  expect((await readBuildJob(images.env.DB, org.id, id)).phase).toBe('done')
  expect(
    await requestSoftwareImage(images, SOFTWARE, 'b'.repeat(64)),
  ).toMatchObject({
    state: 'ready',
  })
  expect(
    (await softwareImages(images.env.DB, 'boat')).map((image) => image.id),
  ).toEqual(['later', 'rollback'])
  await repairSoftwareImages(images)
  expect(
    (await softwareImages(images.env.DB, 'boat')).map((image) => image.id),
  ).toEqual(['rollback'])
  expect(boat.deletedSnapshots).not.toContain(old)
  expect(boat.starts[0].from).toBe(old)
})

it('resumes a saved release without retiring the newer release that first builds now select', async () => {
  const { images, boat } = fixtureForTest()
  const release = softwareImageReleaseFixture(images)
  await seedReadySoftwareImage(images.env.DB, 'admitted')
  const poll = await softwareImagePoll(images)
  expect(await (await poll.request()).json()).toMatchObject({ state: 'ready' })
  release.current = newer
  await seedReadySoftwareImage(images.env.DB, 'current', {
    artifact: newer,
    now: TEST_TIME + 1,
  })
  expect(await (await poll.request()).json()).toMatchObject({ state: 'ready' })
  expect(
    (await softwareImages(images.env.DB, 'boat')).map((image) => image.id),
  ).toEqual(['current', 'admitted'])
  expect(release.reads).toBe(1)
  await repairSoftwareImages(images)
  expect(
    (await softwareImages(images.env.DB, 'boat')).map((image) => image.id),
  ).toEqual(['current'])
  expect(boat.starts).toEqual([])
  expect(release.reads).toBe(2)
})

it('keeps ready images when the current release is unavailable and still repairs failed resources', async () => {
  const { images, boat } = fixtureForTest()
  await seedReadySoftwareImage(images.env.DB, 'current')
  await seedReadySoftwareImage(images.env.DB, 'later', {
    artifact: newer,
    now: TEST_TIME + 1,
  })
  await seedReadySoftwareImage(images.env.DB, 'failed', { artifact: newer })
  await images.env.DB.prepare(
    "UPDATE software_images SET state = 'failed', phase = 'cleanup', sandbox_id = 'failed-builder' WHERE id = 'failed'",
  ).run()
  const fetch = images.dependencies.fetch
  let reads = 0
  images.dependencies.fetch = (request) => {
    if (new URL(request.url).hostname === 'runner.conductive.build') {
      reads++
      return Promise.resolve(new Response(null, { status: 503 }))
    }
    return fetch(request)
  }
  await repairSoftwareImages(images)
  expect(
    (await softwareImages(images.env.DB, 'boat')).map((image) => image.id),
  ).toEqual(['later', 'failed', 'current'])
  expect(boat.deletedSnapshots).toEqual([])
  expect(boat.deletedIds).toEqual(['failed-builder'])
  expect(reads).toBe(1)
})
