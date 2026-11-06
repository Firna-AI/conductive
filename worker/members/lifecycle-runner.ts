import type { AppDependencies, AppEnv } from '../env'
import { cleanupBusy, keepCleanupLease } from './cleanup-lease'
import type { LifecycleOwnership } from './lifecycle-contract'
import {
  claimLifecycleGeneration,
  lifecycleOwnershipCurrent,
  renewLifecycleLease,
} from './lifecycle-data'

/** All mutating lifecycle callbacks receive a new durable generation and a call-scoped renewal capability. */
export async function runLifecycleHook<T>(
  env: AppEnv,
  orgId: string,
  token: string,
  dependencies: AppDependencies,
  action: (ownership: LifecycleOwnership) => Promise<T>,
): Promise<{ generation: number; value: T }> {
  await keepCleanupLease(env, orgId, token, dependencies)
  const generation = await claimLifecycleGeneration(
    env.DB,
    orgId,
    token,
    dependencies.now(),
  )
  if (generation === null) throw cleanupBusy()
  let open = true
  const ownership: LifecycleOwnership = Object.freeze({
    orgId,
    generation,
    async renew() {
      if (
        !open ||
        !(await renewLifecycleLease(
          env.DB,
          orgId,
          token,
          generation,
          dependencies.now(),
        ))
      ) {
        throw cleanupBusy()
      }
    },
  })
  let value: T
  try {
    value = await action(ownership)
  } finally {
    open = false
  }
  if (
    !(await lifecycleOwnershipCurrent(
      env.DB,
      orgId,
      token,
      generation,
      dependencies.now(),
    ))
  )
    throw cleanupBusy()
  return { generation, value }
}
