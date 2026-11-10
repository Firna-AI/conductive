import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { IDLE_MS } from './durable-types'
import { createCompletedWorkspace } from './completed-creation-test-support'

const backendFixture = setupBackendTests()

it.each([
  { native: 'archived', refused: true, expected: 'stopped', reads: 1 },
  { native: 'error', refused: true, expected: 'error', reads: 1 },
  { native: 'ready', refused: false, expected: 'ready', reads: 0 },
] as const)(
  'uses confirmed $native state for idle stop when refusal is $refused',
  async ({ native, refused, expected, reads }) => {
    const fixture = await backendFixture()
    const { runtime, org, user, boat } = fixture
    const created = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing workspace controller')
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    boat.states.set('bx_1', native)
    boat.stopReplyState = native
    boat.failStop = refused
    const readCount = boat.sandboxReads.length
    await fixture.setTime(runtime.dependencies.now() + IDLE_MS)
    await actor.advance()
    expect(await actor.readLifecycle()).toMatchObject({
      state: expected,
      runningSessions: [],
    })
    expect(boat.sandboxReads.slice(readCount)).toEqual(
      reads === 0 ? [] : ['bx_1'],
    )
    expect(boat.stopIds).toEqual(['bx_1'])
    expect(boat.resumeIds).toEqual([])
    expect(boat.deletedIds).toEqual([])
  },
)
