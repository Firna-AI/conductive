import { expect, it } from 'vitest'

import { encrypt } from '../security/crypto'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { advanceImageBuild } from './image-builds'
import { leasedImage } from './image-leases'
import { seedPublishedImage } from './published-image-test-support'
import { orgEnvironmentContext } from './settings-data'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { readSavedScript } from './saved-script'
import { lifecycleCommandBody } from './command-test-support'

const fixtureForTest = setupBackendTests()

it('creates from captured image repositories while current settings and selection change', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  const ciphertext = await encrypt(
    JSON.stringify({ CURRENT_ENV: 'current-value' }),
    orgEnvironmentContext(org.id),
    runtime.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await runtime.env.DB.batch([
    runtime.env.DB.prepare(
      "UPDATE repositories SET selected = 0, default_branch = 'picker-default' WHERE id = ?",
    ).bind(repositoryId),
    runtime.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, selected)
       VALUES ('new-selection', ?, 2, 'example/new-selection', 'new-main', 1)`,
    ).bind(org.id),
    runtime.env.DB.prepare(
      'UPDATE settings SET startup_script = ?, env_vars_ciphertext = ? WHERE org_id = ?',
    ).bind('echo current-startup', ciphertext, org.id),
  ])
  const creation = fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  await expect(creation).resolves.toMatchObject({ workspace: { repositoryId } })
  const created = await creation
  expect(boat.starts[0]).toMatchObject({
    from: 'last-good-image',
    env: { CURRENT_ENV: 'current-value' },
  })
  expect(lifecycleCommandBody(boat.commands[0])).toContain(
    "git fetch origin 'main'",
  )
  const accepted = fixture.starts.get(created.workspace.id)?.lastAccepted()
  expect(accepted).toMatchObject({
    imageName: 'last-good-image',
    defaultBranch: 'main',
    startupScript: readSavedScript('echo current-startup'),
    environmentCiphertext: ciphertext,
  })
  await expect(
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: 'new-selection',
      firstMessage: { ...FIRST_MESSAGE, id: 'new-selection-message' },
    }),
  ).rejects.toMatchObject({
    status: 404,
    code: 'repository_not_found',
    message: 'The repository is ready after the next build.',
  })
  await runtime.env.DB.prepare(
    "UPDATE repositories SET selected = 0 WHERE id = 'new-selection'",
  ).run()
  await expect(
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: 'new-selection',
      firstMessage: { ...FIRST_MESSAGE, id: 'removed-selection-message' },
    }),
  ).rejects.toMatchObject({
    status: 404,
    code: 'repository_not_found',
    message: 'The repository is not available.',
  })
  await runtime.env.DB.prepare(
    "UPDATE org_images SET image_build_id = NULL WHERE org_id = ? AND provider_account = 'boat'",
  )
    .bind(org.id)
    .run()
  await expect(
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: { ...FIRST_MESSAGE, id: 'unpublished-message' },
    }),
  ).rejects.toMatchObject({ status: 409, code: 'image_required' })
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
    ).first('count'),
  ).toBe(1)
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM image_leases',
    ).first('count'),
  ).toBe(0)
})

it('leases the image and captured branch from the same publication at claim admission', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  const db = runtime.env.DB
  const repositories = [
    {
      id: repositoryId,
      orgId: org.id,
      fullName: 'example/repository',
      defaultBranch: 'published-next',
    },
  ]
  let published = false
  runtime.env.DB = new Proxy(db, {
    get(target, property) {
      if (property === 'batch')
        return async (queries: D1PreparedStatement[]) => {
          if (!published) {
            published = true
            await seedPublishedImage(db, {
              orgId: org.id,
              buildId: 'next-build',
              imageName: 'next-image',
              repositories,
              software: SOFTWARE,
              now: TEST_TIME + 1,
              runnerProtocolVersion: 2,
            })
          }
          return target.batch(queries)
        }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const input = { repositoryId, firstMessage: FIRST_MESSAGE }
  const queued = fixture.nextQueued()
  const pending = createCompletedWorkspace(runtime, org.id, user, input)
  void pending.catch(() => {})
  const id = await queued
  runtime.env.DB = db
  const actor = fixture.starts.get(id)
  if (!actor) throw new Error('Missing admitted actor')
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM image_leases')
      .first('count'),
  ).toBe(1)
  expect(await leasedImage(db, org.id, id)).toEqual({
    imageName: 'next-image',
    providerAccount: 'boat',
  })
  expect(actor.lastAccepted()).toMatchObject({
    imageName: 'next-image',
    defaultBranch: 'published-next',
  })
  expect(
    await db.prepare('SELECT COUNT(*) AS count FROM workspaces').first('count'),
  ).toBe(0)
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'later-build',
    imageName: 'later-image',
    repositories: [{ ...repositories[0], defaultBranch: 'published-later' }],
    software: SOFTWARE,
    now: TEST_TIME + 2,
    runnerProtocolVersion: 3,
  })
  await db
    .prepare(
      "UPDATE image_build_jobs SET phase = 'cleanup', previous_image_name = 'next-image' WHERE build_id = 'later-build'",
    )
    .run()
  expect(await advanceImageBuild(fixture.images, org.id, 'later-build')).toBe(
    false,
  )
  expect(boat.deletedSnapshots).not.toContain('next-image')
  const repeated = createCompletedWorkspace(runtime, org.id, user, input)
  void repeated.catch(() => {})
  for (let step = 0; step < 15 && (await actor.job()); step++) {
    if ((await actor.job())?.phase === 'runner')
      await fixture.actors
        .get(id)
        ?.endpoint()
        .reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.advance()
  }
  const [created, duplicate] = await Promise.all([pending, repeated])
  expect(created.workspace.id).toBe(id)
  expect(duplicate.workspace.id).toBe(id)
  expect(boat.starts).toHaveLength(1)
  expect(boat.starts[0]).toMatchObject({ from: 'next-image' })
  expect(
    await db
      .prepare('SELECT runner_protocol_version FROM workspaces WHERE id = ?')
      .bind(id)
      .first('runner_protocol_version'),
  ).toBe(2)
  expect(lifecycleCommandBody(boat.commands[0])).toContain(
    "git fetch origin 'published-next'",
  )
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM image_leases')
      .first('count'),
  ).toBe(0)
  expect(await advanceImageBuild(fixture.images, org.id, 'later-build')).toBe(
    true,
  )
  expect(boat.deletedSnapshots).toContain('next-image')
})

it('releases a failed claim lease before records exist and allows a fresh retry', async () => {
  const fixture = await fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const input = {
    repositoryId,
    sectionId: 'missing-section',
    firstMessage: FIRST_MESSAGE,
  }
  const queued = fixture.nextQueued()
  const failed = createCompletedWorkspace(runtime, org.id, user, input)
  void failed.catch(() => {})
  const id = await queued
  const actor = fixture.starts.get(id)
  if (!actor) throw new Error('Missing admitted actor')
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM image_leases',
    ).first('count'),
  ).toBe(1)
  expect(await leasedImage(runtime.env.DB, org.id, id)).toEqual({
    imageName: 'last-good-image',
    providerAccount: 'boat',
  })
  await actor.advance()
  await expect(failed).rejects.toMatchObject({ code: 'section_not_found' })
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(0)
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM image_leases',
    ).first('count'),
  ).toBe(0)
  expect(await runtime.workspace(id).waitCreationAdmission()).toMatchObject({
    ok: false,
    error: { code: 'section_not_found' },
  })
  const retried = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  expect(retried.workspace.id).not.toBe(id)
  expect(
    await runtime.env.DB.prepare(
      'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
    )
      .bind(id)
      .first('state'),
  ).toBe('failed')
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM image_leases',
    ).first('count'),
  ).toBe(0)
})
