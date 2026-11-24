import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildJob } from './build-data'
import { startImageBuild } from './image-builds'
import {
  readSourceRepositories,
  readSourceRepository,
  type SourceRepository,
} from './image-sources/data'
import { finishImageBuild } from './image-test-support'
import { readOrgImage } from './org-image-data'

const fixtureForTest = setupBackendTests()
type Fixture = ReturnType<typeof fixtureForTest>

function recordSourceRepositories({ images }: Fixture) {
  const sources: SourceRepository[] = []
  images.prepareSources = async ({ orgId, repositories }) => {
    const db = images.env.DB
    await readSourceRepositories(db, orgId, repositories)
    for (const repository of repositories)
      sources.push(await readSourceRepository(db, orgId, repository))
  }
  return sources
}

async function changeRepositoryAfterFailedBuild(
  { images, org, repositoryId }: Fixture,
  fullName: string,
  defaultBranch: string,
  installationId: number,
) {
  const db = images.env.DB
  await db.batch([
    db
      .prepare(
        `INSERT INTO github_installations (id, account_login, account_type, created_at)
       VALUES (?, ?, 'Organization', ?)`,
      )
      .bind(installationId, fullName.split('/')[0], TEST_TIME),
    db
      .prepare(
        `UPDATE repositories SET full_name = ?, default_branch = ?, installation_id = ?
       WHERE org_id = ? AND id = ?`,
      )
      .bind(fullName, defaultBranch, installationId, org.id, repositoryId),
    db
      .prepare(
        `INSERT INTO image_builds (id, org_id, kind, state, settings_revision,
       runner_protocol_version, provider_account, started_at, completed_at)
       SELECT 'failed-build', org_id, kind, 'failed', settings_revision,
       runner_protocol_version, provider_account, ?, ?
       FROM image_builds WHERE org_id = ? AND id = 'published-image'`,
      )
      .bind(TEST_TIME, TEST_TIME, org.id),
  ])
}

function startRefresh({ images, org, user }: Fixture) {
  return startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'refresh',
    software: SOFTWARE,
  })
}

it('refreshes a renamed repository after a failed build and keeps its old folder', async () => {
  const fixture = fixtureForTest()
  const { images, org, repositoryId } = fixture
  const db = images.env.DB
  recordSourceRepositories(fixture)
  await changeRepositoryAfterFailedBuild(
    fixture,
    'example/renamed',
    'trunk',
    91,
  )

  const refresh = await startRefresh(fixture)
  await finishImageBuild(fixture, refresh)
  const job = await readBuildJob(db, org.id, refresh)
  expect(job).toMatchObject({ kind: 'refresh', state: 'succeeded' })
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
      directory: '/home/user/code/repository',
      variable: 'CONDUCTIVE_REPOSITORY_REPOSITORY_DIR',
    },
  ])
  expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
    imageBuildId: refresh,
  })
})

it('refreshes a moved repository through its new installation after a failed build', async () => {
  const fixture = fixtureForTest()
  const { images, org, repositoryId } = fixture
  const db = images.env.DB
  const sources = recordSourceRepositories(fixture)
  await changeRepositoryAfterFailedBuild(
    fixture,
    'new-owner/repository',
    'main',
    92,
  )

  const refresh = await startRefresh(fixture)
  await finishImageBuild(fixture, refresh)
  const job = await readBuildJob(db, org.id, refresh)
  expect(job).toMatchObject({ kind: 'refresh', state: 'succeeded' })
  expect(JSON.parse(job.repositoriesJson)).toEqual([
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'new-owner/repository',
      defaultBranch: 'main',
    },
  ])
  const published = await readBuildJob(db, org.id, 'published-image')
  expect(job.repositoryLocationsJson).toBe(published.repositoryLocationsJson)
  expect(sources).toEqual([
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'new-owner/repository',
      defaultBranch: 'main',
      installationId: 92,
      githubRepositoryId: 1,
    },
  ])
})

it('fails a refresh and keeps the published image when a captured repository has no saved row', async () => {
  const fixture = fixtureForTest()
  const { images, org, repositoryId } = fixture
  const db = images.env.DB
  const sources = recordSourceRepositories(fixture)
  await db
    .prepare('DELETE FROM repositories WHERE org_id = ? AND id = ?')
    .bind(org.id, repositoryId)
    .run()

  const refresh = await startRefresh(fixture)
  await finishImageBuild(fixture, refresh)
  const job = await readBuildJob(db, org.id, refresh)
  expect(job).toMatchObject({ kind: 'refresh', state: 'failed' })
  const published = await readBuildJob(db, org.id, 'published-image')
  expect(job.repositoriesJson).toBe(published.repositoriesJson)
  expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
    imageBuildId: 'published-image',
  })
  expect(sources).toEqual([])
})
