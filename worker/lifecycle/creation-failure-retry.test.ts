import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { authenticateWorkspaceToken, readWorkspaceToken } from './tokens'
import { recordSandboxCleanup, retrySandboxCleanup } from './cleanup'
import { resumeWorkspace } from './workspace-resume'
import { createWorkspace } from './workspaces'
import { heldOperation } from './platform-test-storage'

const fixtureForTest = setupBackendTests()

it('keeps a retried create behind failed-computer cleanup and preserves the replacement token and identity', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, repositoryId } = fixture
  const input = { repositoryId, firstMessage: FIRST_MESSAGE }
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  const id = created.workspace.id
  const oldToken = await readWorkspaceToken(runtime.env, id)
  const start = fixture.starts.get(id)
  const platform = fixture.actors.get(id)
  if (!start || !platform) throw new Error('Missing start actor')
  let observed:
    { claim: unknown; publicRows: unknown; cleanupRows: unknown } | undefined
  platform.observePublication(async ({ event }) => {
    if (event.type !== 'workspace.updated' || event.workspace.state !== 'error')
      return
    observed = {
      claim: await runtime.env.DB.prepare(
        'SELECT state FROM workspace_creation_attempts WHERE workspace_id = ?',
      )
        .bind(id)
        .first('state'),
      publicRows: await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces WHERE id = ?',
      )
        .bind(id)
        .first('count'),
      cleanupRows: await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM lifecycle_sandbox_cleanup WHERE workspace_id = ?',
      )
        .bind(id)
        .first('count'),
    }
  })
  boat.commandExitCode = 1
  boat.deleteFailures = 2
  for (let step = 0; step < 16 && (await start.job()); step++)
    await start.advance()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  expect(observed).toEqual({ claim: 'failed', publicRows: 1, cleanupRows: 1 })
  expect(
    (await createWorkspace(runtime, org.id, user, input)).workspace,
  ).toMatchObject({ id, state: 'error' })
  expect(boat.starts).toHaveLength(1)
  await expect(
    authenticateWorkspaceToken(runtime.env, oldToken),
  ).rejects.toMatchObject({ code: 'workspace_token_refused' })

  start.restart()
  const paused = heldOperation()
  const workspace = runtime.workspace
  let reads = 0
  runtime.workspace = (workspaceId) => {
    const endpoint = workspace(workspaceId)
    return {
      ...endpoint,
      readCreationLifecycleResult: async () => {
        const read = ++reads
        if (read === 1) await paused.wait()
        if (read === 2) return undefined
        return endpoint.readCreationLifecycleResult()
      },
    }
  }
  const staleCaller = resumeWorkspace(runtime, org.id, id, user.id)
  void staleCaller.catch(() => {})
  await paused.entered
  const retryCall = resumeWorkspace(runtime, org.id, id, user.id)
  try {
    await expect(retryCall).resolves.toMatchObject({
      workspace: { id, state: 'starting' },
    })
  } finally {
    paused.release()
    await staleCaller.catch(() => undefined)
    runtime.workspace = workspace
  }
  const retry = await retryCall
  await expect(staleCaller).resolves.toMatchObject({
    workspace: { id, state: 'starting' },
  })
  expect(retry.workspace).toMatchObject({
    id,
    branch: created.workspace.branch,
    repositoryId,
    state: 'starting',
  })
  expect(await start.job()).toMatchObject({ kind: 'create', phase: 'machine' })
  await start.advance()
  expect(boat.starts).toHaveLength(1)
  expect(boat.deletedIds).toEqual([])
  const joined = await resumeWorkspace(runtime, org.id, id, user.id)
  expect(joined.workspace.id).toBe(id)

  boat.commandExitCode = 0
  start.restart()
  for (let step = 0; step < 16 && (await start.job()); step++) {
    if ((await start.job())?.phase === 'runner')
      await fixture.actors
        .get(id)
        ?.endpoint()
        .reportRunnerLifecycle({ type: 'runner.ready' })
    await start.advance()
  }
  expect(await start.wait()).toEqual({ ok: true })
  expect(boat.deletedIds).toEqual(['bx_1'])
  expect(boat.starts).toHaveLength(2)
  const newToken = await readWorkspaceToken(runtime.env, id)
  expect(newToken).not.toBe(oldToken)
  expect(await authenticateWorkspaceToken(runtime.env, newToken)).toEqual({
    workspaceId: id,
    orgId: org.id,
  })
  expect(await retrySandboxCleanup(runtime.env, runtime.dependencies, id)).toBe(
    true,
  )
  expect(await readWorkspaceToken(runtime.env, id)).toBe(newToken)
  expect(boat.deletedIds).toEqual(['bx_1'])
  const repeated = await createWorkspace(runtime, org.id, user, input)
  expect(repeated.workspace).toMatchObject({
    id,
    branch: created.workspace.branch,
    repositoryId,
  })
  expect(repeated.first).toEqual(created.first)
})

it('keeps a later cleanup owner when an old delete completes for the same workspace', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId, boat } = fixture
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const deletion = heldOperation()
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = async (request) => {
    if (request.method === 'DELETE') await deletion.wait()
    return fetch(request)
  }
  boat.states.set('bx_old', 'ready')
  await recordSandboxCleanup(runtime.env.DB, {
    workspaceId: id,
    orgId: org.id,
    sandboxId: 'bx_old',
  })
  const pending = retrySandboxCleanup(runtime.env, runtime.dependencies, id)
  await deletion.entered
  const token = await readWorkspaceToken(runtime.env, id)
  try {
    await recordSandboxCleanup(runtime.env.DB, {
      workspaceId: id,
      orgId: org.id,
      sandboxId: 'bx_later',
    })
  } finally {
    deletion.release()
  }
  expect(await pending).toBe(true)
  expect(
    await runtime.env.DB.prepare(
      'SELECT sandbox_id AS sandboxId FROM lifecycle_sandbox_cleanup WHERE workspace_id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ sandboxId: 'bx_later' })
  expect(await readWorkspaceToken(runtime.env, id)).toBe(token)
  expect(boat.deletedIds).toEqual(['bx_old'])
})
