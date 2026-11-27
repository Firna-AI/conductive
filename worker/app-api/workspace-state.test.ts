import { expect, it } from 'vitest'

import type { AppEnv } from '../env'
import type { ChatWorkspaceSummary } from '../chat/workspace-summary'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import { createWorkspace } from '../lifecycle/workspaces'
import { workspaceForViewer } from './workspace-state'

const fixtureForTest = setupBackendTests()
type Fixture = ReturnType<typeof fixtureForTest>

async function startingWorkspace(fixture: Fixture) {
  const { runtime, org, user, repositoryId } = fixture
  const created = await fixture.run(() =>
    createWorkspace(runtime, org.id, user, {
      repositoryId,
      firstMessage: { ...FIRST_MESSAGE, id: 'waiting-message' },
    }),
  )
  const row = await readWorkspace(runtime.env.DB, org.id, created.workspace.id)
  expect(row.state).toBe('starting')
  return workspaceView(row, runtime.env.APP_ORIGIN)
}

/**
 * The binding of an object that runs the code from before the change: its
 * summary has no answer about a waiting message.
 */
function olderObjects(env: AppEnv): AppEnv {
  const namespace = env.WORKSPACES
  if (!namespace) throw new Error('The workspace binding is missing.')
  const older = async (): Promise<ChatWorkspaceSummary> => ({
    throughEventNumber: 0,
    lastOutputEventNumber: 0,
    working: false,
  })
  return {
    ...env,
    WORKSPACES: new Proxy(namespace, {
      get(target, property) {
        if (property === 'getByName')
          return (id: string) =>
            new Proxy(target.getByName(id), {
              get(endpoint, key) {
                if (key === 'readChatWorkspaceSummary') return older
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
}

it('says that the first message of a starting workspace waits', async () => {
  const fixture = fixtureForTest()
  const workspace = await startingWorkspace(fixture)
  const viewed = await workspaceForViewer(
    fixture.runtime.env,
    fixture.user.id,
    workspace,
  )
  expect(viewed).toMatchObject({ state: 'starting', messageWaiting: true })
})

it('reads no waiting message from an object that runs older code', async () => {
  const fixture = fixtureForTest()
  const workspace = await startingWorkspace(fixture)
  const viewed = await workspaceForViewer(
    olderObjects(fixture.runtime.env),
    fixture.user.id,
    workspace,
  )
  expect(viewed).toMatchObject({ state: 'starting', messageWaiting: false })
})

it('adds no answer for a workspace that does not start', async () => {
  const fixture = fixtureForTest()
  const workspace = await startingWorkspace(fixture)
  const viewed = await workspaceForViewer(
    fixture.runtime.env,
    fixture.user.id,
    { ...workspace, state: 'stopped' },
  )
  expect(viewed).not.toHaveProperty('messageWaiting')
})
