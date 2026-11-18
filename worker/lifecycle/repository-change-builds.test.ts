import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuildHistory, readBuildJob } from './build-data'
import { refreshImagesForPush, runImageAlarm } from './image-timers'
import { wakeImagesForRepositoryChange } from './repository-change-builds'

const backendFixture = setupBackendTests()

async function installed(db: D1Database) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO github_installations (id, account_login, account_type, created_at) VALUES (91, 'example', 'Organization', ?)",
    )
    .bind(TEST_TIME)
    .run()
}

async function rename(db: D1Database) {
  await db
    .prepare(
      "UPDATE repositories SET full_name = 'example/renamed', default_branch = 'trunk'",
    )
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

it('wakes the coordinator only for an image with old values after a good build', async () => {
  const fixture = backendFixture()
  const { images, org, runtime } = fixture
  await installed(runtime.env.DB)
  const unchanged = change()
  expect(await wakeImagesForRepositoryChange(images, unchanged.input)).toEqual(
    [],
  )
  expect(unchanged.reads()).toBe(0)
  await rename(runtime.env.DB)
  expect(await wakeImagesForRepositoryChange(images, change(92).input)).toEqual(
    [],
  )
  const scheduled = fixture.scheduled.length
  expect(await wakeImagesForRepositoryChange(images, change().input)).toEqual([
    org.id,
  ])
  expect(fixture.scheduled.slice(scheduled)).toEqual([
    { orgId: org.id, software: SOFTWARE, buildId: null, nextAt: TEST_TIME },
  ])
  await runtime.env.DB.prepare(
    `INSERT INTO image_builds (id, org_id, kind, state, settings_revision, runner_protocol_version, started_at, provider_account)
     SELECT 'failed-build', org_id, 'build', 'failed', settings_revision, runner_protocol_version, ?, provider_account
     FROM image_builds WHERE org_id = ?`,
  )
    .bind(TEST_TIME, org.id)
    .run()
  expect(await wakeImagesForRepositoryChange(images, change().input)).toEqual(
    [],
  )
})

it('builds the new name and default branch in place of a refresh', async () => {
  const fixture = backendFixture()
  const { images, org, runtime } = fixture
  await installed(runtime.env.DB)
  await rename(runtime.env.DB)
  await runImageAlarm(images, {
    orgId: org.id,
    software: SOFTWARE,
    buildId: null,
    nextAt: TEST_TIME + 86_400_000,
  })
  const [build] = (await readBuildHistory(runtime.env.DB, org.id)).builds
  expect(build).toMatchObject({ kind: 'build', state: 'running' })
  const job = await readBuildJob(runtime.env.DB, org.id, build?.id ?? '')
  expect(JSON.parse(job.repositoriesJson)).toEqual([
    {
      id: fixture.repositoryId,
      orgId: org.id,
      fullName: 'example/renamed',
      defaultBranch: 'trunk',
    },
  ])
})

it('builds in place of a push refresh while the image holds old values', async () => {
  const fixture = backendFixture()
  const { images, org, runtime } = fixture
  await installed(runtime.env.DB)
  await runtime.env.DB.prepare(
    "UPDATE repositories SET full_name = 'example/renamed'",
  ).run()
  await fixture.setTime(TEST_TIME + 1_801_000)
  const [id] = await refreshImagesForPush(images, {
    githubRepositoryId: 1,
    ref: 'refs/heads/main',
    software: SOFTWARE,
  })
  expect((await readBuildJob(runtime.env.DB, org.id, id ?? '')).kind).toBe(
    'build',
  )
})
