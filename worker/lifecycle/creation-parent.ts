import { HttpError } from '../http'
import { parentCreationState } from './creation-attempt-data'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import type { WorkspaceRuntime } from './workspace-runtime'

export async function requireCreationParent(
  runtime: WorkspaceRuntime,
  orgId: string,
  parentId: string | undefined,
): Promise<void> {
  if (parentId === undefined) return
  const parent = await parentCreationState(runtime.env.DB, orgId, parentId)
  if (parent && (parent.state === null || parent.state === 'succeeded')) return
  if (
    parent &&
    (await new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(
        () => resolve(false),
        WORKSPACE_START_TIME_LIMIT_MS,
      )
      void runtime
        .workspace(parentId)
        .waitCreationAdmission(WORKSPACE_START_TIME_LIMIT_MS)
        .then(
          (admission) => {
            clearTimeout(timer)
            resolve(admission.ok)
          },
          (error: unknown) => {
            clearTimeout(timer)
            reject(error)
          },
        )
    }))
  )
    return
  throw new HttpError(
    404,
    'workspace_not_found',
    'The parent workspace is not available.',
  )
}
