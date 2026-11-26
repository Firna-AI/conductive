import { expect, it, vi } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  readBuild,
  readBuildHistory,
  readBuildJob,
  runningBuild,
} from './build-data'
import { requestBuildAfterRefresh } from './build-request'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const fixtureForTest = setupBackendTests()

async function changeInstallScript(db: D1Database, orgId: string) {
  await db
    .prepare(
      'UPDATE settings SET revision = revision + 1, install_script = ? WHERE org_id = ?',
    )
    .bind('echo changed', orgId)
    .run()
}

async function startRefresh(fixture: ReturnType<typeof fixtureForTest>) {
  const { images, org, user } = fixture
  const input = { orgId: org.id, userId: user.id, software: SOFTWARE }
  const refresh = await startImageBuild(images, { ...input, kind: 'refresh' })
  await changeInstallScript(images.env.DB, org.id)
  const click = { ...input, kind: 'build' as const, requested: true }
  return { refresh, click }
}

it('starts the build that an admin asked for during a refresh when it succeeds', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  expect(await startImageBuild(images, click)).toBe(refresh)
  expect(await startImageBuild(images, click)).toBe(refresh)
  expect((await readBuild(db, org.id, refresh)).build).toMatchObject({
    kind: 'refresh',
    buildRequested: true,
  })
  await finishImageBuild(fixture, refresh)
  expect((await readBuild(db, org.id, refresh)).build).not.toHaveProperty(
    'buildRequested',
  )
  const requested = await runningBuild(db, org.id)
  if (requested === null) throw new Error('Missing requested build')
  expect(await readBuildJob(db, org.id, requested)).toMatchObject({
    kind: 'build',
    startedByUserId: user.id,
    settingsRevision: 2,
  })
  await finishImageBuild(fixture, requested)
  expect(await runningBuild(db, org.id)).toBe(null)
  expect((await readBuildHistory(db, org.id)).builds).toHaveLength(3)
})

it('starts the requested build also after a failed refresh', async () => {
  const fixture = fixtureForTest()
  const { images, org } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  await startImageBuild(images, click)
  fixture.boat.commandExitCode = 1
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await finishImageBuild(fixture, refresh)
  expect(await readBuildJob(db, org.id, refresh)).toMatchObject({
    state: 'failed',
    phase: 'done',
  })
  const requested = await runningBuild(db, org.id)
  if (requested === null) throw new Error('Missing requested build')
  expect(await readBuildJob(db, org.id, requested)).toMatchObject({
    kind: 'build',
    settingsRevision: 2,
  })
})

it('starts no requested build when the admin who asked lost the role', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  await startImageBuild(images, click)
  await db
    .prepare(
      "UPDATE org_members SET role = 'member' WHERE org_id = ? AND user_id = ?",
    )
    .bind(org.id, user.id)
    .run()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await finishImageBuild(fixture, refresh)
  expect(await runningBuild(db, org.id)).toBe(null)
  expect(warning.mock.calls).toContainEqual([
    {
      kind: 'requested_image_build_start_failed',
      message:
        'Could not start the build that an admin asked for during a refresh.',
    },
  ])
})

it('saves no request on a refresh that ended or on a build', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const input = { orgId: org.id, userId: user.id, software: SOFTWARE }
  const build = await startImageBuild(images, { ...input, kind: 'build' })
  const click = { ...input, kind: 'build' as const, requested: true }
  expect(await startImageBuild(images, click)).toBe(build)
  expect((await readBuild(db, org.id, build)).build).not.toHaveProperty(
    'buildRequested',
  )
  await finishImageBuild(fixture, build)
  expect(await requestBuildAfterRefresh(db, build, user.id)).toBe(false)
  const refresh = await startImageBuild(images, { ...input, kind: 'refresh' })
  await finishImageBuild(fixture, refresh)
  expect(await requestBuildAfterRefresh(db, refresh, user.id)).toBe(false)
  expect(await runningBuild(db, org.id)).toBe(null)
})
