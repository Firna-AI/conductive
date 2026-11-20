import { nativeChatStore } from '../chat/native-store.test-support'
import type { WorkspaceEventEnvelope } from '../chat/workspace-events'
import { TEST_TIME } from '../test-support/harness'
import { inspectGitHubActor } from './native-fixture.test-support'

export async function nativeGitHubStore(workspaceId = 'workspace-1') {
  const fixture = await nativeChatStore(workspaceId, TEST_TIME)
  const publications: WorkspaceEventEnvelope[] = []
  const inspect = () =>
    inspectGitHubActor(fixture.actor, workspaceId, publications)
  return {
    ...fixture,
    state: fixture.actor.api.github,
    inspect,
    restart: async () => {
      await inspect()
      await fixture.actor.restart()
    },
  }
}
