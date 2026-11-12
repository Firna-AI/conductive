import type { AppEnv } from '../env'
import { HttpError } from '../http'
import type { PreviewConnectionIdentity } from '../security/connection-access'
import { AuthorizationBatch, PREVIEW_ACCESS_WINDOW_MS } from './authorization'
import { PreviewConnection } from './connection'
import type { PreviewRecord } from './store'
import { readPreviewAccess } from './viewer-access'
import type { ToolDependencies } from './types'

function previewNotFound(): HttpError {
  return new HttpError(
    404,
    'preview_not_found',
    'The preview is not available.',
  )
}

function sameTarget(one: PreviewRecord, two: PreviewRecord): boolean {
  return (
    one.sandboxId === two.sandboxId &&
    one.providerAccount === two.providerAccount
  )
}

/** The connections of one viewer session of one preview, with their shared access reads. */
class PreviewScope {
  readonly identity: PreviewConnectionIdentity
  private readonly dependencies: ToolDependencies
  private readonly authorization: AuthorizationBatch
  private readonly connections = new Set<PreviewConnection>()
  private readonly targets = new Map<PreviewConnection, PreviewRecord>()
  private row: PreviewRecord | null = null
  private closed = false
  private readonly empty: () => void

  constructor(
    env: AppEnv,
    dependencies: ToolDependencies,
    identity: PreviewConnectionIdentity,
    empty: () => void,
  ) {
    this.identity = identity
    this.dependencies = dependencies
    this.empty = empty
    this.authorization = new AuthorizationBatch(
      async () => {
        const current = this.closed
          ? null
          : await readPreviewAccess(env, identity, dependencies.now())
        if (
          !current ||
          this.closed ||
          current.expiresAt <= dependencies.now()
        ) {
          this.close()
          throw previewNotFound()
        }
        // A connection that reached another sandbox or provider account ends.
        for (const [connection, target] of this.targets)
          if (!sameTarget(target, current)) connection.close()
        this.row = current
      },
      {
        windowMs:
          dependencies.previewAccessWindowMs ?? PREVIEW_ACCESS_WINDOW_MS,
        now: dependencies.now,
      },
    )
  }

  get isClosed(): boolean {
    return this.closed
  }

  get expiresAt(): number {
    return Math.min(
      this.row?.expiresAt ?? Number.POSITIVE_INFINITY,
      this.identity.expiresAt,
    )
  }

  connect(): PreviewConnection {
    const connection: PreviewConnection = new PreviewConnection(
      () => this.authorize(connection),
      () => {
        this.connections.delete(connection)
        this.targets.delete(connection)
        if (this.connections.size === 0) this.empty()
      },
    )
    this.connections.add(connection)
    if (this.closed) connection.close()
    return connection
  }

  /**
   * The access check before the sandbox call. The connection joins the scope first,
   * so a revocation during the read also ends it.
   */
  async access(connection: PreviewConnection): Promise<PreviewRecord> {
    await this.authorize(connection)
    const row = this.row
    if (!row) throw previewNotFound()
    this.targets.set(connection, row)
    return row
  }

  /** Ends the access window, so the next check reads again. */
  refresh(): void {
    this.authorization.expire()
  }

  close(): void {
    this.closed = true
    this.authorization.expire()
    for (const connection of this.connections) connection.close()
  }

  private async authorize(connection: PreviewConnection): Promise<void> {
    await this.authorization.check()
    const row = this.row
    const target = this.targets.get(connection)
    if (
      this.closed ||
      connection.isClosed ||
      !row ||
      this.expiresAt <= this.dependencies.now() ||
      (target && !sameTarget(target, row))
    )
      throw previewNotFound()
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

  get(identity: PreviewConnectionIdentity): PreviewScope {
    const key = JSON.stringify([
      identity.workspaceId,
      identity.previewId,
      identity.userId,
      identity.sessionId,
      identity.expiresAt,
    ])
    let scope = this.scopes.get(key)
    if (!scope || scope.isClosed) {
      const created: PreviewScope = new PreviewScope(
        this.env,
        this.dependencies,
        identity,
        () => {
          if (this.scopes.get(key) === created) this.scopes.delete(key)
        },
      )
      scope = created
      this.scopes.set(key, scope)
    }
    return scope
  }

  closePreview(workspaceId: string, previewId: string): void {
    for (const [key, scope] of this.scopes)
      if (
        scope.identity.workspaceId === workspaceId &&
        scope.identity.previewId === previewId
      ) {
        scope.close()
        this.scopes.delete(key)
      }
  }

  closeWorkspace(workspaceId: string): void {
    for (const [key, scope] of this.scopes)
      if (scope.identity.workspaceId === workspaceId) {
        scope.close()
        this.scopes.delete(key)
      }
  }

  expire(): void {
    for (const [key, scope] of this.scopes)
      if (scope.expiresAt <= this.dependencies.now()) {
        scope.close()
        this.scopes.delete(key)
      }
  }
}
