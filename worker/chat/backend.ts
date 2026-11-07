import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
import { workspacePath } from '../../src/shared/workspaces'
import type { RunnerFileCommand } from '../../src/shared/runner-files'
import type { AppEnv } from '../env'
import { errorResponse, HttpError, privateResponse } from '../http'
import { gate, type RequestContext } from '../security/gate'
import { afterNumber, chatRoute } from './http-routes'
import { BrowserTabs } from './browser-tabs'
import { findChatWorkspace, tokenWorkspace } from './queries'
import { ChatOperation } from './operation'
import { chatDependencies } from './dependencies'
import { RunnerChannel } from './runner-channel'
import { ChatStore, type ChatTransaction } from './store'
import {
  runWorkspaceOperation,
  type WorkspaceOperation,
} from './workspace-operation'
import { browserUpgrade, runnerUpgrade } from './sockets'
import type {
  BrowserPeer,
  ChatDependencies,
  ChatStorage,
  RunnerPeer,
  WorkspaceRecord,
} from './types'

export interface BrowserAccess {
  context: RequestContext
  workspace: WorkspaceRecord
  suffix: string
}

/** The Durable Object and the in-memory runner adapter use this boundary. */
export class WorkspaceChat {
  readonly store: ChatStore
  private readonly env: AppEnv
  private readonly dependencies: ChatDependencies
  private readonly runner: RunnerChannel
  private readonly browsers: BrowserTabs
  private workspaceId: string | null = null

  constructor(
    storage: ChatStorage,
    env: AppEnv,
    overrides: Partial<ChatDependencies> = {},
  ) {
    this.env = env
    this.dependencies = chatDependencies(env, () => this.workspaceId, overrides)
    this.store = new ChatStore(storage, this.dependencies.now)
    this.browsers = new BrowserTabs(this.dependencies)
    this.runner = new RunnerChannel(this.store, this.dependencies, (events) =>
      this.publish(events),
    )
  }

  async fetch(request: Request): Promise<Response> {
    try {
      if (new URL(request.url).pathname === MACHINE_PATHS.runner)
        return await runnerUpgrade(this, request)
      const access = await this.authorizeBrowser(request)
      if (access.suffix === '/events')
        return await browserUpgrade(this, request, access)
      return await this.store.run(async () => {
        const write = request.method !== 'GET' && request.method !== 'HEAD'
        if (write && access.workspace.archivedAt !== null) {
          throw new HttpError(
            409,
            'workspace_archived',
            'The archived chat is read-only.',
          )
        }
        const response = await chatRoute(
          request,
          access.suffix,
          access.context,
          this.operation(access.workspace.id),
          this.dependencies,
        )
        if (write) await this.runner.flush()
        return privateResponse(response)
      })
    } catch (error) {
      return privateResponse(errorResponse(error))
    }
  }

  async authorizeBrowser(request: Request): Promise<BrowserAccess> {
    const context = await gate(request, this.env, this.dependencies.now())
    const path = new URL(request.url).pathname
    const match = path.match(/^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)(?:\/|$)/)
    if (!context.org || !match)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    let workspaceId: string
    try {
      workspaceId = decodeURIComponent(match[1])
    } catch {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    const workspace = await findChatWorkspace(
      this.env.DB,
      context.org.id,
      workspaceId,
    )
    if (!workspace)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    this.bind(workspace.id)
    return {
      context,
      workspace,
      suffix: path.slice(workspacePath(context.org.id, workspace.id).length),
    }
  }

  async connectRunner(request: Request, peer: RunnerPeer): Promise<void> {
    const url = new URL(request.url)
    if (
      !this.env.MACHINE_ORIGIN ||
      url.origin !== this.env.MACHINE_ORIGIN ||
      url.pathname !== MACHINE_PATHS.runner
    ) {
      throw new HttpError(
        403,
        'machine_forbidden',
        'The connection is not available.',
      )
    }
    const bearer = request.headers
      .get('Authorization')
      ?.match(/^Bearer (.+)$/i)?.[1]
    const workspace = bearer ? await tokenWorkspace(this.env.DB, bearer) : null
    if (!workspace)
      throw new HttpError(
        401,
        'workspace_token_required',
        'The connection is not available.',
      )
    this.bind(workspace.id)
    await this.runner.open(workspace, peer)
  }

