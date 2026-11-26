import { expect, it } from 'vitest'

import { seedReadySoftwareImage } from '../software-image/test-support'
import { readOrgProviderAccount } from '../data/org-provider-account'
import { TEST_TIME } from '../test-support/harness'
import { readBuildJob, runningBuild } from './build-data'
import { advanceImageBuild } from './image-builds'
import { readSourceRepositories } from './image-sources/data'
import { finishImageBuild } from './image-test-support'
import { progressProviderSwitch } from './provider-switch-builds'
import { legacyRepositoryDirectory } from './repository-locations'
import {
  setupSwitchTests,
  requestSwitch,
  SECONDARY_IMAGE_ACCOUNT,
} from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('copies the published inputs, starts from target software, and changes the account only with image publication', async () => {
  const fixture = await fixtureForTest()
  const { images, org, boat, repositoryId } = fixture
  const db = images.env.DB
  const locations = [
    {
      repositoryId,
      directory: '/home/user/code/installed-folder',
      variable: 'CONDUCTIVE_REPOSITORY_INSTALLED_DIR',
    },
  ]
  const repositories = [
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'example/repository',
      defaultBranch: 'main',
    },
  ]
  const software = await seedReadySoftwareImage(db, 'target-software', {
    account: SECONDARY_IMAGE_ACCOUNT,
  })
  await db
    .prepare(
      "UPDATE image_build_jobs SET install_script = 'echo published', repository_locations_json = ? WHERE build_id = 'published-image'",
    )
    .bind(JSON.stringify(locations))
    .run()
  await db
    .prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
    VALUES ('waiting-repository', ?, 2, 'example/waiting', 'main')`,
    )
    .bind(org.id)
    .run()
  await db
    .prepare(
      "UPDATE settings SET install_script = 'exit 99', revision = 9 WHERE org_id = ?",
    )
    .bind(org.id)
    .run()
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  expect(await record.read()).toMatchObject({
    state: 'building',
    buildStartedAt: TEST_TIME,
    waitReason: null,
  })
  const id = await runningBuild(db, org.id)
  expect(id).toEqual(expect.any(String))
  const job = await readBuildJob(db, org.id, id ?? '')
  expect(job).toMatchObject({
    providerAccount: SECONDARY_IMAGE_ACCOUNT,
    previousImageName: null,
    previousProviderAccount: SECONDARY_IMAGE_ACCOUNT,
    settingsRevision: 1,
    softwareImageName: software,
  })
  expect(JSON.parse(job.repositoriesJson)).toEqual(repositories)
  expect(JSON.parse(job.repositoryLocationsJson ?? 'null')).toEqual(locations)
  expect(
    await db
      .prepare('SELECT install_script FROM image_build_jobs WHERE build_id = ?')
      .bind(job.buildId)
      .first('install_script'),
  ).toBe('echo published')
  expect(await readOrgProviderAccount(db, org.id)).toBe('boat')
  await fixture.setTime(TEST_TIME + 500)
  await finishImageBuild(fixture, job.buildId)
  expect(fixture.sourceCalls[0]).toMatchObject({
    repositories,
    repositoryLocations: locations,
    previousRepositoryLocations: [],
  })
  expect(boat.starts[0].from).toBe(software)
  expect(await readOrgProviderAccount(db, org.id)).toBe(SECONDARY_IMAGE_ACCOUNT)
  expect(await record.read()).toMatchObject({
    state: 'completed',
    accountChangedAt: TEST_TIME + 500,
  })
  expect(
    await db
      .prepare(
        "SELECT image_name FROM org_images WHERE org_id = ? AND provider_account = 'boat'",
      )
      .bind(org.id)
      .first('image_name'),
  ).toBe('last-good-image')
  expect(await runningBuild(db, org.id)).toBeNull()
  expect(
    (
      await db
        .prepare('SELECT id FROM image_builds WHERE org_id = ?')
        .bind(org.id)
        .all()
    ).results,
  ).toHaveLength(3)
})

it('copies a renamed repository during a switch and keeps its legacy folder', async () => {
  const fixture = await fixtureForTest()
  const { images, org, repositoryId } = fixture
  const db = images.env.DB
  await db.batch([
    db
      .prepare(
        "UPDATE repositories SET full_name = 'example/renamed', default_branch = 'trunk' WHERE org_id = ? AND id = ?",
      )
      .bind(org.id, repositoryId),
    db.prepare(
      "UPDATE image_build_jobs SET repository_locations_json = NULL WHERE build_id = 'published-image'",
    ),
  ])
  images.prepareSources = async ({ orgId, repositories }) => {
    await readSourceRepositories(db, orgId, repositories)
  }
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const id = (await record.read())?.buildId ?? ''
  await advanceImageBuild(images, org.id, id)
  await advanceImageBuild(images, org.id, id)
  const job = await readBuildJob(db, org.id, id)
  expect(job).toMatchObject({ state: 'running', phase: 'software' })
  expect(JSON.parse(job.repositoriesJson)).toEqual([
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'example/renamed',
      defaultBranch: 'trunk',
    },
  ])
  expect(JSON.parse(job.repositoryLocationsJson ?? 'null')).toEqual([
    {
      repositoryId,
      directory: legacyRepositoryDirectory(repositoryId),
      variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
    },
  ])
})

it('changes an org with no good image at once without a build, also while suspended or deleted', async () => {
  const fixture = await fixtureForTest()
  const db = fixture.images.env.DB
  await db
    .prepare(
      "DELETE FROM org_images WHERE org_id = ? AND provider_account = 'boat'",
    )
    .bind(fixture.org.id)
    .run()
  await db
    .prepare('UPDATE orgs SET suspended_at = ?, deleted_at = ? WHERE id = ?')
    .bind(TEST_TIME, TEST_TIME, fixture.org.id)
    .run()
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(fixture.images, fixture.org.id)
  expect(await readOrgProviderAccount(db, fixture.org.id)).toBe(
    SECONDARY_IMAGE_ACCOUNT,
  )
  expect(await record.read()).toMatchObject({
    state: 'completed',
    buildId: null,
    accountChangedAt: TEST_TIME,
  })
  expect(fixture.boat.starts).toEqual([])
})
