import { requireFeatureResult } from '../features/result'
import type { backendFixture } from './backend-test-support'
import type { BackendActor } from './backend-test-platform'
import { seededCompletedWorkspace } from './backend-workspace.test-support'

export type ArchiveFixture = Awaited<ReturnType<typeof backendFixture>>

export function archiveActions(
  fixture: ArchiveFixture,
  id: string,
  actor: BackendActor,
) {
  return {
    archive: async () =>
      requireFeatureResult(
        await actor.native.api.lifecycleRpc.archiveWorkspace(
          fixture.org.id,
          id,
          fixture.user.id,
          fixture.runtime.env.APP_ORIGIN,
        ),
      ),
    restore: async (userId = fixture.user.id) =>
      actor.native.api.lifecycleRpc.restoreWorkspace(
        fixture.org.id,
        id,
        userId,
        fixture.runtime.env.APP_ORIGIN,
      ),
  }
}

export async function archiveFixture(fixture: ArchiveFixture, stopped = false) {
  const saved = await seededCompletedWorkspace(fixture)
  if (stopped) {
    fixture.boat.states.set(saved.sandboxId, 'archived')
    await saved.actor.endpoint().lifecycleStopped()
  }
  return { ...saved, ...archiveActions(fixture, saved.id, saved.actor) }
}
