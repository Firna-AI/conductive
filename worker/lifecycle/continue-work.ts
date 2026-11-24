import type { LocalWork } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { machineChannel } from '../machines/channel'
import { workspaceMachineOwner } from '../machines/client'
import { verifyTarget } from '../previews/access'
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
  await verifyTarget(
    env,
    {
      orgId: row.orgId,
      workspaceId: row.id,
      sandboxId: row.sandboxId,
      providerAccount: row.providerAccount,
      state: row.state,
    },
    userId,
    false,
  )
  const result = await machineChannel(
    env,
    workspaceMachineOwner(row.orgId, row.id),
    provider,
    row.sandboxId,
  ).runCommand(localWorkCommand(directory))
  if (result.exitCode !== 0 || result.timedOut) throw localWorkUnavailable()
  await requireOrgMember(env.DB, orgId, userId)
  return localWorkResult(result.stdout)
}
