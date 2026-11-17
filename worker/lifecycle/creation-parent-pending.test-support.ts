import { heldOperation } from '../test-support/held-operation'
import type { backendFixture } from './backend-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import type { WorkspaceRuntime } from './workspace-runtime'
import { createWorkspace } from './workspaces'

type Fixture = Awaited<ReturnType<typeof backendFixture>>

export async function pendingParent(fixture: Fixture) {
  const { runtime, org, user, repositoryId } = fixture
  const parent = createWorkspace(runtime, org.id, user, {
    repositoryId,
    firstMessage: FIRST_MESSAGE,
  })
  void parent.catch(() => undefined)
  const id = await fixture.nextQueued()
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('The parent actor is missing.')
  const admission = await actor.holdFirstMessageLogin()
  const advancing = actor.advance()
  void advancing.catch(() => undefined)
  await admission.entered
  return { id, actor, parent, admission, advancing }
}

export function observeNestedCreation(fixture: Fixture, parentId: string) {
  const reached = heldOperation()
  let stage = ''
  const runtime: WorkspaceRuntime = {
    ...fixture.runtime,
    workspace: (id) => {
      const endpoint = fixture.runtime.workspace(id)
      return {
        ...endpoint,
        waitCreationAdmission: (...args) => {
          if (id === parentId) {
            stage = 'parent admission'
            void reached.wait()
          }
          return endpoint.waitCreationAdmission(...args)
        },
        queueLifecycleStart: async (...args) => {
          const result = await endpoint.queueLifecycleStart(...args)
          stage = 'child start'
          void reached.wait()
          return result
        },
      }
    },
  }
  return {
    runtime,
    stage: async () => {
      await reached.entered
      return stage
    },
    release: reached.release,
  }
}
