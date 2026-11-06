import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { orgSandboxProvider } from '../sandbox/keys'

/** Provider names appear only on the key screen, not on lifecycle screens. */
export async function lifecycleProvider(
  env: AppEnv,
  userId: string,
  orgId: string,
  fetch: HttpFetch,
) {
  try {
    return await orgSandboxProvider(env, userId, orgId, fetch)
  } catch (error) {
    if (error instanceof HttpError && error.code === 'boat_key_required')
      throw new HttpError(
        error.status,
        error.code,
        'Ask an org admin to add the cloud computer key.',
      )
    throw error
  }
}
