import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { findFilesWorkspace, type FilesWorkspace } from './data'

/** Use only after the request gate has checked the org membership. */
export async function filesWorkspace(
  env: AppEnv,
  context: RequestContext,
  workspaceId: string,
): Promise<FilesWorkspace> {
  const orgId = context.org?.id
  const workspace =
    orgId && (await findFilesWorkspace(env.DB, orgId, workspaceId))
  if (!workspace)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  return workspace
}
