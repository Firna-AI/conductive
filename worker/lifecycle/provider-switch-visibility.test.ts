import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory, readBuildJob } from './build-data'
import { buildEventsResponse } from './build-stream'
import {
  publishVisibilityBuild,
  seedVisibilityBuild,
} from './provider-switch-visibility.test-support'

const fixtureForTest = setupBackendTests()

it('leaves running, failed, and successful switch builds out of member history and its newest build', async () => {
  const fixture = fixtureForTest()
  for (const [index, state] of (
    ['running', 'failed', 'succeeded'] as const
  ).entries()) {
    await seedVisibilityBuild(fixture, {
      id: `hidden-${state}`,
      state,
      now: TEST_TIME + index,
      hidden: true,
    })
  }
  const history = await readBuildHistory(fixture.images.env.DB, fixture.org.id)
  expect(history.builds.map(({ id, state }) => ({ id, state }))).toEqual([
    { id: 'published-image', state: 'succeeded' },
  ])
  expect(history.currentImageBuildId).toBe('published-image')
})

it('uses the newest visible good build only when the published image belongs to a switch', async () => {
  const fixture = fixtureForTest()
  const db = fixture.images.env.DB
  await seedVisibilityBuild(fixture, {
    id: 'newest-visible-good',
    kind: 'refresh',
    state: 'succeeded',
    now: TEST_TIME,
  })
  expect((await readBuildHistory(db, fixture.org.id)).currentImageBuildId).toBe(
    'published-image',
  )
  await publishVisibilityBuild(fixture, 'newest-visible-good')
  await seedVisibilityBuild(fixture, {
    id: 'published-switch',
    state: 'succeeded',
    sourceBuildId: 'newest-visible-good',
    now: TEST_TIME + 1,
    hidden: true,
  })
  await publishVisibilityBuild(fixture, 'published-switch')
  await seedVisibilityBuild(fixture, {
    id: 'newest-visible-failure',
    state: 'failed',
    now: TEST_TIME + 2,
  })
  await seedVisibilityBuild(fixture, {
    id: 'newest-visible-running',
    state: 'running',
    now: TEST_TIME + 3,
  })
  expect((await readBuildHistory(db, fixture.org.id)).currentImageBuildId).toBe(
    'newest-visible-good',
  )
})

it('rejects hidden and other-org build logs and streams while retaining the internal switch job', async () => {
  const fixture = fixtureForTest()
  const { images, org, user, runtime } = fixture
  await seedVisibilityBuild(fixture, {
    id: 'hidden-build',
    state: 'failed',
    now: TEST_TIME,
    hidden: true,
  })
  await images.env.DB.prepare(
    `INSERT INTO orgs (id, name, creator_user_id, created_at)
     VALUES ('other-org', 'Other org', ?, ?)`,
  )
    .bind(user.id, TEST_TIME)
    .run()
  await seedVisibilityBuild(fixture, {
    id: 'other-org-build',
    orgId: 'other-org',
    state: 'failed',
    now: TEST_TIME,
  })
  expect(
    await readBuildJob(images.env.DB, org.id, 'hidden-build'),
  ).toMatchObject({
    buildId: 'hidden-build',
    operatorSwitchId: 'switch-hidden-build',
    state: 'failed',
  })
  for (const buildId of ['hidden-build', 'other-org-build']) {
    await expect
      .soft(readBuild(images.env.DB, org.id, buildId))
      .rejects.toMatchObject({
        status: 404,
        code: 'build_not_found',
      })
    const stream = buildEventsResponse({
      env: runtime.env,
      orgId: org.id,
      userId: user.id,
      buildId,
      after: 0,
    }).then(async (response) => {
      await response.body?.cancel()
      return response
    })
    await expect.soft(stream).rejects.toMatchObject({
      status: 404,
      code: 'build_not_found',
    })
  }
})

it('keeps pending script and repository notices when a hidden switch publishes after a refresh', async () => {
  const fixture = fixtureForTest()
  const { images, org, repositoryId } = fixture
  const db = images.env.DB
  await db.batch([
    db
      .prepare('UPDATE settings SET install_script = ? WHERE org_id = ?')
      .bind('echo saved for a later build', org.id),
    db
      .prepare('UPDATE repositories SET selected = 0 WHERE id = ?')
      .bind(repositoryId),
    db
      .prepare(
        `INSERT INTO repositories
         (id, org_id, github_repository_id, full_name, default_branch, selected)
         VALUES ('waiting-repository', ?, 2, 'example/waiting', 'main', 1)`,
      )
      .bind(org.id),
  ])
  await seedVisibilityBuild(fixture, {
    id: 'published-refresh',
    kind: 'refresh',
    state: 'succeeded',
    installScript: 'echo saved for a later build',
    now: TEST_TIME,
  })
  await publishVisibilityBuild(fixture, 'published-refresh')
  const expected = {
    installScript: true,
    addedRepositories: [
      { id: 'waiting-repository', fullName: 'example/waiting' },
    ],
    removedRepositories: [{ id: repositoryId, fullName: 'example/repository' }],
  }
  expect((await readBuildHistory(db, org.id)).changes).toEqual(expected)
  await seedVisibilityBuild(fixture, {
    id: 'published-switch',
    state: 'succeeded',
    sourceBuildId: 'published-refresh',
    installScript: '',
    now: TEST_TIME + 1,
    hidden: true,
  })
  await publishVisibilityBuild(fixture, 'published-switch')
  expect((await readBuildHistory(db, org.id)).changes).toEqual(expected)
  await db.batch([
    db
      .prepare("UPDATE settings SET install_script = '' WHERE org_id = ?")
      .bind(org.id),
    db
      .prepare('UPDATE repositories SET selected = 1 WHERE id = ?')
      .bind(repositoryId),
    db.prepare(
      "UPDATE repositories SET selected = 0 WHERE id = 'waiting-repository'",
    ),
  ])
  expect((await readBuildHistory(db, org.id)).changes).toEqual({
    installScript: false,
    addedRepositories: [],
    removedRepositories: [],
  })
})
