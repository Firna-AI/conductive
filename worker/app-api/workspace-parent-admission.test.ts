import { expect, it } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { pendingParent } from '../lifecycle/creation-parent-pending.test-support'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { readWorkspace } from '../lifecycle/workspace-data'
import { createWorkspace } from '../lifecycle/workspaces'
import { heldOperation } from '../test-support/held-operation'
import { changeWorkspaceMetadata } from './workspace-metadata'

const fixtureForTest = setupBackendTests()
type Fixture = ReturnType<typeof fixtureForTest>

async function existingWorkspace(fixture: Fixture) {
  const { runtime, org, user, repositoryId } = fixture
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: { ...FIRST_MESSAGE, id: 'moving-message' },
    }),
  )
  expect(await fixture.nextQueued()).toBe(created.workspace.id)
  return created.workspace.id
}

function observeParentAdmission(fixture: Fixture, parentId: string) {
  const reached = heldOperation()
  const { runtime } = fixture
  const namespace = runtime.env.WORKSPACES
  if (!namespace) throw new Error('The workspace binding is missing.')
  const env = {
    ...runtime.env,
    WORKSPACES: new Proxy(namespace, {
      get(target, property) {
        if (property === 'getByName')
          return (id: string) =>
            new Proxy(target.getByName(id), {
              get(endpoint, key) {
                if (key === 'waitCreationAdmission' && id === parentId)
                  return (timeout?: number) => {
                    void reached.wait()
                    return runtime.workspace(id).waitCreationAdmission(timeout)
                  }
                const value: unknown = Reflect.get(endpoint, key)
                return typeof value === 'function'
                  ? value.bind(endpoint)
                  : value
              },
            })
        const value: unknown = Reflect.get(target, property)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }),
  }
  return { env, entered: reached.entered, release: reached.release }
}

it('waits for parent admission before moving an existing workspace under it', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user } = fixture
  const id = await existingWorkspace(fixture)
  const pending = await pendingParent(fixture)
  const observed = observeParentAdmission(fixture, pending.id)
  const moving = changeWorkspaceMetadata(
    observed.env,
    runtime.dependencies,
    org.id,
    user.id,
    id,
    () => ({ target: { kind: 'parent', id: pending.id } }),
  )
  void moving.catch(() => undefined)
  try {
    expect(
      await Promise.race([
        observed.entered.then(() => 'parent admission'),
        moving.then(() => 'moved'),
      ]),
    ).toBe('parent admission')
    expect(await readWorkspace(runtime.env.DB, org.id, id)).toMatchObject({
      parentId: null,
    })
    pending.admission.release()
    await pending.advancing
    expect((await pending.parent).workspace.id).toBe(pending.id)
    await moving
    expect(await readWorkspace(runtime.env.DB, org.id, id)).toMatchObject({
      parentId: pending.id,
    })
  } finally {
    pending.admission.release()
    observed.release()
    await pending.advancing
  }
})

it('finishes failed-parent cleanup without moving the existing workspace', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, user } = fixture
  const id = await existingWorkspace(fixture)
  const pending = await pendingParent(fixture)
  const observed = observeParentAdmission(fixture, pending.id)
  const moving = changeWorkspaceMetadata(
    observed.env,
    runtime.dependencies,
    org.id,
    user.id,
    id,
    () => ({ target: { kind: 'parent', id: pending.id } }),
  )
  void moving.catch(() => undefined)
  try {
    expect(
      await Promise.race([
        observed.entered.then(() => 'parent admission'),
        moving.then(() => 'moved'),
      ]),
    ).toBe('parent admission')
    await runtime.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
      .bind(user.id)
      .run()
    pending.admission.release()
    await pending.advancing
    await expect(pending.parent).rejects.toMatchObject({
      code: 'agent_login_required',
    })
    await expect(moving).rejects.toMatchObject({
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
    ).toMatchObject({ results: [{ id }] })
    expect(await readWorkspace(runtime.env.DB, org.id, id)).toMatchObject({
      parentId: null,
    })
  } finally {
    pending.admission.release()
    observed.release()
    await pending.advancing
  }
})
