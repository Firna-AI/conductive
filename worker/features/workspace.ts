import { FILE_READ_MAX_BYTES } from '../../src/shared/files'
import type { AppDependencies, AppEnv } from '../env'
import { createFilesHandler } from '../files/handlers'
import type { WorkspaceFiles } from '../files/workspace'
import { createDesktopHandler } from '../desktop/handler'
import { createTerminalHandler } from '../terminal/handler'
import { createPreviewHandler } from '../previews/handler'
import { workspaceRepositoryLocations } from '../lifecycle/repository-location-data'
import { repositoryLocation } from '../lifecycle/repository-locations'
import { toolSessionWorkspace } from '../tools/session-access'
import { toolUser } from '../tools/composition-data'
import type { ToolPreviewCall } from '../tools/services'
import { toolFailure, workspaceTarget } from '../previews/access'
import { HttpError } from '../http'
import { featureWorkspaceId } from './paths'
import { revokedWorkspacePreviews } from './preview-data'

export class WorkspaceFeatures {
  readonly previews: ReturnType<typeof createPreviewHandler>
  private readonly terminal: ReturnType<typeof createTerminalHandler>
  private readonly desktop: ReturnType<typeof createDesktopHandler>
  private readonly files: ReturnType<typeof createFilesHandler>
  private readonly env: AppEnv
  private readonly matches: (id: string) => boolean
  private readonly schedulePreview: (
    workspaceId: string,
    at: number | null,
  ) => Promise<void>
  private readonly publishPreviews: (
    workspaceId: string,
    ids: readonly string[],
    queueOwned: boolean,
  ) => Promise<void>

  constructor(
    env: AppEnv,
    dependencies: AppDependencies,
    files: WorkspaceFiles,
    matches: (id: string) => boolean,
    schedulePreview: (workspaceId: string, at: number | null) => Promise<void>,
    activity: (workspaceId: string, at: number) => void,
    publishPreviews: (
      workspaceId: string,
      ids: readonly string[],
      queueOwned: boolean,
    ) => Promise<void>,
  ) {
    this.env = env
    this.matches = matches
    this.schedulePreview = schedulePreview
    this.publishPreviews = publishPreviews
    const tools = { ...dependencies, onActivity: activity }
    this.previews = createPreviewHandler(env, tools)
    this.terminal = createTerminalHandler(env, tools)
    this.desktop = createDesktopHandler(env, tools)
    this.files = createFilesHandler({
      ...dependencies,
      maxFileBytes: FILE_READ_MAX_BYTES,
      workspaceFiles: () => files,
      repositoryRoot: async (workspace) =>
        repositoryLocation(
          await workspaceRepositoryLocations(env.DB, workspace.id),
          workspace.repositoryId,
        ),
    })
  }

  async fetch(request: Request): Promise<Response | null> {
    const path = new URL(request.url).pathname
    const workspaceId = featureWorkspaceId(path)
    if (!workspaceId) return null
    if (!this.matches(workspaceId))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    if (/\/terminal(?:\/socket)?$/.test(path))
      return this.terminal.fetch(request)
    if (path.endsWith('/desktop')) return this.desktop.fetch(request)
    if (/\/previews(?:\/[^/]+)?$/.test(path)) {
      const response = await this.previews.fetch(request)
      if (response.status < 400) await this.publishRevocations(workspaceId)
      await this.schedulePreview(
        workspaceId,
        await this.previews.nextExpiry(workspaceId),
      )
      return response
    }
    if (/\/github(?:\/.*)?$/.test(path)) return null
    return this.files(request, this.env)
  }

  async agentPreviews(input: ToolPreviewCall, origin: string) {
    if (!this.matches(input.workspaceId))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    const workspace = await toolSessionWorkspace(
      this.env.DB,
      input.orgId,
      input.workspaceId,
      origin,
    )
    if (input.kind !== 'list')
      await toolUser(this.env.DB, input.orgId, input.senderUserId)
    const target = await workspaceTarget(
      this.env,
      input.orgId,
      input.workspaceId,
      input.kind === 'list' ? undefined : input.senderUserId,
    )
    try {
      const result =
        input.kind === 'list'
          ? { previews: await this.previews.actions.list(target, origin) }
          : input.kind === 'open'
            ? {
                preview: await this.previews.actions.open(
                  target,
                  input.senderUserId,
                  input.port,
                  origin,
                ),
              }
            : {
                closed: await this.previews.actions.close(
                  target,
                  input.previewId,
                ),
              }
      await this.publishRevocations(input.workspaceId)
      return { workspace, ...result }
    } catch (error) {
      throw toolFailure(error)
    } finally {
      await this.schedulePreview(
        input.workspaceId,
        await this.previews.nextExpiry(input.workspaceId),
      )
    }
  }

  async publishRevocations(
    workspaceId: string,
    queueOwned = false,
  ): Promise<void> {
    const ids = await revokedWorkspacePreviews(this.env.DB, workspaceId)
    if (ids.length) await this.publishPreviews(workspaceId, ids, queueOwned)
  }

  async revokeWorkspace(
    workspaceId: string,
    queueOwned = false,
  ): Promise<void> {
    await this.previews.revokeWorkspace(workspaceId)
    await this.publishRevocations(workspaceId, queueOwned)
    await this.schedulePreview(
      workspaceId,
      await this.previews.nextExpiry(workspaceId),
    )
  }
}
