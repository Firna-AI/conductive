import { expect, it } from 'vitest'

import type { WorkspaceValues } from './platform-storage'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { readRetention } from './retention-data'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'
import { workspaceEnvironmentSettings } from './settings-data'
import { runningEnvironment } from './start-environment'
import { readWorkspace } from './workspace-data'
import { resumeCompletedWorkspace as resumeWorkspace } from './completed-resume-test-support'
import {
  saveEnvironment,
  saveOwnerDisplayName,
} from './runner-environment-test-support'

const backendFixture = setupBackendTests()

it('captures the create branch and masks legacy encrypted settings in its streamed start log', async () => {
  const fixture = await backendFixture()
  const { runtime, org, user, boat } = fixture
  const initialSecret = 'create-environment-secret'
  await saveOwnerDisplayName(fixture, '  Octocat \t')
  await saveEnvironment(fixture, initialSecret, false, {
    GIT_AUTHOR_NAME: 'Org Author',
  })
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
  expect.soft(boat.starts[0]).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'release-main',
      CONDUCTIVE_WORKSPACE_BRANCH: created.workspace.branch,
      ORG_SECRET: initialSecret,
      GIT_AUTHOR_NAME: 'Octocat',
      GIT_AUTHOR_EMAIL: '7+octocat@users.noreply.github.com',
      GIT_COMMITTER_NAME: 'Octocat',
      GIT_COMMITTER_EMAIL: '7+octocat@users.noreply.github.com',
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
  ).toEqual({
    ORG_SECRET: { value: initialSecret, secret: true },
    GIT_AUTHOR_NAME: { value: 'Org Author', secret: true },
  })
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
  await saveOwnerDisplayName(fixture, '  Updated Owner  ')
  const workspace = await readWorkspace(runtime.env.DB, org.id, id)
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
  expect.soft(request).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      CONDUCTIVE_WORKSPACE_BRANCH: workspace.branch,
      ORG_SECRET: resumedSecret,
      PUBLIC_MODE: 'production',
      PUBLIC_FLAG: '1',
      SHORT_SECRET: 'a',
      CONDUCTIVE_DISK_KEEPALIVE: '0',
      GIT_AUTHOR_NAME: 'Updated Owner',
      GIT_AUTHOR_EMAIL: '7+octocat@users.noreply.github.com',
      GIT_COMMITTER_NAME: 'Updated Owner',
      GIT_COMMITTER_EMAIL: '7+octocat@users.noreply.github.com',
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
  expect.soft(retention).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      CONDUCTIVE_WORKSPACE_BRANCH: workspace.branch,
      ORG_SECRET: retentionSecret,
      CONDUCTIVE_DISK_KEEPALIVE: '1',
      GIT_AUTHOR_NAME: 'Updated Owner',
      GIT_AUTHOR_EMAIL: '7+octocat@users.noreply.github.com',
      GIT_COMMITTER_NAME: 'Updated Owner',
      GIT_COMMITTER_EMAIL: '7+octocat@users.noreply.github.com',
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

it.each([
  { kind: 'null', displayName: null },
  { kind: 'only disallowed characters', displayName: ' \t\u0001,:;<>"\\\'\n' },
])(
  'uses the owner login when the display name is $kind',
  async ({ displayName }) => {
    const fixture = await backendFixture()
    const { runtime, org, user, boat } = fixture
    await saveOwnerDisplayName(fixture, displayName)
    await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    expect(boat.starts[0]).toMatchObject({
      env: {
        GIT_AUTHOR_NAME: 'octocat',
        GIT_AUTHOR_EMAIL: '7+octocat@users.noreply.github.com',
        GIT_COMMITTER_NAME: 'octocat',
        GIT_COMMITTER_EMAIL: '7+octocat@users.noreply.github.com',
      },
    })
  },
)
