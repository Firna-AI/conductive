import type { AppEnv, HttpFetch } from '../../env'
import type { MembersHooks } from '../../members/route'
import type { LifecycleOwnership } from '../../members/lifecycle-contract'
import { cleanupOrgImageSources } from './cleanup'

/** Decorate the required lifecycle suspension hook before supplying it to Members. */
export function withImageSourceCleanup<
  Hooks extends Pick<MembersHooks, 'suspendOrg'>,
>(env: AppEnv, fetch: HttpFetch, hooks: Hooks): Hooks {
  return {
    ...hooks,
    async suspendOrg(
      orgId: string,
      workspaceIds: readonly string[],
      ownership: LifecycleOwnership,
    ) {
      if (ownership.orgId !== orgId)
        throw new Error('Image cleanup ownership changed')
      await ownership.renew()
      if (!(await cleanupOrgImageSources(env, fetch, orgId, ownership)))
        throw new Error('Image source access cleanup is pending')
      await hooks.suspendOrg(orgId, workspaceIds, ownership)
    },
  }
}
