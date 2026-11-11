import { membersPath } from '../../src/shared/members'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import { sectionsPath } from '../../src/shared/sections'
import { workspaceViewPath } from '../../src/shared/workspace-view'
import { workspacePaths, workspacesPath } from '../../src/shared/workspaces'
import { counter } from '../chat/inputs'
import type { AppDependencies, AppEnv } from '../env'
import { readWorkspace, workspaceView } from '../lifecycle/workspace-data'
import { listMembers } from '../members/membership'
import type { RequestContext } from '../security/gate'
import { workspaceRoutine } from '../routines/workspace-routine-data'
import {
  saveWorkspaceReadMark,
  shellRepositories,
  shellSections,
  shellWorkspaces,
} from './shell-data'
import { workspaceChildId } from './workspace-path'
import {
  requireWritableWorkspace,
  workspaceBinding,
  workspaceForViewer,
} from './workspace-state'
import {
  savedWorkspaceView,
  saveWorkspaceView,
  workspaceViewInput,
} from './workspace-view'

export async function shellRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const userId = context.user.id
  const path = new URL(request.url).pathname
  if (request.method === 'GET') {
    if (path === sectionsPath(orgId))
      return Response.json({
        sections: await shellSections(env.DB, orgId, userId),
      })
    if (path === orgSettingsPaths.repositories(orgId))
      return Response.json({
        repositories: await shellRepositories(env.DB, orgId),
      })
    if (path === membersPath(orgId))
      return Response.json(await listMembers(env.DB, orgId, userId))
    if (path === workspacesPath(orgId)) {
      const rows = await shellWorkspaces(env.DB, orgId, userId)
      return Response.json({
        workspaces: await Promise.all(
          rows.map((row) =>
            workspaceForViewer(
              env,
              userId,
              workspaceView(row, env.APP_ORIGIN),
              row.readThroughEventNumber,
            ),
          ),
        ),
      })
    }
  }
  const workspaceId = workspaceChildId(path, orgId)
  if (!workspaceId) return null
  const viewPath = workspaceViewPath(orgId, workspaceId)
  const readPath = workspacePaths.read(orgId, workspaceId)
  if (path !== viewPath && path !== readPath) return null
  const workspace = await readWorkspace(env.DB, orgId, workspaceId)
  if (path === viewPath && request.method === 'GET')
    return Response.json({
      view: await savedWorkspaceView(env.DB, workspaceId, userId),
      routine: await workspaceRoutine(env.DB, orgId, workspaceId),
      baseBranch: workspace.baseBranch,
    })
  if (path === viewPath && request.method === 'PUT') {
    requireWritableWorkspace(workspace)
    const view = workspaceViewInput(context.body)
    await saveWorkspaceView(env.DB, {
      workspaceId,
      orgId,
      userId,
      view,
      now: dependencies.now(),
    })
    return Response.json({
      view,
      routine: await workspaceRoutine(env.DB, orgId, workspaceId),
      baseBranch: workspace.baseBranch,
    })
  }
  if (path === readPath && request.method === 'PUT') {
    requireWritableWorkspace(workspace)
    const requested = counter(context.body?.throughEventNumber)
    const summary = await workspaceBinding(env)
      .getByName(workspaceId, { locationHint: 'weur' })
      .readChatWorkspaceSummary()
    await saveWorkspaceReadMark(env.DB, {
      workspaceId,
      orgId,
      userId,
      throughEventNumber: Math.min(requested, summary.throughEventNumber),
      now: dependencies.now(),
    })
    return new Response(null, { status: 204 })
  }
  return null
}
