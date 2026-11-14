import type { Agent } from '../../src/shared/agents'
import { decryptAgentLogin } from '../chat/queries'
import type { AppDependencies, AppEnv } from '../env'
import {
  claimEndpointModelRead,
  saveEndpointModels,
} from './endpoint-model-data'
import { readEndpointModels } from './endpoint-models'

/** Refresh and dispatch read the saved base without changing the login. */
export async function refreshEndpointModels(
  env: AppEnv,
  userId: string,
  agent: Agent,
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  { background = false }: { background?: boolean } = {},
): Promise<boolean> {
  let modelListRead = false
  try {
    const read = await claimEndpointModelRead(
      env.DB,
      userId,
      agent,
      dependencies.now(),
      background,
    )
    if (!read) return false
    const login = await decryptAgentLogin(
      env,
      userId,
      { agent, kind: 'endpoint' },
      read.ciphertext,
    )
    if (login?.kind !== 'endpoint') return false
    const result = await readEndpointModels(
      login,
      dependencies.fetch,
      env.PREVIEW_DOMAIN ? [env.PREVIEW_DOMAIN] : [],
    )
    if (result.status !== 'ok') return false
    modelListRead = true
    await saveEndpointModels(env.DB, read, result.ids, dependencies.now())
  } catch {
    // A discovery failure never fails a Refresh or a turn.
  }
  return modelListRead
}
