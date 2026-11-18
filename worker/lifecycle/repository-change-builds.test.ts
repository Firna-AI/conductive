import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuildJob } from './build-data'
import { buildImagesForRepositoryChange } from './repository-change-builds'

const backendFixture = setupBackendTests()

async function installed(db: D1Database) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO github_installations (id, account_login, account_type, created_at) VALUES (91, 'example', 'Organization', ?)",
    )
    .bind(TEST_TIME)
    .run()
}

function change(installationId = 91) {
  let reads = 0
  return {
    input: {
      githubRepositoryId: 1,
      installationId,
      software: async () => {
        reads += 1
        return SOFTWARE
      },
    },
    reads: () => reads,
  }
}

it('builds the image once with the new name and default branch', async () => {
  const fixture = backendFixture()
  const { images, org, runtime } = fixture
  await installed(runtime.env.DB)
  await runtime.env.DB.prepare(
    "UPDATE repositories SET full_name = 'example/renamed', default_branch = 'trunk'",
  ).run()
  const [build] = await buildImagesForRepositoryChange(images, change().input)
  const job = await readBuildJob(runtime.env.DB, org.id, build ?? '')
  expect(job.kind).toBe('build')
  expect(JSON.parse(job.repositoriesJson)).toEqual([
    {
      id: fixture.repositoryId,
      orgId: org.id,
      fullName: 'example/renamed',
      defaultBranch: 'trunk',
    },
  ])
  expect(await buildImagesForRepositoryChange(images, change().input)).toEqual(
    [],
  )
})

it('starts no build for unchanged values, another installation, or a failed newest build', async () => {
  const fixture = backendFixture()
  const { images, org, runtime } = fixture
  await installed(runtime.env.DB)
  const unchanged = change()
  expect(await buildImagesForRepositoryChange(images, unchanged.input)).toEqual(
    [],
  )
  expect(unchanged.reads()).toBe(0)
  await runtime.env.DB.prepare(
    "UPDATE repositories SET full_name = 'example/renamed'",
  ).run()
  expect(
    await buildImagesForRepositoryChange(images, change(92).input),
  ).toEqual([])
  await runtime.env.DB.prepare(
    `INSERT INTO image_builds (id, org_id, kind, state, settings_revision, runner_protocol_version, started_at, provider_account)
     SELECT 'failed-build', org_id, 'build', 'failed', settings_revision, runner_protocol_version, ?, provider_account
     FROM image_builds WHERE org_id = ?`,
  )
    .bind(TEST_TIME, org.id)
    .run()
  expect(await buildImagesForRepositoryChange(images, change().input)).toEqual(
    [],
  )
})
