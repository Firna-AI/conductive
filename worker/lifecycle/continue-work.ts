import type { LocalWork } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { orgProviderForAccount } from '../sandbox/client'
import { requireOrgMember } from './access'
import {
  localWorkCommand,
  localWorkResult,
  localWorkUnavailable,
} from './local-work'
import { workspaceRepositoryLocations } from './repository-location-data'
import { repositoryLocation } from './repository-locations'
import { readWorkspace } from './workspace-data'

export async function readContinueWork(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  id: string,
  userId: string,
): Promise<LocalWork> {
  await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, id)
  if (!row.sandboxId) return { uncommittedFiles: [], unpushedCommits: 0 }
  const directory = repositoryLocation(
    await workspaceRepositoryLocations(env.DB, id),
    row.repositoryId,
  )
  const provider = await orgProviderForAccount(
    env,
    userId,
    orgId,
    dependencies.fetch,
    row.providerAccount,
  )
  const result = await provider.runCommand(
    row.sandboxId,
    localWorkCommand(directory),
  )
  if (result.exitCode !== 0 || result.timedOut) throw localWorkUnavailable()
  await requireOrgMember(env.DB, orgId, userId)
  return localWorkResult(result.stdout)
}
