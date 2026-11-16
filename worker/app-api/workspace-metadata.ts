import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { readWorkspace } from '../lifecycle/workspace-data'
import { requireShellWriter } from './feature-shell-access'
import {
  shellSectionExists,
  readWorkspaceMove,
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
  const moving = input.sectionId !== undefined || input.position !== undefined
  const move = moving
    ? await readWorkspaceMove(env.DB, orgId, workspaceId)
    : undefined
  if (move?.nested) {
    if (input.name === undefined) return
    input.sectionId = undefined
    input.position = undefined
  }
  if (keepCurrentSection && input.sectionId === current.sectionId) return
  const binding = workspaceBinding(env)
  if (
    !(await updateShellWorkspace(
      env.DB,
      {
        ...input,
        orgId,
        userId,
        workspaceId,
        now: dependencies.now(),
      },
      move,
    ))
  ) {
    await requireShellWriter(env.DB, orgId, userId)
    requireWritableWorkspace(await readWorkspace(env.DB, orgId, workspaceId))
    throw sectionNotFound()
  }
  await Promise.all(
    (move && !move.nested ? move.workspaceIds : [workspaceId]).map((id) =>
      binding.getByName(id).publishWorkspaceMetadata(orgId, id),
    ),
  )
}

function sectionNotFound(): HttpError {
  return new HttpError(
    404,
    'section_not_found',
    'The section is not available.',
  )
}
