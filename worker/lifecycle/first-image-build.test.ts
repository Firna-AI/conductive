import { afterEach, expect, it, vi } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { readBuildHistory, readBuildJob, runningBuild } from './build-data'
import { setupFirstBuildTests } from './first-build-test-support'
import { startImageBuild } from './image-builds'
import { ImageCoordinator } from './image-coordinator'
import { finishImageBuild } from './image-test-support'
import { nativeLifecycleStorage } from './native-storage.test-support'
import { readOrgImage } from './org-image-data'

const fixtureForTest = setupFirstBuildTests()
afterEach(() => vi.restoreAllMocks())

it('starts one added build after first-image cleanup and restores its coordinator after a cleanup failure', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user, boat } = fixture
  const db = images.env.DB
  const { storage } = await nativeLifecycleStorage()
  const coordinator = () =>
    new ImageCoordinator(storage, images.env, images.dependencies)
  images.scheduler.schedule = (orgId, software, nextAt, buildId) =>
    coordinator().schedule({ orgId, software, nextAt, buildId })
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await db
    .prepare(
      'UPDATE settings SET revision = revision + 1, install_script = ? WHERE org_id = ?',
    )
    .bind('echo changed', org.id)
    .run()
  boat.deleteFailures = 1
  await expect(finishImageBuild(fixture, id)).rejects.toMatchObject({
    status: 503,
  })
  const first = await readBuildJob(db, org.id, id)
  expect(first).toMatchObject({ state: 'succeeded', phase: 'cleanup-build' })
  expect(await runningBuild(db, org.id)).toBe(null)
  expect((await readBuildHistory(db, org.id)).builds).toHaveLength(1)
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('next-admin', 800, 'next-admin', 1, 1)",
    ),
    db
      .prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, 'next-admin', 'admin', ?)",
      )
      .bind(org.id, TEST_TIME + 1),
    db
      .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
      .bind(TEST_TIME, user.id),
  ])
  await coordinator().alarm()
  const added = await runningBuild(db, org.id)
  expect(added).not.toBe(null)
  if (added === null) throw new Error('Missing added build')
  expect(await readBuildJob(db, org.id, added)).toMatchObject({
    kind: 'build',
    settingsRevision: 2,
    startedByUserId: 'next-admin',
    phase: 'create',
  })
  expect(await coordinator().read()).toMatchObject({ buildId: added })
  expect((await readBuildJob(db, org.id, id)).phase).toBe('done')
  expect(boat.deletedIds).toEqual([first.sandboxId])
  await db
    .prepare('UPDATE settings SET revision = revision + 1 WHERE org_id = ?')
    .bind(org.id)
    .run()
  await finishImageBuild(fixture, added)
  expect(await runningBuild(db, org.id)).toBe(null)
  expect((await readBuildHistory(db, org.id)).builds).toHaveLength(2)
})

it.each([
  'unchanged',
  'failed',
  'no-active-admin',
  'changed-after-publication',
] as const)(
  'starts no added build when the first build is %s',
  async (outcome) => {
    const fixture = await fixtureForTest()
    const { images, org, user } = fixture
    const db = images.env.DB
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    })
    if (outcome === 'failed' || outcome === 'no-active-admin')
      await db
        .prepare('UPDATE settings SET revision = revision + 1 WHERE org_id = ?')
        .bind(org.id)
        .run()
    if (outcome === 'failed') fixture.boat.commandExitCode = 1
    if (
      outcome === 'no-active-admin' ||
      outcome === 'changed-after-publication'
    ) {
      fixture.boat.deleteFailures = 1
      await expect(finishImageBuild(fixture, id)).rejects.toMatchObject({
        status: 503,
      })
      if (outcome === 'no-active-admin')
        await db
          .prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
          .bind(TEST_TIME, user.id)
          .run()
      else
        await db
          .prepare(
            'UPDATE settings SET revision = revision + 1 WHERE org_id = ?',
          )
          .bind(org.id)
          .run()
    }
    await finishImageBuild(fixture, id)
    expect(await runningBuild(db, org.id)).toBe(null)
    expect((await readBuildHistory(db, org.id)).builds).toHaveLength(1)
    expect((await readBuildJob(db, org.id, id)).state).toBe(
      outcome === 'failed' ? 'failed' : 'succeeded',
    )
    expect(warning.mock.calls).toHaveLength(outcome === 'failed' ? 1 : 0)
  },
)

it('keeps the first good image and warns once when the added build cannot be scheduled', async () => {
  const fixture = await fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await db
    .prepare('UPDATE settings SET revision = revision + 1 WHERE org_id = ?')
    .bind(org.id)
    .run()
  const schedule = images.scheduler.schedule
  images.scheduler.schedule = async (...args) => {
    if (args[3] !== null) throw new Error('private-scheduler-detail')
    await schedule(...args)
  }
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await finishImageBuild(fixture, id)
  expect(await readOrgImage(db, org.id, 'boat')).toMatchObject({
    imageBuildId: id,
  })
  const history = await readBuildHistory(db, org.id)
  expect(history.builds.map((build) => build.state).sort()).toEqual([
    'failed',
    'succeeded',
  ])
  expect(warning.mock.calls).toEqual([
    [
      {
        kind: 'added_image_build_start_failed',
        message: 'Could not start the added cloud computer build.',
      },
    ],
  ])
  expect(await runningBuild(db, org.id)).toBe(null)
})
