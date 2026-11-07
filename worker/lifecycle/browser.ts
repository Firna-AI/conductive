import type { UserMessage } from '../../src/shared/messages'
import {
  buildEventsPath,
  buildPath,
  orgSettingsPaths,
} from '../../src/shared/org-settings'
import {
  workspacePath,
  workspacePaths,
  workspacesPath,
  type CreateWorkspaceResponse,
} from '../../src/shared/workspaces'
import { privateResponse } from '../http'
import type { RequestContext } from '../security/gate'
import { requireOrgMember } from './access'
import { readBuild, readBuildHistory } from './build-data'
import { buildEventsResponse } from './build-stream'
import { startImageBuild, type ImageRuntime } from './image-builds'
import type { ImageSoftwareArtifact } from './image-software'
import { createWorkspaceInput } from './request-parser'
import { openWorkspace, resumeWorkspace } from './workspace-resume'
import { workspaceResponse } from './workspace-response'
import type {
  FirstWorkspaceMessage,
  WorkspaceRuntime,
} from './workspace-runtime'
import { createWorkspace } from './workspaces'

export interface LifecycleBrowserOptions {
  software: ImageSoftwareArtifact
  /** Milestone 7 stores this message/session and resolves real attachments. */
  acceptFirstMessage(first: FirstWorkspaceMessage): Promise<UserMessage>
  waitUntil(promise: Promise<unknown>): void
}

/** The browser gate must run first. Null lets the normal dispatcher continue. */
export async function handleLifecycleRequest(
  request: Request,
  context: RequestContext,
  runtime: WorkspaceRuntime & { images: ImageRuntime },
  options: LifecycleBrowserOptions,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  await requireOrgMember(runtime.env.DB, orgId, context.user.id)
  if (path === workspacesPath(orgId) && request.method === 'POST') {
    const provisioning = createWorkspace(
      runtime,
      orgId,
      context.user,
      createWorkspaceInput(context.body),
    )
    options.waitUntil(provisioning)
    const created = await provisioning
    const firstMessage = await options.acceptFirstMessage(created.first)
    const result: CreateWorkspaceResponse = {
      workspace: created.workspace,
      start: created.start,
      error: created.error,
      sessionId: created.first.sessionId,
      firstMessage,
    }
    return privateResponse(Response.json(result, { status: 201 }))
  }
  if (path === orgSettingsPaths.builds(orgId)) {
    if (request.method === 'GET')
      return privateResponse(
        Response.json(await readBuildHistory(runtime.env.DB, orgId)),
      )
    if (request.method === 'POST') {
      const id = await startImageBuild(runtime.images, {
        orgId,
        userId: context.user.id,
        kind: 'build',
        software: options.software,
      })
      return privateResponse(
        Response.json(await readBuild(runtime.env.DB, orgId, id), {
          status: 202,
        }),
      )
    }
  }
  if (path === orgSettingsPaths.refresh(orgId) && request.method === 'POST') {
    const id = await startImageBuild(runtime.images, {
      orgId,
      userId: context.user.id,
      kind: 'refresh',
      software: options.software,
    })
    return privateResponse(
      Response.json(await readBuild(runtime.env.DB, orgId, id), {
        status: 202,
      }),
    )
  }
  const buildId = path
    .slice(orgSettingsPaths.builds(orgId).length + 1)
    .split('/')[0]
  if (buildId && request.method === 'GET') {
    if (path === buildPath(orgId, buildId))
      return privateResponse(
        Response.json(await readBuild(runtime.env.DB, orgId, buildId)),
      )
    if (path === buildEventsPath(orgId, buildId)) {
      const after = Number(
        request.headers.get('Last-Event-ID') ??
          new URL(request.url).searchParams.get('after') ??
          '0',
      )
      return buildEventsResponse({
        env: runtime.env,
        orgId,
        userId: context.user.id,
        buildId,
        after: Number.isSafeInteger(after) && after >= 0 ? after : 0,
      })
    }
  }
  const workspaceId = path.slice(workspacesPath(orgId).length + 1).split('/')[0]
  if (!workspaceId) return null
  if (path === workspacePath(orgId, workspaceId) && request.method === 'GET')
    return privateResponse(
      Response.json(await workspaceResponse(runtime, orgId, workspaceId)),
    )
  if (
    path === workspacePaths.resume(orgId, workspaceId) &&
    request.method === 'POST'
  )
    return privateResponse(
      Response.json(
        await resumeWorkspace(runtime, orgId, workspaceId, context.user.id),
      ),
    )
  if (
    path === workspacePaths.open(orgId, workspaceId) &&
    request.method === 'POST'
  )
    return privateResponse(
      Response.json(
        await openWorkspace(
          runtime,
          orgId,
          workspaceId,
          context.user.id,
          runtime.dependencies.randomToken(),
        ),
      ),
    )
  if (
    path === workspacePaths.activity(orgId, workspaceId) &&
    request.method === 'POST'
  ) {
    await workspaceResponse(runtime, orgId, workspaceId)
    if (
      context.body?.source === 'input' ||
      context.body?.source === 'terminal' ||
      context.body?.source === 'preview'
    )
      await runtime.workspace(workspaceId).lifecycleActivity()
    return privateResponse(Response.json({}))
  }
  return null
}
