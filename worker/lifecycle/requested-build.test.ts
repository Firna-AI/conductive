import { expect, it, vi } from 'vitest'

import {
  orgSettingsPaths,
  type BuildResponse,
} from '../../src/shared/org-settings'
import { createApp } from '../application'
import { TEST_ORIGIN } from '../test-support/harness'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  readBuild,
  readBuildHistory,
  readBuildJob,
  runningBuild,
} from './build-data'
import { requestBuildAfterRefresh } from './build-request'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { handleImageBuildFailure } from './image-build-failure'
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

async function addAdmin(db: D1Database, orgId: string, id: string) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
       VALUES (?, 900, ?, 1, 1)`,
      )
      .bind(id, id),
    db
      .prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', 1)",
      )
      .bind(orgId, id),
  ])
}

async function addRepository(db: D1Database, orgId: string) {
  await db
    .prepare(
      `INSERT INTO repositories
       (id, org_id, github_repository_id, full_name, default_branch, selected)
       VALUES ('added-repository', ?, 2, 'example/added', 'main', 1)`,
    )
    .bind(orgId)
    .run()
}

/**
 * Starts a refresh and saves a new install script. A second admin joins,
 * so that no test passes only because the org lost its last admin.
 */
async function startRefresh(fixture: ReturnType<typeof fixtureForTest>) {
  const { images, org, user } = fixture
  await addAdmin(images.env.DB, org.id, 'second-admin')
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
  expect(await readBuildJob(db, org.id, refresh)).toMatchObject({
    state: 'succeeded',
    phase: 'done',
  })
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

it('starts the requested build for the last admin who asked', async () => {
  const fixture = fixtureForTest()
  const { images, org } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  await startImageBuild(images, click)
  await startImageBuild(images, { ...click, userId: 'second-admin' })
  await finishImageBuild(fixture, refresh)
  const requested = await runningBuild(db, org.id)
  if (requested === null) throw new Error('Missing requested build')
  expect(await readBuildJob(db, org.id, requested)).toMatchObject({
    startedByUserId: 'second-admin',
  })
})

it('starts the requested build after a failure before the refresh has a sandbox', async () => {
  const fixture = fixtureForTest()
  const { images, org } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  await startImageBuild(images, click)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const ended = await handleImageBuildFailure(images, {
    orgId: org.id,
    buildId: refresh,
    provider: undefined,
    firstAllocation: true,
    error: new Error('The org image could not load.'),
  })
  expect(ended).toBe(true)
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

it('starts the added build when the requested build cannot start', async () => {
  const fixture = fixtureForTest()
  const { images, org, user } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  await startImageBuild(images, click)
  await addRepository(db, org.id)
  await db
    .prepare(
      "UPDATE org_members SET role = 'member' WHERE org_id = ? AND user_id = ?",
    )
    .bind(org.id, user.id)
    .run()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  await finishImageBuild(fixture, refresh)
  const added = await runningBuild(db, org.id)
  if (added === null) throw new Error('Missing added build')
  expect(await readBuildJob(db, org.id, added)).toMatchObject({
    kind: 'build',
    startedByUserId: 'second-admin',
  })
})

it('starts one build when an admin selects Build computer before the refresh cleanup ends', async () => {
  const fixture = fixtureForTest()
  const { images, org } = fixture
  const db = images.env.DB
  const { refresh, click } = await startRefresh(fixture)
  await startImageBuild(images, click)
  // A failed delete of the refresh sandbox keeps its cleanup open.
  fixture.boat.deleteFailures = 1
  for (let step = 0; step < 20; step++) {
    if ((await readBuildJob(db, org.id, refresh)).state !== 'running') break
    await advanceImageBuild(images, org.id, refresh).catch(() => false)
  }
  expect(await readBuildJob(db, org.id, refresh)).toMatchObject({
    state: 'succeeded',
  })
  expect((await readBuildJob(db, org.id, refresh)).phase).not.toBe('done')
  const clicked = await startImageBuild(images, click)
  expect(clicked).not.toBe(refresh)
  await finishImageBuild(fixture, clicked)
  await finishImageBuild(fixture, refresh)
  expect(await runningBuild(db, org.id)).toBe(null)
  expect((await readBuildHistory(db, org.id)).builds).toHaveLength(3)
})

it('saves a request when Build computer posts during a refresh', async () => {
  const fixture = fixtureForTest()
  const { org, runtime, session } = fixture
  const { refresh } = await startRefresh(fixture)
  const response = await createApp(runtime.dependencies).fetch(
    new Request(TEST_ORIGIN + orgSettingsPaths.builds(org.id), {
      method: 'POST',
      headers: {
        Cookie: session,
        Origin: TEST_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: '{}',
    }),
    runtime.env,
  )
  expect(response.status).toBe(202)
  const { build }: BuildResponse = await response.json()
  expect(build).toMatchObject({
    id: refresh,
    kind: 'refresh',
    state: 'running',
    buildRequested: true,
  })
})
