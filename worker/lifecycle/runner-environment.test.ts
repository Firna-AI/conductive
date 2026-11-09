import { expect, it } from 'vitest'

import type { WorkspaceValues } from './platform-storage'
import { encrypt } from '../security/crypto'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import {
  SOFTWARE,
  type backendFixture as createBackendFixture,
} from './backend-test-support'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { readRetention } from './retention-data'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'
import {
  orgEnvironmentContext,
  workspaceEnvironmentSettings,
} from './settings-data'
import { runningEnvironment } from './start-environment'
import { resumeCompletedWorkspace as resumeWorkspace } from './completed-resume-test-support'

const backendFixture = setupBackendTests()

async function saveEnvironment(
  fixture: Awaited<ReturnType<typeof createBackendFixture>>,
  secret: string,
  classified = true,
) {
  const { runtime, org } = fixture
  const ciphertext = await encrypt(
    JSON.stringify(
      classified
        ? {
            ORG_SECRET: { value: secret, secret: true },
            PUBLIC_MODE: { value: 'production', secret: false },
            PUBLIC_FLAG: { value: '1', secret: false },
            SHORT_SECRET: { value: 'a', secret: true },
          }
        : { ORG_SECRET: secret },
    ),
    orgEnvironmentContext(org.id),
    runtime.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await runtime.env.DB.prepare(
    'UPDATE settings SET env_vars_ciphertext = ? WHERE org_id = ?',
  )
    .bind(ciphertext, org.id)
    .run()
  return ciphertext
}

it('captures the create branch and masks legacy encrypted settings in its streamed start log', async () => {
  const fixture = await backendFixture()
  const { runtime, org, user, boat } = fixture
  const initialSecret = 'create-environment-secret'
  await saveEnvironment(fixture, initialSecret, false)
  await seedPublishedImage(runtime.env.DB, {
    orgId: org.id,
    buildId: 'configured-runtime-image',
    imageName: 'configured-runtime-image',
    repositories: [
      {
        id: fixture.repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'release-main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME,
  })
  boat.commandOutput = `configured ${initialSecret}\n`
  boat.statusChunkSize = 17
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  expect(boat.starts[0]).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'release-main',
      ORG_SECRET: initialSecret,
    },
  })
  expect(JSON.stringify(created)).not.toContain(initialSecret)
  const actor = fixture.actors.get(id)?.endpoint()
  if (!actor) throw new Error('Missing workspace controller')
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'configured [hidden]\n'.repeat(4),
  )
  const captured = await runningEnvironment(runtime.env.DB, id)
  expect(captured).not.toContain(initialSecret)
  expect(
    await workspaceEnvironmentSettings(runtime.env, org.id, captured),
  ).toEqual({ ORG_SECRET: { value: initialSecret, secret: true } })
})

it('captures fresh resume settings, preserves the ready computer capture, and pins retention settings after rotation', async () => {
  const fixture = await backendFixture()
  const { runtime, org, user, boat } = fixture
  const initialSecret = 'create-environment-secret'
  const resumedSecret = 'resume-environment-secret'
  const environmentCiphertext = await saveEnvironment(
    fixture,
    initialSecret,
    false,
  )
  const { id, actor: platform } = await seededCompletedWorkspace(fixture, {
    environmentCiphertext,
  })
  const actor = platform.endpoint()
  const resumes: Request[] = []
  runtime.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/resume'))
      resumes.push(request.clone())
    return boat.fetch(request)
  }
  boat.statusChunkSize = 17
  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  await runtime.env.DB.prepare(
    'UPDATE repositories SET default_branch = ? WHERE id = ?',
  )
    .bind('resume-main', fixture.repositoryId)
    .run()
  await saveEnvironment(fixture, resumedSecret)
  boat.commandOutput = `settings ${resumedSecret} production 1 a\n`
  const resumed = await fixture.run(() =>
    resumeWorkspace(runtime, org.id, id, user.id),
  )
  expect(resumes).toHaveLength(1)
  const request: unknown = await resumes[0].json()
  expect(request).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      ORG_SECRET: resumedSecret,
      PUBLIC_MODE: 'production',
      PUBLIC_FLAG: '1',
      SHORT_SECRET: 'a',
      CONDUCTIVE_DISK_KEEPALIVE: '0',
    },
  })
  expect(JSON.stringify(resumed)).not.toContain(resumedSecret)
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'settings [hidden] production 1 [hidden]\n'.repeat(2),
  )
  const secrets = await fixture.actors
    .get(id)
    ?.storage.get<WorkspaceValues['text']>('lifecycle:start-secrets')
  expect(secrets).not.toContain(resumedSecret)

  await actor.lifecycleStopped()
  await saveEnvironment(fixture, 'rotated-environment-secret')
  await fixture.run(() => resumeWorkspace(runtime, org.id, id, user.id))
  expect(resumes).toHaveLength(1)
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'settings [hidden] production 1 [hidden]\n'.repeat(2),
  )

  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  const retentionSecret = 'retention-environment-secret'
  await saveEnvironment(fixture, retentionSecret)
  await fixture.setTime(runtime.dependencies.now() + 1_123_200_000)
  await fixture.advanceTo(runtime.dependencies.now(), id)
  expect(await readRetention(runtime.env.DB, id)).toEqual({
    phase: 'wait',
    error: null,
  })
  expect(resumes).toHaveLength(2)
  const retention: unknown = await resumes[1].json()
  expect(retention).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      ORG_SECRET: retentionSecret,
      CONDUCTIVE_DISK_KEEPALIVE: '1',
    },
  })
  await saveEnvironment(fixture, 'rotated-after-retention')
  expect(
    await workspaceEnvironmentSettings(
      runtime.env,
      org.id,
      await runningEnvironment(runtime.env.DB, id),
    ),
  ).toEqual({
    ORG_SECRET: { value: retentionSecret, secret: true },
    PUBLIC_MODE: { value: 'production', secret: false },
    PUBLIC_FLAG: { value: '1', secret: false },
    SHORT_SECRET: { value: 'a', secret: true },
  })
})
