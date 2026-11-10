import {
  workspacePaths,
  type ArchiveCheckResponse,
} from '../../src/shared/workspaces'
import { workspaceBinding } from './workspace-state'
import { workspaceChildId } from './workspace-path'
import type { RequestContext } from '../security/gate'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { orgProviderForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { repositoryLocation } from '../lifecycle/repository-locations'
import { workspaceRepositoryLocations } from '../lifecycle/repository-location-data'
import { shellQuote } from '../lifecycle/commands'
import { requireFeatureResult } from '../features/result'
import { requireOrgMember } from '../lifecycle/access'
import { readWorkspace } from '../lifecycle/workspace-data'

export async function readArchiveCheck(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  id: string,
  userId: string,
): Promise<ArchiveCheckResponse> {
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
  const result = await provider
    .runCommand(
      row.sandboxId,
      `set -eu\ncd ${shellQuote(directory)}\ngit status --porcelain=v1 -z\nprintf '\\0'\ngit rev-list --count HEAD --not --remotes`,
    )
    .catch((error: unknown) => {
      if (error instanceof ProviderError) throw checkUnavailable()
      throw error
    })
  if (result.exitCode !== 0 || result.timedOut) throw checkUnavailable()
  const separator = result.stdout.lastIndexOf('\0')
  const count = result.stdout.slice(separator + 1).trim()
  if (
    separator < 0 ||
    !/^\d+$/.test(count) ||
    !Number.isSafeInteger(Number(count))
  )
    throw checkUnavailable()
  const records = result.stdout.slice(0, separator).split('\0').filter(Boolean)
  const uncommittedFiles: string[] = []
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (record.length < 4 || record[2] !== ' ') throw checkUnavailable()
    uncommittedFiles.push(record.slice(3))
    if (record.slice(0, 2).includes('R') || record.slice(0, 2).includes('C'))
      index++
  }
  await requireOrgMember(env.DB, orgId, userId)
  return { uncommittedFiles, unpushedCommits: Number(count) }
}

export async function archiveRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const id = workspaceChildId(path, orgId)
  if (!id) return null
  const check =
    path === workspacePaths.archiveCheck(orgId, id) && request.method === 'GET'
  const archive =
    path === workspacePaths.archive(orgId, id) && request.method === 'POST'
  const restore =
    path === workspacePaths.restore(orgId, id) && request.method === 'POST'
  if (!check && !archive && !restore) return null
  const object = workspaceBinding(env).getByName(id)
  return Response.json(
    check
      ? requireFeatureResult(
          await object.checkWorkspaceArchive(orgId, id, context.user.id),
        )
      : restore
        ? requireFeatureResult(
            await object.restoreWorkspace(
              orgId,
              id,
              context.user.id,
              env.APP_ORIGIN,
            ),
          )
        : requireFeatureResult(
            await object.archiveWorkspace(
              orgId,
              id,
              context.user.id,
              context.body?.discardUnpushedWork === true,
              env.APP_ORIGIN,
            ),
          ),
  )
}

function checkUnavailable() {
  return new HttpError(
    409,
    'sandbox_unavailable',
    'Open the workspace to check its saved work. Then try again.',
  )
}
