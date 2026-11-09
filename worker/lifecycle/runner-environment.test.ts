import { expect, it } from 'vitest'

import { encrypt } from '../security/crypto'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
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

it('supplies each start its repository branch and encrypted org settings without leaking their values', async () => {
  const fixture = await backendFixture()
  const { runtime, org, user, boat } = fixture
  const initialSecret = 'create-environment-secret'
  const resumedSecret = 'resume-environment-secret'
  const saveEnvironment = async (secret: string, classified = true) => {
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
  }
  await saveEnvironment(initialSecret, false)
  const resumes: Request[] = []
  runtime.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/resume'))
      resumes.push(request.clone())
    return boat.fetch(request)
  }
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
      CONDUCTIVE_WORKSPACE_BRANCH: created.workspace.branch,
      ORG_SECRET: initialSecret,
    },
  })
  expect(JSON.stringify(created)).not.toContain(initialSecret)
  const actor = fixture.actors.get(id)?.endpoint()
  if (!actor) throw new Error('Missing workspace controller')
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'configured [hidden]\n'.repeat(3),
  )
  const captured = await runningEnvironment(runtime.env.DB, id)
  expect(captured).not.toContain(initialSecret)
  expect(
    await workspaceEnvironmentSettings(runtime.env, org.id, captured),
  ).toEqual({ ORG_SECRET: { value: initialSecret, secret: true } })

  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  await runtime.env.DB.prepare(
    'UPDATE repositories SET default_branch = ? WHERE id = ?',
  )
    .bind('resume-main', fixture.repositoryId)
    .run()
  await saveEnvironment(resumedSecret)
  boat.commandOutput = `settings ${resumedSecret} production 1 a\n`
  const resumed = await fixture.run(() =>
    resumeWorkspace(runtime, org.id, id, user.id),
  )
  expect(resumes).toHaveLength(1)
  const request: unknown = await resumes[0].json()
  expect(request).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      CONDUCTIVE_WORKSPACE_BRANCH: created.workspace.branch,
      ORG_SECRET: resumedSecret,
      PUBLIC_MODE: 'production',
      PUBLIC_FLAG: '1',
      SHORT_SECRET: 'a',
      CONDUCTIVE_DISK_KEEPALIVE: '0',
    },
  })
  expect(JSON.stringify(resumed)).not.toContain(resumedSecret)
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'settings [hidden] production 1 [hidden]\n',
  )
  const secrets = await fixture.actors
    .get(id)
    ?.storage.get('text', 'lifecycle:start-secrets')
  expect(secrets).not.toContain(resumedSecret)

  await actor.lifecycleStopped()
  await saveEnvironment('rotated-environment-secret')
  await fixture.run(() => resumeWorkspace(runtime, org.id, id, user.id))
  expect(resumes).toHaveLength(1)
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'settings [hidden] production 1 [hidden]\n',
  )

  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  const retentionSecret = 'retention-environment-secret'
  await saveEnvironment(retentionSecret)
  fixture.setTime(runtime.dependencies.now() + 1_123_200_000)
  await actor.alarm()
  expect(await readRetention(runtime.env.DB, id)).toEqual({
    phase: 'wait',
    error: null,
  })
  expect(resumes).toHaveLength(2)
  const retention: unknown = await resumes[1].json()
  expect(retention).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      CONDUCTIVE_WORKSPACE_BRANCH: created.workspace.branch,
      ORG_SECRET: retentionSecret,
      CONDUCTIVE_DISK_KEEPALIVE: '1',
    },
  })
  await saveEnvironment('rotated-after-retention')
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
