import type { AppDependencies } from '../env'
import { lifecycleDependencies } from '../lifecycle/runtime'
import { assertReceiverActive } from '../members/receiver-fence'

/**
 * The lifecycle dependencies of a workspace object, with the clock `now`
 * and a fetch that needs an active receiver of the queue generation of
 * `generation` before and after each request.
 */
export function fencedDependencies(
  storage: Pick<DurableObjectStorage, 'get'>,
  generation: () => number | undefined,
  now: () => number,
): AppDependencies {
  const original = lifecycleDependencies()
  return {
    ...original,
    now,
    fetch: async (request: Request) => {
      await assertReceiverActive(storage, generation())
      const response = await original.fetch(request)
      // An allocated resource must retain its returned ID before a suspension drains the phase.
      if (!(
        request.method === 'POST' &&
        new URL(request.url).pathname === '/api/v1/sandboxes'
      ))
        await assertReceiverActive(storage, generation())
      return response
    },
  }
}
