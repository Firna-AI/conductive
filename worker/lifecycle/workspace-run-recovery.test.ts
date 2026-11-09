import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { IDLE_MS } from './durable-types'
import { workspaceTaskAlarms } from './workspace-task-alarms'

const fixtureForTest = setupBackendTests()

it.each([
  { label: 'a due run lease', leaseAfter: 0, changedAfter: null },
  {
    label: 'a future lease and due state retry',
    leaseAfter: 30_000,
    changedAfter: 0,
  },
] as const)(
  'runs idle lifecycle work from $label',
  async ({ leaseAfter, changedAfter }) => {
    const fixture = fixtureForTest()
    const { runtime, org, user, boat } = fixture
    const created = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const id = created.workspace.id
    const actor = fixture.actors.get(id)
    if (!actor) throw new Error('Missing workspace controller')
    const state = await actor.endpoint().readLifecycle()
    if (!state) throw new Error('Missing workspace lifecycle')
    const now = state.lastActivityAt + IDLE_MS
    const alarms = workspaceTaskAlarms(actor.storage)
    await alarms.set('lifecycle', null)
    await alarms.set(
      'lifecycle:changed',
      changedAfter === null ? null : now + changedAfter,
    )
    await actor.storage.put('number', 'alarm:lifecycle:run', now + leaseAfter)
    await alarms.schedule()

    await fixture.advanceTo(now, id)

    expect(boat.stopIds).toEqual(['bx_1'])
    expect(await actor.endpoint().readLifecycle()).toMatchObject({
      state: 'stopped',
      runnerConnected: false,
    })
    expect(
      await actor.storage.get('number', 'alarm:lifecycle:run'),
    ).toBeUndefined()
  },
)
