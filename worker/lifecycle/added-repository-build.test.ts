import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  failBuild,
  readBuildHistory,
  readBuildJob,
  runningBuild,
} from './build-data'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const fixtureForTest = setupBackendTests()

async function addRepository(db: D1Database, orgId: string) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO repositories
      (id, org_id, github_repository_id, full_name, default_branch, selected)
      VALUES ('added-repository', ?, 2, 'example/added', 'main', 1)`,
      )
      .bind(orgId),
    db
      .prepare('UPDATE settings SET revision = revision + 1 WHERE org_id = ?')
      .bind(orgId),
  ])
}

it.each(['build', 'refresh'] as const)(
  'starts one added build for a repository added during a successful %s',
  async (kind) => {
    const fixture = fixtureForTest()
    const { images, org, user } = fixture
    const db = images.env.DB
    const input = { orgId: org.id, userId: user.id, kind, software: SOFTWARE }
    const id = await startImageBuild(images, input)
    await addRepository(db, org.id)
    expect(await startImageBuild(images, { ...input, kind: 'build' })).toBe(id)
    expect((await readBuildHistory(db, org.id)).builds).toHaveLength(2)
    await finishImageBuild(fixture, id)
    const added = await runningBuild(db, org.id)
    expect(added).not.toBe(null)
    if (added === null) throw new Error('Missing added build')
    expect(await readBuildJob(db, org.id, added)).toMatchObject({
      kind: 'build',
      startedByUserId: user.id,
      settingsRevision: 2,
    })
    expect(
      JSON.parse((await readBuildJob(db, org.id, added)).repositoriesJson),
    ).toContainEqual({
      id: 'added-repository',
      orgId: org.id,
      fullName: 'example/added',
      defaultBranch: 'main',
    })
    await finishImageBuild(fixture, added)
    expect(await runningBuild(db, org.id)).toBe(null)
    expect((await readBuildHistory(db, org.id)).builds).toHaveLength(3)
  },
)

it('starts no added build for a repository added during a failed build', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await addRepository(images.env.DB, org.id)
  fixture.boat.commandExitCode = 1
  await finishImageBuild(fixture, id)
  expect(await readBuildJob(images.env.DB, org.id, id)).toMatchObject({
    state: 'failed',
    phase: 'done',
  })
  expect(await runningBuild(images.env.DB, org.id)).toBe(null)
  expect((await readBuildHistory(images.env.DB, org.id)).builds).toHaveLength(2)
})

it('starts no added build after a refresh when the newest build failed', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const input = { orgId: org.id, userId: user.id, software: SOFTWARE }
  const failed = await startImageBuild(images, { ...input, kind: 'build' })
  await failBuild(
    images.env.DB,
    failed,
    'The install script failed.',
    images.dependencies.now(),
  )
  const refresh = await startImageBuild(images, { ...input, kind: 'refresh' })
  await addRepository(images.env.DB, org.id)
  await finishImageBuild(fixture, refresh)
  expect(await readBuildJob(images.env.DB, org.id, refresh)).toMatchObject({
    state: 'succeeded',
    phase: 'done',
  })
  expect(await runningBuild(images.env.DB, org.id)).toBe(null)
  expect((await readBuildHistory(images.env.DB, org.id)).builds).toHaveLength(3)
})
