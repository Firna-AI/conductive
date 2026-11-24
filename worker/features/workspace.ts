import { FILE_READ_MAX_BYTES } from '../../src/shared/files'
import type { AppDependencies, AppEnv } from '../env'
import { createFilesHandler } from '../files/handlers'
import { workspaceFileLists } from '../files/list-reads'
import type { WorkspaceFiles } from '../files/workspace'
import { createDesktopHandler } from '../desktop/handler'
import { createTerminalHandler } from '../terminal/handler'
import { WorkspaceTerminals } from '../terminal/workspace'
import { refreshWorkspaceTerminal } from '../terminal/refresh'
import type { WorkspaceTarget } from '../previews/types'
import type { WorkspaceChat } from '../chat/backend'
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
import { createServicesHandler } from '../services/handler'
import { createSkillHandler } from '../skills/handler'

export class WorkspaceFeatures {
  readonly previews: ReturnType<typeof createPreviewHandler>
  private readonly terminal: ReturnType<typeof createTerminalHandler>
  private readonly terminals: WorkspaceTerminals
  private readonly dependencies: AppDependencies
  private readonly desktop: ReturnType<typeof createDesktopHandler>
  private readonly files: ReturnType<typeof createFilesHandler>
  private readonly skills: ReturnType<typeof createSkillHandler>
  private readonly env: AppEnv
  private readonly services: ReturnType<typeof createServicesHandler>
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
    publishPreviews: (
      workspaceId: string,
      ids: readonly string[],
      queueOwned: boolean,
    ) => Promise<void>,
    chat: WorkspaceChat,
  ) {
    this.env = env
    this.services = createServicesHandler(
      env,
      chat.runner.services,
      dependencies.now,
    )
    this.dependencies = dependencies
    this.matches = matches
    this.schedulePreview = schedulePreview
    this.publishPreviews = publishPreviews
    const tools = {
      ...dependencies,
      fileServerAvailable: (workspaceId: string) => {
        const runner = chat.runner.connections.current
        return (
          runner?.state.workspace.id === workspaceId &&
          runner.state.fileServer === true
        )
      },
    }
    this.previews = createPreviewHandler(env, tools)
    this.terminals = new WorkspaceTerminals(chat)
    this.terminal = createTerminalHandler(env, tools, this.terminals)
    this.desktop = createDesktopHandler(env, tools)
    this.skills = createSkillHandler(env, chat, dependencies.now)
    this.files = createFilesHandler({
      ...dependencies,
      maxFileBytes: FILE_READ_MAX_BYTES,
      fileLists: workspaceFileLists(chat),
      workspaceFiles: () => files,
      repositoryRoot: async (workspace) =>
        repositoryLocation(
          await workspaceRepositoryLocations(env.DB, workspace.id),
          workspace.repositoryId,
        ),
    })
  }

  refreshTerminal(target: WorkspaceTarget): Promise<void> {
    if (!this.matches(target.workspaceId))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    return refreshWorkspaceTerminal(
      this.env,
      target,
      this.dependencies,
      this.terminals,
    )
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
    if (/\/services(?:\/.*)?$/.test(path)) return this.services(request)
    if (/\/terminal(?:\/.*)?$/.test(path)) return this.terminal.fetch(request)
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
    if (path.endsWith('/skills/content'))
      return this.skills(request, workspaceId)
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
