import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { BRANCH_NOT_FOUND_EXIT_CODE } from './existing-branch-command'
import { createWorkspaceInput } from './request-parser'
import { resumeCompletedWorkspace } from './completed-resume-test-support'
import { createWorkspace } from './workspaces'

const backendFixture = setupBackendTests()

it('keeps an existing branch through request parsing, saved create replay, and native start serialization', async () => {
  const fixture = backendFixture()
  const input = createWorkspaceInput({
    repositoryId: fixture.repositoryId,
    branch: { type: 'existing', name: 'feature/continued' },
    firstMessage: FIRST_MESSAGE,
  })
  const created = await fixture.run(() =>
    createCompletedWorkspace(
      fixture.runtime,
      fixture.org.id,
      fixture.user,
      input,
    ),
  )
  expect(created.workspace.branch).toBe('feature/continued')
  const repeated = await fixture.run(() =>
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      ...input,
      branch: { type: 'existing', name: 'another-branch' },
    }),
  )
  expect(repeated.workspace.id).toBe(created.workspace.id)
  expect(repeated.workspace.branch).toBe('feature/continued')
  expect(
    fixture.starts.get(created.workspace.id)?.lastAccepted(),
  ).toMatchObject({
    defaultBranch: 'main',
    creation: { branch: 'feature/continued', branchMode: 'existing' },
  })
  expect(fixture.boat.starts[0]).toMatchObject({
    env: {
      CONDUCTIVE_DEFAULT_BRANCH: 'main',
      CONDUCTIVE_WORKSPACE_BRANCH: 'feature/continued',
    },
  })
  const shared = await fixture.run(() =>
    createCompletedWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      ...input,
      firstMessage: { ...FIRST_MESSAGE, id: 'second-first-message' },
    }),
  )
  expect(shared.workspace.branch).toBe('feature/continued')
  expect(shared.workspace.id).not.toBe(created.workspace.id)
})

it('retains accepted messages after a missing branch and retries the saved branch after restart', async () => {
  const fixture = backendFixture()
  fixture.boat.commandExitCode = BRANCH_NOT_FOUND_EXIT_CODE
  const created = await fixture.run(() =>
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      branch: { type: 'existing', name: 'feature/restored' },
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const endpoint = fixture.runtime.workspace(created.workspace.id)
  const start = fixture.starts.get(created.workspace.id)
  if (!start) throw new Error('Missing workspace start')
  for (let step = 0; step < 12 && (await start.job()); step++)
    await start.advance()
  const result = await endpoint.waitCreationLifecycle()
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'branch_not_found',
      message: expect.stringContaining('feature/restored'),
    },
  })
  expect(await endpoint.waitCreationAdmission()).toMatchObject({
    ok: true,
    created: { first: { request: FIRST_MESSAGE } },
  })
  await fixture.starts.get(created.workspace.id)?.restart()
  fixture.boat.commandExitCode = 0
  await fixture.run(() =>
    resumeCompletedWorkspace(
      fixture.runtime,
      fixture.org.id,
      created.workspace.id,
      fixture.user.id,
    ),
  )
  expect(
    fixture.starts.get(created.workspace.id)?.lastAccepted(),
  ).toMatchObject({
    creation: { branch: 'feature/restored', branchMode: 'existing' },
  })
  expect(await endpoint.waitCreationAdmission()).toMatchObject({
    ok: true,
    created: { first: { request: FIRST_MESSAGE } },
  })
  expect(fixture.boat.starts).toHaveLength(2)
})

it('allows a direct existing-default-branch request and keeps transport errors distinct from missing branches', async () => {
  const fixture = backendFixture()
  fixture.boat.commandExitCode = 128
  const created = await fixture.run(() =>
    createWorkspace(
      fixture.runtime,
      fixture.org.id,
      fixture.user,
      createWorkspaceInput({
        repositoryId: fixture.repositoryId,
        branch: { type: 'existing', name: 'main' },
        firstMessage: FIRST_MESSAGE,
      }),
    ),
  )
  expect(created.workspace.branch).toBe('main')
  const start = fixture.starts.get(created.workspace.id)
  if (!start) throw new Error('Missing workspace start')
  for (let step = 0; step < 12 && (await start.job()); step++)
    await start.advance()
  expect(
    await fixture.runtime
      .workspace(created.workspace.id)
      .waitCreationLifecycle(),
  ).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
})
