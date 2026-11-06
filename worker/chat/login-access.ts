import type { AppEnv } from '../env'
import { readAgentLogin, senderLoginAccess } from './queries'
import type { ChatDependencies } from './types'

/** This failure closes the runner and leaves its commands queued. */
export class RunnerAccessDenied extends Error {}

export function loginResolver(
  env: AppEnv,
  workspaceId: () => string | null,
  override?: ChatDependencies['resolveLogin'],
): ChatDependencies['resolveLogin'] {
  const read: ChatDependencies['resolveLogin'] =
    override ?? ((userId, agent) => readAgentLogin(env, userId, agent))
  return async (userId, agent, runnerTokenHash) => {
    const id = workspaceId()
    if (!id) return null
    const access = await senderLoginAccess(env.DB, id, userId, runnerTokenHash)
    if (runnerTokenHash !== undefined && !access.runnerAllowed)
      throw new RunnerAccessDenied()
    if (!access.senderAllowed) return null
    return read(userId, agent, runnerTokenHash)
  }
}
