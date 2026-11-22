import { expect, it } from 'vitest'

import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { resumeCompletedWorkspace } from './completed-resume-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { leasedCreationImage } from './image-leases'
import { seedSecondaryOrgImage } from './org-image-account-test-support'
import { seedPublishedImage } from './published-image-test-support'
import { stopWorkspaceSandbox } from './workspace-actions'
import { readWorkspace } from './workspace-data'
import { resumeWorkspace } from './workspace-resume'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('retries a failed first create on the current org account after cleaning its old computer', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  await seedSecondaryOrgImage(fixture)
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const start = fixture.starts.get(id)
  const actor = fixture.actors.get(id)
  if (!start || !actor) throw new Error('Missing failed start actor')
  boat.commandExitCode = 1
  boat.deleteFailures = 2
  for (let step = 0; step < 16 && (await start.job()); step++)
    await start.advance()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  await seedPublishedImage(runtime.env.DB, {
    orgId: org.id,
    buildId: 'latest-secondary-build',
    imageName: 'latest-secondary-image',
    providerAccount: 'boat-second',
    repositories: [
      {
        id: repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: runtime.dependencies.now(),
  })
  await runtime.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind('boat-second', org.id)
    .run()
  expect(await resumeWorkspace(runtime, org.id, id, user.id)).toMatchObject({
    workspace: { id, state: 'starting', branch: created.workspace.branch },
  })
  expect(await start.job()).toMatchObject({
    kind: 'create',
    phase: 'machine',
    providerAccount: 'boat-second',
    imageName: 'latest-secondary-image',
  })
  expect(await readWorkspace(runtime.env.DB, org.id, id)).toMatchObject({
    providerAccount: 'boat-second',
    sandboxId: null,
  })
  expect(
    await leasedCreationImage(runtime.env.DB, org.id, id, repositoryId),
  ).toMatchObject({
    providerAccount: 'boat-second',
    imageName: 'latest-secondary-image',
  })
  await start.advance()
  expect(boat.starts).toHaveLength(1)
  expect(boat.deletedIds).toEqual([])
  expect(
    await runtime.env.DB.prepare(
      'SELECT provider_account AS providerAccount, sandbox_id AS sandboxId FROM lifecycle_sandbox_cleanup WHERE workspace_id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ providerAccount: 'boat', sandboxId: 'bx_1' })
  boat.commandExitCode = 0
  await start.restart()
  for (let step = 0; step < 20 && (await start.job()); step++) {
    if ((await start.job())?.phase === 'runner')
      await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
    await start.advance()
  }
  expect(await start.wait()).toEqual({ ok: true })
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(boat.starts).toHaveLength(2)
  expect(boat.starts[1]).toMatchObject({
    from: 'latest-secondary-image',
  })
  expect(await readWorkspace(runtime.env.DB, org.id, id)).toMatchObject({
    providerAccount: 'boat-second',
    sandboxId: 'bx_2',
  })
  const create = boatRoute({ operation: 'create' })
  const deletion = boatRoute({ operation: 'delete', sandboxId: 'bx_1' })
  expect(
    boat.server.requests
      .filter(
        (request) =>
          request.method === create.method &&
          new URL(request.url).pathname.endsWith(create.path),
      )
      .map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual(['app-org', 'second-org'])
  expect(
    boat.server.requests
      .filter(
        (request) =>
          request.method === deletion.method &&
          new URL(request.url).pathname.endsWith(deletion.path),
      )
      .map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual(['app-org', 'app-org', 'app-org'])
})

it('resumes an existing workspace on its stored account after the org switches', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat } = fixture
  await seedSecondaryOrgImage(fixture)
  const { id, sandboxId } = await seededCompletedWorkspace(fixture)
  await runtime.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind('boat-second', org.id)
    .run()
  await stopWorkspaceSandbox({
    env: runtime.env,
    dependencies: runtime.dependencies,
    orgId: org.id,
    workspaceId: id,
  })
  await runtime.workspace(id).lifecycleStopped()
  const requestCount = boat.server.requests.length
  expect(
    await fixture.run(() =>
      resumeCompletedWorkspace(runtime, org.id, id, user.id),
    ),
  ).toMatchObject({ workspace: { id, state: 'ready' } })
  expect(await readWorkspace(runtime.env.DB, org.id, id)).toMatchObject({
    providerAccount: 'boat',
    sandboxId,
  })
  expect(boat.starts).toHaveLength(1)
  expect(boat.resumeIds).toEqual([sandboxId])
  expect(
    new Set(
      boat.server.requests
        .slice(requestCount)
        .map((request) => request.headers.get('X-Boat-Org')),
    ),
  ).toEqual(new Set(['app-org']))
})
