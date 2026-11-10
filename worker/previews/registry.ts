import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { PreviewConnectionIdentity } from '../security/connection-access'
import { AuthorizationBatch } from './authorization'
import { PreviewConnection } from './connection'
import type { PreviewRecord } from './store'
import { readPreviewAccess } from './viewer-access'
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
    identity: PreviewConnectionIdentity,
    empty: () => void,
  ) {
    this.row = row
    this.empty = empty
    this.authorization = new AuthorizationBatch(async () => {
      const current = this.closed
        ? null
        : await readPreviewAccess(env, identity, dependencies.now())
      if (
        !current ||
        this.closed ||
        current.id !== row.id ||
        current.sandboxId !== row.sandboxId ||
        current.providerAccount !== row.providerAccount ||
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
  private readonly scopes = new Map<string, PreviewScope>()
  private readonly env: AppEnv
  private readonly dependencies: ToolDependencies

  constructor(env: AppEnv, dependencies: ToolDependencies) {
    this.env = env
    this.dependencies = dependencies
  }

  get(row: PreviewRecord, identity: PreviewConnectionIdentity): PreviewScope {
    const key = JSON.stringify([
      row.workspaceId,
      row.id,
      identity.userId,
      identity.sessionId,
      identity.expiresAt,
    ])
    let scope = this.scopes.get(key)
    if (
      !scope ||
      scope.row.sandboxId !== row.sandboxId ||
      scope.row.providerAccount !== row.providerAccount
    ) {
      scope?.close()
      scope = new PreviewScope(
        this.env,
        this.dependencies,
        row,
        identity,
        () => {
          if (this.scopes.get(key) === scope) this.scopes.delete(key)
        },
      )
      this.scopes.set(key, scope)
    }
    return scope
  }

  closePreview(workspaceId: string, previewId: string): void {
    for (const [key, scope] of this.scopes)
      if (scope.row.workspaceId === workspaceId && scope.row.id === previewId) {
        scope.close()
        this.scopes.delete(key)
      }
  }

  closeWorkspace(workspaceId: string): void {
    for (const [key, scope] of this.scopes)
      if (scope.row.workspaceId === workspaceId) {
        scope.close()
        this.scopes.delete(key)
      }
  }

  expire(): void {
    for (const [key, scope] of this.scopes)
      if (scope.row.expiresAt <= this.dependencies.now()) {
        scope.close()
        this.scopes.delete(key)
      }
  }
}
