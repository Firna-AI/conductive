import { boatRoute } from '../sandbox/routes'
import type { backendFixture } from './backend-test-support'
import type { BackendActor } from './backend-test-platform'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
} from './durable-types'

export function captureAppStopDispatches(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  actor: BackendActor,
  sandboxId: string,
) {
  const fetch = fixture.runtime.dependencies.fetch
  const stop = boatRoute({ operation: 'stop', sandboxId })
  const intents: (DurableLifecycleState | undefined)[] = []
  fixture.runtime.dependencies.fetch = async (request) => {
    if (
      request.method === stop.method &&
      new URL(request.url).pathname.endsWith(stop.path)
    )
      intents.push(await actor.storage.get(LIFECYCLE_STATE_KEY))
    return fetch(request)
  }
  return intents
}
