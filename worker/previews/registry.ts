import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { AuthorizationBatch } from './authorization'
import { PreviewConnection } from './connection'
import { activePreview, type PreviewRecord } from './store'
import type { ToolDependencies } from './types'

class PreviewScope {
  readonly row: PreviewRecord
  private readonly authorization: AuthorizationBatch
  private readonly connections = new Set<PreviewConnection>()
  private closed = false
  private readonly empty: () => void

  constructor(
    env: AppEnv,
    dependencies: ToolDependencies,
    row: PreviewRecord,
    empty: () => void,
  ) {
    this.row = row
    this.empty = empty
    this.authorization = new AuthorizationBatch(async () => {
      const current = this.closed
        ? null
        : await activePreview(env.DB, row.hostname, dependencies.now())
      if (
        !current ||
        this.closed ||
        current.id !== row.id ||
        current.sandboxId !== row.sandboxId ||
        current.expiresAt <= dependencies.now()
      ) {
        this.close()
        throw new HttpError(
          404,
          'preview_not_found',
          'The preview is not available.',
        )
      }
    })
  }

  authorize = () => this.authorization.check()

  connect(): PreviewConnection {
    const connection = new PreviewConnection(this.authorize, () => {
      this.connections.delete(connection)
      if (this.connections.size === 0) this.empty()
    })
    this.connections.add(connection)
    if (this.closed) connection.close()
    return connection
  }

  close(): void {
    this.closed = true
    for (const connection of this.connections) connection.close()
  }
}

/** Every cancellation starts with the authorized workspace, then its preview. */
export class PreviewRegistry {
  private readonly scopes = new Map<string, Map<string, PreviewScope>>()
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies

  constructor(env: AppEnv, dependencies: ToolDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  get(row: PreviewRecord): PreviewScope {
    let workspace = this.scopes.get(row.workspaceId)
    if (!workspace) {
      workspace = new Map()
      this.scopes.set(row.workspaceId, workspace)
    }
    let scope = workspace.get(row.id)
    if (!scope || scope.row.sandboxId !== row.sandboxId) {
      scope?.close()
      scope = new PreviewScope(this.env, this.dependencies, row, () => {
        workspace?.delete(row.id)
        if (workspace?.size === 0) this.scopes.delete(row.workspaceId)
      })
      this.scopes.set(row.workspaceId, workspace)
      workspace.set(row.id, scope)
    }
    return scope
  }

  closePreview(workspaceId: string, previewId: string): void {
    const workspace = this.scopes.get(workspaceId)
    workspace?.get(previewId)?.close()
    workspace?.delete(previewId)
  }

  closeWorkspace(workspaceId: string): void {
    for (const scope of this.scopes.get(workspaceId)?.values() ?? [])
      scope.close()
    this.scopes.delete(workspaceId)
  }

  expire(): void {
    for (const [workspaceId, workspace] of this.scopes) {
      for (const [id, scope] of workspace)
        if (scope.row.expiresAt <= this.dependencies.now())
          this.closePreview(workspaceId, id)
    }
  }
}
