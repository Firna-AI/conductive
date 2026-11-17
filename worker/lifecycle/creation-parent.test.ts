import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import {
  observeNestedCreation,
  pendingParent,
} from './creation-parent-pending.test-support'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()

it('waits for a pending parent admission before starting a nested create', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const pending = await pendingParent(fixture)
  const observed = observeNestedCreation(fixture, pending.id)
  const child = createWorkspace(observed.runtime, org.id, user, {
    repositoryId,
    parentId: pending.id,
    firstMessage: { ...FIRST_MESSAGE, id: 'child-message' },
  })
  void child.catch(() => undefined)
  try {
    expect(await Promise.race([observed.stage(), child])).toBe(
      'parent admission',
    )
    expect(
      await runtime.env.DB.prepare('SELECT id FROM workspaces').all(),
    ).toMatchObject({ results: [{ id: pending.id }] })
    pending.admission.release()
    await pending.advancing
    expect((await pending.parent).workspace.id).toBe(pending.id)
    const created = await fixture.run(() => child)
    expect(created.workspace).toMatchObject({ parentId: pending.id })
    expect(
      await pending.actor.endpoint().readCreationLifecycleResult(),
    ).toBeUndefined()
  } finally {
    pending.admission.release()
    observed.release()
    await pending.advancing
  }
})

it('returns parent 404 when a pending create fails and finishes its provisional cleanup', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const pending = await pendingParent(fixture)
  const observed = observeNestedCreation(fixture, pending.id)
  const child = createWorkspace(observed.runtime, org.id, user, {
    repositoryId,
    parentId: pending.id,
    firstMessage: { ...FIRST_MESSAGE, id: 'child-message' },
  })
  void child.catch(() => undefined)
  try {
    expect(await Promise.race([observed.stage(), child])).toBe(
      'parent admission',
    )
    await runtime.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(user.id)
      .run()
    pending.admission.release()
    await pending.advancing
    await expect(pending.parent).rejects.toMatchObject({
      code: 'agent_login_required',
    })
    await expect(child).rejects.toMatchObject({
      status: 404,
      code: 'workspace_not_found',
      message: 'The parent workspace is not available.',
    })
    expect(
      await pending.actor.endpoint().readCreationLifecycleResult(),
    ).toMatchObject({
      ok: false,
      error: { code: 'agent_login_required' },
    })
    expect((await pending.actor.checkpoint()).job).toBeUndefined()
    expect(
      await runtime.env.DB.prepare('SELECT id FROM workspaces').all(),
    ).toMatchObject({ results: [] })
  } finally {
    pending.admission.release()
    observed.release()
    await pending.advancing
  }
})

it('creates beneath an admitted parent after its first start fails', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const parent = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const actor = fixture.starts.get(parent.workspace.id)
  if (!actor) throw new Error('The admitted parent is missing.')
  fixture.boat.commandExitCode = 1
  for (let step = 0; step < 16 && (await actor.job()); step++)
    await actor.advance()
  expect(
    await runtime.workspace(parent.workspace.id).readCreationLifecycleResult(),
  ).toMatchObject({
    ok: false,
    error: { code: 'workspace_start_failed' },
  })
  await expect(
    fixture.run(() =>
      createWorkspace(runtime, org.id, user, {
        repositoryId,
        parentId: parent.workspace.id,
        firstMessage: { ...FIRST_MESSAGE, id: 'child-message' },
      }),
    ),
  ).resolves.toMatchObject({ workspace: { parentId: parent.workspace.id } })
})

it('keeps the parent and section notice through admission restart and replay', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user, repositoryId } = fixture
  const db = runtime.env.DB
  const generalId = await db
    .prepare('SELECT id FROM sections WHERE org_id = ? AND is_default = 1')
    .bind(org.id)
    .first<string>('id')
  if (!generalId) throw new Error('The default section is missing.')
  await db.batch([
    db
      .prepare(
        "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('parent-section', ?, 'Parent', 1, 0, 1)",
      )
      .bind(org.id),
    db
      .prepare(
        `INSERT INTO workspaces
       (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at)
       VALUES ('parent', ?, ?, ?, 'parent-section', 'Parent', 'owner/parent', 'archived', 1, 1)`,
      )
      .bind(org.id, repositoryId, user.id),
  ])
  const input = {
    repositoryId,
    parentId: 'parent',
    sectionId: generalId,
    firstMessage: FIRST_MESSAGE,
  }
  const admitted = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, input),
  )
  expect(admitted).toMatchObject({
    workspace: { parentId: 'parent', sectionId: 'parent-section' },
    notice: 'The workspace joined the section of its parent.',
  })
  const id = admitted.workspace.id
  expect(
    await db
      .prepare(
        'SELECT parent_workspace_id AS parentId FROM workspace_creation_plans WHERE workspace_id = ?',
      )
      .bind(id)
      .first(),
  ).toEqual({ parentId: 'parent' })
  const actor = fixture.starts.get(id)
  if (!actor) throw new Error('The admitted workspace is missing.')
  await actor.restart()
  const repeated = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      ...input,
      parentId: 'unknown-parent',
      sectionId: 'unknown-section',
    }),
  )
  expect(repeated.workspace).toMatchObject({
    id,
    parentId: 'parent',
    sectionId: 'parent-section',
  })
  expect(repeated.notice).toBe(
    'The workspace joined the section of its parent.',
  )
  expect(repeated.first).toEqual(admitted.first)
  expect(
    await db.prepare('SELECT COUNT(*) AS count FROM workspaces').first('count'),
  ).toBe(2)
  expect(fixture.boat.starts).toEqual([])
})
