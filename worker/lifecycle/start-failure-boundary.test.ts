import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'

const fixtureForTest = setupBackendTests()
const error = {
  code: 'workspace_start_failed',
  message: 'The cloud computer could not start. Try again.',
  log: null,
}

it.each(['before the first step', 'after the last step'] as const)(
  'marks an admitted first start as failed %s without marking later sandbox errors as failed creates',
  async (boundary) => {
    const fixture = fixtureForTest()
    const { runtime, org, user, repositoryId } = fixture
    const created = await fixture.run(() =>
      createWorkspace(runtime, org.id, user, {
        repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const endpoint = runtime.workspace(created.workspace.id)
    if (boundary === 'after the last step')
      await endpoint.lifecycleStep(
        'image',
        'Starting from the newest image',
        'completed',
      )
    await endpoint.lifecycleFailed(error)
    expect(await endpoint.readLifecycle()).toMatchObject({
      state: 'error',
      error,
      start: {
        kind: 'create',
        steps: expect.arrayContaining([
          expect.objectContaining({ state: 'failed' }),
        ]),
      },
    })
    const ready = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId,
        firstMessage: { ...FIRST_MESSAGE, id: 'later-workspace' },
      }),
    )
    const running = runtime.workspace(ready.workspace.id)
    await running.lifecycleFailed(error)
    expect(
      (await running.readLifecycle())?.start?.steps.some(
        (step) => step.state === 'failed',
      ),
    ).toBe(false)
  },
)
