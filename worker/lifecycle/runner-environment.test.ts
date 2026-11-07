import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { keepWorkspaceDisk } from './disk-retention'
import { FIRST_MESSAGE } from './durable-test-support'
import { seedPublishedImage } from './published-image-test-support'
import { workspaceEnvironment } from './settings-data'
import { runningEnvironment } from './start-environment'
import { resumeCompletedWorkspace as resumeWorkspace } from './completed-resume-test-support'

const backendFixture = setupBackendTests()

it('supplies each start its repository branch and encrypted computer endpoint without leaking the endpoint', async () => {
  const fixture = await backendFixture()
  const { runtime, org, user, boat } = fixture
  const initialMcp = 'https://computer.conductive.test/mcp?access=create-secret'
  const resumedMcp = 'https://computer.conductive.test/mcp?access=resume-secret'
  runtime.env.CONDUCTIVE_COMPUTER_MCP_URL = initialMcp
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
  boat.commandOutput = `configured ${initialMcp}\n`
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
      CONDUCTIVE_COMPUTER_MCP_URL: initialMcp,
    },
  })
  expect(JSON.stringify(created)).not.toContain(initialMcp)
  const actor = fixture.actors.get(id)?.endpoint()
  if (!actor) throw new Error('Missing workspace controller')
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'configured [hidden]\n'.repeat(3),
  )
  const captured = await runningEnvironment(runtime.env.DB, id)
  expect(captured).not.toContain(initialMcp)
  expect(await workspaceEnvironment(runtime.env, org.id, captured)).toEqual({
    CONDUCTIVE_COMPUTER_MCP_URL: initialMcp,
  })

  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  await runtime.env.DB.prepare(
    'UPDATE repositories SET default_branch = ? WHERE id = ?',
  )
    .bind('resume-main', fixture.repositoryId)
    .run()
  runtime.env.CONDUCTIVE_COMPUTER_MCP_URL = resumedMcp
  boat.commandOutput = `configured ${resumedMcp}\n`
  const resumed = await fixture.run(() =>
    resumeWorkspace(runtime, org.id, id, user.id),
  )
  expect(resumes).toHaveLength(1)
  const request: unknown = await resumes[0].json()
  expect(request).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      CONDUCTIVE_COMPUTER_MCP_URL: resumedMcp,
      CONDUCTIVE_DISK_KEEPALIVE: '0',
    },
  })
  expect(JSON.stringify(resumed)).not.toContain(resumedMcp)
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'configured [hidden]\n',
  )
  const secrets = await fixture.actors
    .get(id)
    ?.storage.get('text', 'lifecycle:start-secrets')
  expect(secrets).not.toContain(resumedMcp)

  await actor.lifecycleStopped()
  runtime.env.CONDUCTIVE_COMPUTER_MCP_URL =
    'https://computer.conductive.test/mcp?access=rotated-secret'
  await fixture.run(() => resumeWorkspace(runtime, org.id, id, user.id))
  expect(resumes).toHaveLength(1)
  expect((await actor.readLifecycleStartLog()).text).toBe(
    'configured [hidden]\n',
  )

  await actor.lifecycleStopped()
  boat.states.set('bx_1', 'archived')
  runtime.env.CONDUCTIVE_COMPUTER_MCP_URL = resumedMcp
  expect(
    await keepWorkspaceDisk({
      env: runtime.env,
      dependencies: runtime.dependencies,
      orgId: org.id,
      workspaceId: id,
    }),
  ).toBe(false)
  expect(resumes).toHaveLength(2)
  const retention: unknown = await resumes[1].json()
  expect(retention).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'resume-main',
      CONDUCTIVE_COMPUTER_MCP_URL: resumedMcp,
      CONDUCTIVE_DISK_KEEPALIVE: '1',
    },
  })
})
