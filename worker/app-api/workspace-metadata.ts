import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { readWorkspace } from '../lifecycle/workspace-data'
import { requireShellWriter } from './feature-shell-access'
import {
  shellSectionExists,
  updateShellWorkspace,
} from './feature-workspaces-data'
import { requireWritableWorkspace, workspaceBinding } from './workspace-state'

export async function changeWorkspaceMetadata(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  workspaceId: string,
  readInput: () => { name?: string; sectionId?: string; position?: number },
  keepCurrentSection = false,
): Promise<void> {
  await requireShellWriter(env.DB, orgId, userId)
  const current = await readWorkspace(env.DB, orgId, workspaceId)
  requireWritableWorkspace(current)
  const input = readInput()
  if (
    input.sectionId !== undefined &&
    !(await shellSectionExists(env.DB, orgId, input.sectionId))
  )
    throw sectionNotFound()
  if (keepCurrentSection && input.sectionId === current.sectionId) return
  const binding = workspaceBinding(env).getByName(workspaceId)
  if (
    !(await updateShellWorkspace(env.DB, {
      ...input,
      orgId,
      userId,
      workspaceId,
      now: dependencies.now(),
    }))
  ) {
    await requireShellWriter(env.DB, orgId, userId)
    requireWritableWorkspace(await readWorkspace(env.DB, orgId, workspaceId))
    throw sectionNotFound()
  }
  await binding.publishWorkspaceMetadata(orgId, workspaceId)
}

function sectionNotFound(): HttpError {
  return new HttpError(
    404,
    'section_not_found',
    'The section is not available.',
  )
}
