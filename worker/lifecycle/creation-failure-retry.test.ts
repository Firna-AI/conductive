import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { heldOperation } from './platform-test-storage'
import type { ProvisionedWorkspace } from './workspace-response'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('releases the failed claim before its public error and admits a fresh retry while provider cleanup is pending', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, boat, repositoryId } = fixture
  const input = { repositoryId, firstMessage: FIRST_MESSAGE }
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  const id = created.workspace.id
  expect(await fixture.nextQueued()).toBe(id)
  const actor = fixture.starts.get(id)
  const platform = fixture.actors.get(id)
  if (!actor || !platform) throw new Error('Missing failed actor')
  const deletion = heldOperation()
  const original = runtime.dependencies.fetch
  runtime.dependencies.fetch = async (request) => {
    if (request.method === 'DELETE') await deletion.wait()
    return original(request)
  }
  const publication = heldOperation()
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
    await publication.wait()
  })
  boat.commandExitCode = 1
  const failure = (async () => {
    for (let step = 0; step < 16 && (await actor.job()); step++)
      await actor.advance()
    return runtime.workspace(id).waitCreationLifecycle()
  })()
  void failure.catch(() => {})
  await publication.entered
  try {
    expect(observed).toEqual({ claim: 'failed', publicRows: 1, cleanupRows: 1 })
    const queued = fixture.nextQueued()
    const retry: Promise<ProvisionedWorkspace> = createWorkspace(
      runtime,
      org.id,
      user,
      input,
    )
    void retry.catch(() => {})
    const retryId = await queued
    expect(retryId).not.toBe(id)
    const next = fixture.starts.get(retryId)
    if (!next) throw new Error('Missing retry actor')
    await next.advance()
    expect(await next.job()).toMatchObject({ phase: 'records' })
    expect(
      await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces',
      ).first('count'),
    ).toBe(1)
    publication.release()
    await deletion.entered
    await next.advance()
    expect((await retry).workspace.id).toBe(retryId)
    expect(
      await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces WHERE id = ?',
      )
        .bind(id)
        .first('count'),
    ).toBe(0)
    expect(
      await runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspace_tokens',
      ).first('count'),
    ).toBe(1)
  } finally {
    publication.release()
    deletion.release()
    await failure
  }
  expect(await failure).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  expect((await fixture.failedCreation(id))?.request).toEqual(FIRST_MESSAGE)
})
