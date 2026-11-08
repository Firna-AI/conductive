import { expect, it } from 'vitest'

import { encrypt } from '../security/crypto'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { keepWorkspaceDisk } from './disk-retention'
import { startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'
import { orgEnvironmentContext } from './settings-data'
import { readWorkspace } from './workspace-data'
import { workspaceRepositoryLocations } from './repository-location-data'
import { resumeCompletedWorkspace as resumeWorkspace } from './completed-resume-test-support'

const fixtureForTest = setupBackendTests()

it('keeps the workspace image folder map at resume and retention after a later selection changes name collisions', async () => {
  const fixture = fixtureForTest()
  const { runtime, images, org, user, repositoryId, boat } = fixture
  await runtime.env.DB.prepare(
    "UPDATE repositories SET full_name = 'acme/storefront' WHERE id = ?",
  )
    .bind(repositoryId)
    .run()
  const saveEnvironment = async (secret: string) => {
    const ciphertext = await encrypt(
      JSON.stringify({
        APP_SECRET: secret,
        CONDUCTIVE_REPOSITORY_DIR: '/wrong-current',
        CONDUCTIVE_REPOSITORY_STOREFRONT_DIR: '/wrong-repository',
      }),
      orgEnvironmentContext(org.id),
      runtime.env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await runtime.env.DB.prepare(
      'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
    )
      .bind(ciphertext, org.id)
      .run()
  }
  await saveEnvironment('first-secret')
  await finishImageBuild(
    fixture,
    await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    }),
  )
  expect(boat.starts[0].env).toEqual({
    CONDUCTIVE_REPOSITORY_STOREFRONT_DIR: '/home/user/code/storefront',
  })
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const captured = [
    {
      repositoryId,
      directory: '/home/user/code/storefront',
      variable: 'CONDUCTIVE_REPOSITORY_STOREFRONT_DIR',
    },
  ]
  expect(await workspaceRepositoryLocations(runtime.env.DB, id)).toEqual(
    captured,
  )
  expect(boat.starts[1]).toMatchObject({
    env: {
      APP_SECRET: 'first-secret',
      CONDUCTIVE_REPOSITORY_DIR: '/home/user/code/storefront',
      CONDUCTIVE_REPOSITORY_STOREFRONT_DIR: '/home/user/code/storefront',
    },
  })
  const row = await readWorkspace(runtime.env.DB, org.id, id)
  if (!row.sandboxId) throw new Error('Missing workspace sandbox')
  const resumedEnvironments: Record<string, string>[] = []
  const requests = boat.fetch
  runtime.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/resume')) {
      const payload: unknown = await request.clone().json()
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('env' in payload) ||
        typeof payload.env !== 'object' ||
        payload.env === null
      )
        throw new Error('Missing resume environment')
      const environment: Record<string, string> = {}
      for (const [name, value] of Object.entries(payload.env)) {
        if (typeof value !== 'string')
          throw new Error('Invalid resume variable')
        environment[name] = value
      }
      resumedEnvironments.push(environment)
    }
    return requests(request)
  }
  await runtime.env.DB.prepare(
    "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('collision-repository', ?, 2, 'other/storefront', 'main')",
  )
    .bind(org.id)
    .run()
  await finishImageBuild(
    fixture,
    await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: SOFTWARE,
    }),
  )
  expect(fixture.sourceCalls.at(-1)?.repositoryLocations).toEqual([
    {
      repositoryId: 'collision-repository',
      directory: '/home/user/code/other-storefront',
      variable: 'CONDUCTIVE_REPOSITORY_OTHER_STOREFRONT_DIR',
    },
    {
      repositoryId,
      directory: '/home/user/code/acme-storefront',
      variable: 'CONDUCTIVE_REPOSITORY_ACME_STOREFRONT_DIR',
    },
  ])
  expect(await workspaceRepositoryLocations(runtime.env.DB, id)).toEqual(
    captured,
  )
  await saveEnvironment('fresh-secret')
  boat.states.set(row.sandboxId, 'archived')
  await runtime.workspace(id).lifecycleStopped()
  await fixture.run(() => resumeWorkspace(runtime, org.id, id, user.id))
  expect(resumedEnvironments[0]).toMatchObject({
    APP_SECRET: 'fresh-secret',
    CONDUCTIVE_REPOSITORY_DIR: '/home/user/code/storefront',
    CONDUCTIVE_REPOSITORY_STOREFRONT_DIR: '/home/user/code/storefront',
    CONDUCTIVE_DISK_KEEPALIVE: '0',
  })
  boat.states.set(row.sandboxId, 'archived')
  await runtime.workspace(id).lifecycleStopped()
  await keepWorkspaceDisk({
    env: runtime.env,
    dependencies: runtime.dependencies,
    orgId: org.id,
    workspaceId: id,
  })
  expect(resumedEnvironments[1]).toMatchObject({
    APP_SECRET: 'fresh-secret',
    CONDUCTIVE_REPOSITORY_DIR: '/home/user/code/storefront',
    CONDUCTIVE_REPOSITORY_STOREFRONT_DIR: '/home/user/code/storefront',
    CONDUCTIVE_DISK_KEEPALIVE: '1',
  })
  expect(
    await runtime.env.DB.prepare(
      'SELECT repository_locations_json FROM workspace_runtime WHERE workspace_id = ?',
    )
      .bind(id)
      .first('repository_locations_json'),
  ).toBe(JSON.stringify(captured))
})