  receiveRunner(peer: RunnerPeer, value: unknown): Promise<void> {
    return this.runner.receive(peer, value)
  }
  disconnectRunner(peer: RunnerPeer): void {
    this.runner.disconnect(peer)
  }

  closeRunner(): void {
    this.runner.close()
  }

  /** Trusted feature owners share the same stored browser event sequence. */
  async appendWorkspaceEvent(
    workspaceId: string,
    event: WorkspaceEvent,
    occurredAt = this.dependencies.now(),
  ): Promise<void> {
    await this.changeWorkspace(workspaceId, (transaction) =>
      transaction.emit(event, occurredAt),
    )
  }

  readWorkspace<T>(
    workspaceId: string,
    work: (view: ChatTransaction) => Promise<T>,
  ): Promise<T> {
    this.bind(workspaceId)
    return this.store.run(() => this.store.read(workspaceId, work))
  }

  /** Keep feature records, events, and publication in one serial task. */
  changeWorkspace<T>(
    workspaceId: string,
    work: (transaction: ChatTransaction) => Promise<T>,
  ): Promise<T> {
    this.bind(workspaceId)
    return this.store.run(() =>
      this.store.change(workspaceId, work, (events) => this.publish(events)),
    )
  }

  authorizedWorkspaceOperation<T>(
    workspaceId: string,
    authorize: () => Promise<void>,
    work: (operation: WorkspaceOperation) => Promise<T>,
  ): Promise<T> {
    this.bind(workspaceId)
    return runWorkspaceOperation(
      this.store,
      workspaceId,
      authorize,
      this.publish,
      work,
    )
  }

  async sendFileCommand(
    workspaceId: string,
    command: RunnerFileCommand,
  ): Promise<boolean> {
    this.bind(workspaceId)
    return this.store.run(async () =>
      this.runner.sendFileCommand(workspaceId, command),
    )
  }

  async openBrowser(request: Request, peer: BrowserPeer): Promise<() => void> {
    const access = await this.authorizeBrowser(request)
    if (access.suffix !== '/events')
      throw new HttpError(404, 'not_found', 'The page is not available.')
    return this.subscribe(access, afterNumber(new URL(request.url)), peer)
  }

  subscribe(
    access: BrowserAccess,
    after: number,
    peer: BrowserPeer,
  ): Promise<() => void> {
    return this.store.run(async () => {
      if (access.workspace.archivedAt === null)
        await this.operation(access.workspace.id).logins.refresh()
      const unsubscribe = await this.browsers
        .add(peer, {
          kind: 'workspace',
          workspaceId: access.workspace.id,
          orgId: access.workspace.orgId,
          userId: access.context.user.id,
          sessionId: access.context.sessionId,
        })
        .catch((error: unknown) => {
          try {
            peer.close()
          } catch {
            // The peer has already disconnected.
          }
          throw error
        })
      try {
        const history = await this.store.read(access.workspace.id, (view) =>
          view.history(after),
        )
        this.browsers.check(peer)
        peer.send({ type: 'history', history })
        return unsubscribe
      } catch (error) {
        unsubscribe()
        throw error
      }
    })
  }

  private operation(workspaceId: string): ChatOperation {
    return new ChatOperation(
      this.store,
      workspaceId,
      this.dependencies,
      this.publish,
    )
  }

  private bind(workspaceId: string): void {
    if (
      !this.dependencies.matchesObject(workspaceId) ||
      (this.workspaceId && this.workspaceId !== workspaceId)
    ) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    this.workspaceId = workspaceId
  }

  private publish = (events: readonly WorkspaceEventEnvelope[]): void => {
    this.browsers.publish(events)
  }
}
