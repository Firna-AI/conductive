import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { requireCreationParent } from '../lifecycle/creation-parent'
import { workspaceRuntime } from '../lifecycle/runtime'
import { readWorkspace } from '../lifecycle/workspace-data'
import { requireShellWriter } from './feature-shell-access'
import {
  shellSectionExists,
  writeShellWorkspace,
} from './feature-workspaces-data'
import { requireWritableWorkspace, workspaceBinding } from './workspace-state'
import {
  writeWorkspaceParentChange,
  type WorkspaceParentTarget,
} from './workspace-parent-change-data'

export async function changeWorkspaceMetadata(
  env: AppEnv,
  dependencies: AppDependencies,
  orgId: string,
  userId: string,
  workspaceId: string,
  readInput: () => {
    name?: string
    sectionId?: string
    position?: number
    target?: WorkspaceParentTarget
  },
  keepCurrentSection = false,
): Promise<void> {
  await requireShellWriter(env.DB, orgId, userId)
  const current = await readWorkspace(env.DB, orgId, workspaceId)
  requireWritableWorkspace(current)
  const input = readInput()
  if (input.target?.kind === 'parent')
    await requireCreationParent(
      workspaceRuntime(env, dependencies),
      orgId,
      input.target.id,
    )
  if (
    input.sectionId !== undefined &&
    !(await shellSectionExists(env.DB, orgId, input.sectionId))
  )
    throw sectionNotFound()
  const binding = workspaceBinding(env)
  const writeInput = {
    ...input,
    orgId,
    userId,
    workspaceId,
    keepCurrentSection,
    now: dependencies.now(),
  }
  const result =
    input.target === undefined
      ? await writeShellWorkspace(env.DB, writeInput)
      : await writeWorkspaceParentChange(env.DB, {
          ...writeInput,
          target: input.target,
        })
  if (!result.updated) {
    await requireShellWriter(env.DB, orgId, userId)
    requireWritableWorkspace(await readWorkspace(env.DB, orgId, workspaceId))
    throw sectionNotFound()
  }
  await Promise.all(
    result.workspaceIds.map((id) =>
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
