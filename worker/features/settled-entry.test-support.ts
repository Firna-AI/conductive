import type { AppEnv } from '../env'
import checkpoint from './checkpoint-entry.test-support'

export { Workspace } from './checkpoint-entry.test-support'

/**
 * The checkpoint entry, but each answer waits for the background work that
 * its request handed to `waitUntil`. A test then reads a settled state once,
 * with no polling: a value that a request writes later is there, and a
 * value that it does not write stays as it was.
 */
export default {
  ...checkpoint,
  async fetch(
    request: Request,
    env: AppEnv,
    execution: ExecutionContext,
  ): Promise<Response> {
    const pending: Promise<unknown>[] = []
    const settled = {
      waitUntil: (promise: Promise<unknown>) => {
        pending.push(promise)
        execution.waitUntil(promise)
      },
    }
    const response = await checkpoint.fetch(request, env, settled)
    await Promise.allSettled(pending)
    return response
  },
}
