import { TEST_TIME } from '../test-support/harness'
import type { backendFixture } from './backend-test-support'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { readRetention } from './retention-data'

export async function retentionCommandFixture(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
  const { runtime, org, user } = fixture
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const platform = fixture.actors.get(id)
  if (!platform) throw new Error('Missing retention controller')
  fixture.setTime(TEST_TIME)
  fixture.boat.states.set('bx_1', 'archived')
  await platform.endpoint().lifecycleStopped()
  await fixture.advanceTo(TEST_TIME + 1_123_260_000, id)
  await fixture.advanceTo(TEST_TIME + 1_123_265_000, id)
  return {
    ...fixture,
    id,
    platform,
    progress: () => readRetention(runtime.env.DB, id),
    tick: async (at: number) => {
      await fixture.advanceTo(at, id)
    },
  }
}
